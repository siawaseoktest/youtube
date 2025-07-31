import express from "express";
import https from "https";
import ytdl from "@distube/ytdl-core";

const router = express.Router();

const CONFIG_URL =
  "https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json";
const CACHE_DURATION_MS = 60 * 1000;

const configCacheMap = new Map(); // url => { data, timestamp }

function validateYouTubeId(req, res, next) {
  const { id } = req.params;
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({
      error: "不正なID形式です（11文字のYouTube Video IDが必要です）",
    });
  }
  next();
}

// 設定ファイル取得 + キャッシュ
function fetchConfigJson(url) {
  const now = Date.now();
  const cacheEntry = configCacheMap.get(url);

  if (cacheEntry && now - cacheEntry.timestamp < CACHE_DURATION_MS) {
    return Promise.resolve(cacheEntry.data);
  }

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        if (res.statusCode !== 200) {
          return reject(new Error(`ステータスコード: ${res.statusCode}`));
        }

        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            configCacheMap.set(url, { data: json, timestamp: now });
            resolve(json);
          } catch (err) {
            reject(new Error("JSONのパースに失敗しました"));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

// Fallback 用リクエスト関数
function fallbackRequest(videoId, userCookie, userIp) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "siawaseok.duckdns.org",
      port: 443,
      path: `/api/streamurl/${videoId}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie || "",
        "X-Forwarded-For": userIp || "",
      },
    };

    console.log("🔁 fallbackRequest: siawaseokサーバーにリクエスト送信");

    const req = https.request(options, (res2) => {
      let data = "";

      res2.on("data", (chunk) => (data += chunk));
      res2.on("end", () => {

        if (res2.statusCode !== 200) {
          return reject(new Error(`Fallback failed with status ${res2.statusCode}`));
        }

        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error("fallbackResponse JSON parse error:", e.message);
          reject(new Error("JSONのパースに失敗しました (fallback)"));
        }
      });
    });

    req.on("error", (e) => {
      console.error("fallbackRequest ネットワークエラー:", e.message);
      reject(e);
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Fallback request timed out"));
    });

    req.end();
  });
}


// type1：embed URL を返す
router.get("/:id", validateYouTubeId, async (req, res) => {
  const { id } = req.params;

  try {
    const config = await fetchConfigJson(CONFIG_URL);
    const params = config.params || "";
    const embedUrl = `https://www.youtubeeducation.com/embed/${id}${params}`;
    res.json({ url: embedUrl });
  } catch (err) {
    console.error("設定ファイルの取得に失敗:", err.stack || err.message);
    res.status(500).json({ error: "動画設定の取得に失敗しました。" });
  }
});

// type2：動画ストリーム取得
router.get("/:id/type2", validateYouTubeId, async (req, res) => {
  const { id } = req.params;
  const userCookie = req.headers.cookie || "";
  const userIp = req.headers["x-forwarded-for"] || req.ip;

  // WebM 映像 itag 一覧（video-only）
  const webmItags = {
    "4320p": 272,
    "2160p": 266,
    "1440p": 264,
    "1080p": 248,
    "720p": 247,
    "480p": 244,
  };

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
    const formats = info.formats;

    // 映像＋音声の360p（muxed）
    const muxed360p = formats
      .filter(f => f.hasVideo && f.hasAudio && f.height === 360)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    // 音声のみ（最高音質1つ）
    const audioOnly = formats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

    // WebM映像（itag指定）
    const resolutionMap = {};
    for (const [label, itag] of Object.entries(webmItags)) {
      const video = formats.find(f => f.itag === itag && f.container === "webm");
      if (video) {
        resolutionMap[label] = {
          video: { url: video.url },
          audio: { url: audioOnly?.url || null },
        };
      }
    }

    // レスポンス生成
    return res.json({
      muxed360p: { url: muxed360p?.url || null },
      ...resolutionMap,
    });
  } catch (err) {
    console.error("ストリームURLの取得に失敗:", err.stack || err.message);

    try {
      const fallbackResult = await fallbackRequest(id, userCookie, userIp);
      return res.json(fallbackResult);
    } catch (fallbackErr) {
      console.error("フェールオーバー失敗:", fallbackErr.stack || fallbackErr.message);
      return res.status(500).json({
        error: "ストリームURLの取得に失敗しました（fallback含む）。",
      });
    }
  }
});

// キャッシュ削除
router.post("/admin/invalidate-cache", express.json(), (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "無効なURLです" });
  }

  const existed = configCacheMap.delete(url);
  if (existed) {
    res.json({ message: "キャッシュを削除しました", url });
  } else {
    res.json({ message: "キャッシュは存在しませんでした", url });
  }
});

// キャッシュ状況確認
router.get("/admin/cache-status", (req, res) => {
  const now = Date.now();
  const status = [];

  for (const [url, { timestamp }] of configCacheMap.entries()) {
    status.push({
      url,
      ageSeconds: Math.floor((now - timestamp) / 1000),
      expiresInSeconds: Math.max(
        0,
        Math.ceil((CACHE_DURATION_MS - (now - timestamp)) / 1000)
      ),
    });
  }

  res.json({ cache: status });
});

export default router;

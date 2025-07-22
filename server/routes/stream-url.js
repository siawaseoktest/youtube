import express from "express";
import https from "https";
import ytdl from "@distube/ytdl-core";

const router = express.Router();

const CONFIG_URL = "https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json";
const CACHE_DURATION_MS = 60 * 1000; // 1分

// キャッシュ格納マップ
const configCacheMap = new Map(); // url => { data, timestamp }

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

// 📦 type1：embed URL を返す
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({ error: "不正なID形式です（11文字のYouTube Video IDが必要です）" });
  }

  try {
    const config = await fetchConfigJson(CONFIG_URL);
    const params = config.params || "";
    const embedUrl = `https://www.youtubeeducation.com/embed/${id}${params}`;
    res.json({ url: embedUrl });
  } catch (err) {
    console.error("設定ファイルの取得に失敗:", err);
    res.status(500).json({ error: "動画設定の取得に失敗しました。" });
  }
});

// type2：muxed360p, videoOnly, audioOnly のURLを返す
router.get("/:id/type2", async (req, res) => {
  const { id } = req.params;
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({ error: "不正なID形式です（11文字のYouTube Video IDが必要です）" });
  }

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
    const formats = info.formats;

    const muxed360p = formats
      .filter(f => f.hasVideo && f.hasAudio && f.height === 360)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    const videoOnly = formats
      .filter(f => f.hasVideo && !f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .find(f => f.height >= 1080) || formats.find(f => f.height >= 720);

    const audioOnly = formats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

    res.json({
      muxed360p: { url: muxed360p?.url || null },
      video: { url: videoOnly?.url || null },
      audio: { url: audioOnly?.url || null },
    });
  } catch (err) {
    console.error("🚫 ストリームURLの取得に失敗:", err.message);
    res.status(500).json({ error: "ストリームURLの取得に失敗しました。" });
  }
});


// キャッシュ削除
router.post("/admin/invalidate-cache", (req, res) => {
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
      expiresInSeconds: Math.max(0, Math.ceil((CACHE_DURATION_MS - (now - timestamp)) / 1000)),
    });
  }

  res.json({ cache: status });
});

export default router;

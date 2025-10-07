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
import express from "express";
import https from "https";
import ytdl from "@distube/ytdl-core";

const router = express.Router();

const CONFIG_URL =
  "https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json";
const CACHE_DURATION_MS = 60 * 1000;

const configCacheMap = new Map();

function validateYouTubeId(req, res, next) {
  const { id } = req.params;
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({
      error: "不正なID形式です（11文字のYouTube Video IDが必要です）",
    });
  }
  next();
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

// type2：外部APIへリクエストしてJSONをそのまま返す
router.get("/:id/type2", validateYouTubeId, async (req, res) => {
  const { id } = req.params;
  const mainUrl = `https://siawaseok.duckdns.org/api/stream/${id}/type2`;
  const fallbackUrl = `https://siatube.wjg.jp/api/stream/${id}/type2`;

  try {
    const response = await fetch(mainUrl);
    if (!response.ok) throw new Error("main server error");
    const json = await response.json();
    return res.json(json);
  } catch (err) {
    console.error("type2: main server failed, fallbackへ", err.message);
    try {
      const response = await fetch(fallbackUrl);
      if (!response.ok) throw new Error("fallback server error");
      const json = await response.json();
      return res.json(json);
    } catch (err2) {
      console.error("type2: fallbackも失敗", err2.message);
      return res.status(500).json({ error: "type2: 両方のサーバーで取得失敗" });
    }
  }
});

// type3：外部APIへリクエストしてJSONをそのまま返す
router.get("/:id/type3", validateYouTubeId, async (req, res) => {
  const { id } = req.params;
  const mainUrl = `https://siawaseok.duckdns.org/api/stream/download/${id}`;
  const fallbackUrl = `https://siatube.wjg.jp/api/stream/download/${id}`;

  try {
    const response = await fetch(mainUrl);
    if (!response.ok) throw new Error("main server error");
    const json = await response.json();
    return res.json(json);
  } catch (err) {
    console.error("type3: main server failed, fallbackへ", err.message);
    try {
      const response = await fetch(fallbackUrl);
      if (!response.ok) throw new Error("fallback server error");
      const json = await response.json();
      return res.json(json);
    } catch (err2) {
      console.error("type3: fallbackも失敗", err2.message);
      return res.status(500).json({ error: "type3: 両方のサーバーで取得失敗" });
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

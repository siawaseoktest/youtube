import express from "express";
import https from "https";
import ytdl from "@distube/ytdl-core";

const router = express.Router();
const CONFIG_URL = "https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json";

// 設定JSONの取得
function fetchConfigJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        if (res.statusCode !== 200) return reject(new Error(`ステータスコード: ${res.statusCode}`));
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(new Error("JSONのパースに失敗しました"));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

// 📦 type1 ルート
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

// 📦 type2 ルート（muxed360p, video, audio を返す）
router.get("/:id/type2", async (req, res) => {
  const { id } = req.params;
  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({ error: "不正なID形式です（11文字のYouTube Video IDが必要です）" });
  }

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
    const formats = info.formats;

    // 🎬 映像＋音声（muxed 360p）
    const muxed360p = formats
      .filter(f => f.hasVideo && f.hasAudio && f.height === 360)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    // 🎥 高画質映像（映像のみ）
    const videoOnly = formats
      .filter(f => f.hasVideo && !f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .find(f => f.height >= 1080) || formats.find(f => f.height >= 720);

    // 🎧 音声のみ
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

export default router;

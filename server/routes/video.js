import express from "express";
import { Innertube } from "youtubei.js";

const router = express.Router();
let youtube;

(async () => {
  youtube = await Innertube.create({
    lang: "ja",
    location: "JP",
    retrieve_player: true,
  });
})();

// /:id で外部APIにリクエストし、JSONをそのまま返す
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;
  if (!videoId) {
    return res.status(400).json({ error: "無効な動画IDです。" });
  }
  const mainUrl = `https://siawaseok.duckdns.org/api/video2/${videoId}`;
  const fallbackUrl = `https://siatube.wjg.jp/api/video2/${videoId}`;
  try {
    const response = await fetch(mainUrl);
    if (!response.ok) throw new Error("main server error");
    const json = await response.json();
    return res.json(json);
  } catch (err) {
    console.error("video: main server failed, fallbackへ", err.message);
    try {
      const response = await fetch(fallbackUrl);
      if (!response.ok) throw new Error("fallback server error");
      const json = await response.json();
      return res.json(json);
    } catch (err2) {
      console.error("video: fallbackも失敗", err2.message);
      return res.status(500).json({ error: "video: 両方のサーバーで取得失敗" });
    }
  }
});

export default router;

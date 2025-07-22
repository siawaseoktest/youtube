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

// 環境によっては(殆ど)エラーで動かないので一切形成しません
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;

  if (!videoId) {
    return res.status(400).json({ error: "無効な動画IDです。" });
  }

  try {
    if (!youtube) {
      return res.status(503).json({ error: "YouTubeクライアントが未初期化です。" });
    }

    // 動画情報全体を取得
    const videoInfo = await youtube.getInfo(videoId);

    // 取得した動画情報をJSONとして直接返す
    res.json(videoInfo);
  } catch (err) {
    console.error(`[ERROR][${videoId}]`, err);
    res.status(500).json({ error: "動画情報の取得に失敗しました。" });
  }
});

export default router;

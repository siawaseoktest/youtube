import express from "express";
import { Innertube } from "youtubei.js";

const router = express.Router();

// YouTubeiクライアントの作成は1回だけでOK
const youtube = await Innertube.create();

router.get("/", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    // YouTube検索
    const results = await youtube.search(query, { type: "video" });

    // 動画のみ抽出して整形
    const videos = results.items
      .filter((item) => item.type === "video")
      .map((video) => ({
        id: video.id,
        title: video.title,
        channel: video.author?.title || "",
        channelId: video.author?.channel_id || "",
        publishedAt: video.published?.toISOString() || "",
        thumbnails: video.thumbnails,
        duration: video.duration?.toString() || "",
        viewCount: video.views || "0",
        url: `https://www.youtube.com/watch?v=${video.id}`,
      }));

    res.json({ videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

export default router;

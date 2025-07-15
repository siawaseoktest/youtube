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

router.get("/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    const commentSection = await youtube.getComments(videoId);
    const commentThreads = commentSection.contents || [];

    const totalCommentCountText = commentSection.header?.count?.text
      || commentSection.header?.comments_count?.text
      || null;

    const comments = commentThreads.map((thread) => {
      const c = thread.comment;
      return {
        author: c.author?.name || "匿名",
        authorIcon: c.author?.thumbnails?.[0]?.url || null,
        text: c.content?.toString() || "",
        date: c.published_time || "", 
        likes: c.like_count || 0,
      };
    });

    res.json({
      totalCommentCount: totalCommentCountText,
      comments,
    });
  } catch (err) {
    console.error("コメント取得失敗:", err);
    res.status(500).json({ error: "コメントの取得に失敗しました。" });
  }
});

export default router;

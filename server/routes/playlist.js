import express from "express";
import ytpl from "ytpl"; 

const router = express.Router();

router.get("/:id", async (req, res) => {
  const playlistId = req.params.id;

  if (!playlistId) {
    return res.status(400).json({ error: "playlistId is required" });
  }

  try {
    const data = await ytpl(playlistId, { limit: 100 });

    const items = (data.items || []).map((v) => ({
      videoId: v.id,
      title: v.title,
      duration: v.duration || null,
      author: v.author?.name || null,
      thumbnail: v.thumbnail || null,
    }));

    res.json({
      playlistId: playlistId,
      title: data.title,
      author: data.author?.name || "不明",
      totalItems: data.total_items || items.length,
      views: data.views?.toLocaleString?.() || "不明",
      url: data.url,
      thumbnail: data.thumbnail?.url || null,
      items,
    });
  } catch (err) {
    console.error("プレイリスト整形取得エラー:", err);
    res.status(500).json({ error: "プレイリストの取得に失敗しました" });
  }
});

export default router;

import express from "express";
const router = express.Router();

// 仮の動画詳細API（YouTube Data APIやInvidious APIをここで呼び出し）
// ここは環境に合わせて実装してください
router.get("/:id", async (req, res) => {
  const videoId = req.params.id;
  try {
    // YouTube APIなどを叩く処理を入れる
    // 今回は簡易的に動画IDだけ返す例
    res.json({ id: videoId, title: `動画タイトル(${videoId})`, description: "説明文" });
  } catch (err) {
    res.status(500).json({ error: "動画情報取得失敗" });
  }
});

export default router;

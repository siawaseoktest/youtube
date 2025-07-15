import express from "express";
import https from "https";

const router = express.Router();
const CONFIG_URL = "https://raw.githubusercontent.com/siawaseok3/wakame/master/video_config.json";

function fetchConfigJson(url) {
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
            resolve(json);
          } catch (err) {
            reject(new Error("JSONのパースに失敗しました"));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^[\w-]{11}$/.test(id)) {
    return res.status(400).json({
      error: "不正なID形式です（11文字のYouTube Video IDが必要です）",
    });
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

export default router;
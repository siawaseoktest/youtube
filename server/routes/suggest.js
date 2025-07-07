import express from "express";
import https from "https";

const router = express.Router();

router.get("/", (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) {
    return res.status(400).json({ error: "keywordクエリが必要です" });
  }

  const options = {
    hostname: "www.google.com",
    path: `/complete/search?client=youtube&hl=ja&ds=yt&q=${encodeURIComponent(
      keyword
    )}`,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  };

  const request = https.request(options, (response) => {
    let data = "";

    response.on("data", (chunk) => {
      data += chunk;
    });

    response.on("end", () => {
      try {
        const jsonString = data.substring(
          data.indexOf("["),
          data.lastIndexOf("]") + 1
        );
        const suggestionsArray = JSON.parse(jsonString);
        const suggestions = suggestionsArray[1].map((i) => i[0]);
        res.json(suggestions);
      } catch (error) {
        console.error("JSON parse error:", error);
        res.status(500).json({ error: "JSONの解析に失敗しました" });
      }
    });
  });

  request.on("error", (error) => {
    console.error("Request error:", error);
    res.status(500).json({ error: "外部リクエストでエラーが発生しました" });
  });

  request.end();
});

export default router;

import express from "express";
import fetch from "node-fetch";
import ytimg from "./yt-img.js";
import suggestRouter from "./routes/suggest.js"; 
import searchRouter from "./routes/search.js";
import suggestRouter from "./routes/suggest.js"; 

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(express.json());

// ルーティング
app.use("/", ytimg);
app.use("/api/search", searchRouter);
app.use("/api/suggest", suggestRouter);

// GitHubのtrend.jsonを返すAPI
app.get("/api/trend", async (req, res) => {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/siawaseok3/wakame/refs/heads/master/trend.json"
    );
    if (!response.ok) {
      throw new Error("GitHubからの取得に失敗");
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || "トレンドデータ取得失敗" });
  }
});

// サーバ起動
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

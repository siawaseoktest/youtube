import express from "express";
import fetch from "node-fetch";
import ytimg from "./yt-img.js";
import suggestRouter from "./routes/suggest.js"; 
import searchRouter from "./routes/search.js";
import videoRouter from "./routes/video.js"; 
import commentRoute from "./routes/comment.js";
import channelRoute from "./routes/channel.js";
import playlistRouter from "./routes/playlist.js";
import streamUrlRouter from "./routes/stream-url.js"; 
import fallbackRoute from "./routes/fallback.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(express.json());

// ルーティング
app.use("/", ytimg);
app.use("/api/search", searchRouter);
app.use("/api/suggest", suggestRouter);
app.use("/api/video", videoRouter);
app.use("/api/comments", commentRoute);
app.use("/api/channel", channelRoute);
app.use("/api/playlist", playlistRouter);
app.use("/api/stream", streamUrlRouter);
app.use("/api", fallbackRoute);

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

import express from "express";
import https from "https";

const router = express.Router();

router.get("/fallback", (req, res) => {
  const url =
    "https://raw.githubusercontent.com/siawaseok3/studys/refs/heads/2%E6%AC%A1%E9%96%A2%E6%95%B0/index.html";

  https
    .get(url, (githubRes) => {
      let data = "";
      githubRes.on("data", (chunk) => (data += chunk));
      githubRes.on("end", () => {
        res.send(data); 
      });
    })
    .on("error", (err) => {
      console.error("GitHub fetch error:", err);
      res.status(500).send("GitHubからHTMLを取得できませんでした。");
    });
});

export default router;

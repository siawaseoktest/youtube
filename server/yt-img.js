import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const resolutions = ["maxresdefault", "sddefault", "hqdefault"];
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

async function tryFetchImage(res, id, index = 0) {
  if (index >= resolutions.length) {
    res.status(404).send("No thumbnail found");
    return;
  }

  const imageUrl = `https://i.ytimg.com/vi/${id}/${resolutions[index]}.jpg`;

  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": userAgent },
    });

    if (response.ok) {
      res.setHeader(
        "Content-Type",
        response.headers.get("content-type") || "image/jpeg"
      );
      res.setHeader("Cache-Control", "public, max-age=86400"); 

      // response.bodyはNode.jsのReadableStreamなのでpipeできるはず
      if (response.body && typeof response.body.pipe === "function") {
        response.body.pipe(res);
      } else {
        // 万一pipeできない場合はバッファに読み込んで送信
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    } else {
      await tryFetchImage(res, id, index + 1);
    }
  } catch (err) {
    await tryFetchImage(res, id, index + 1);
  }
}

router.get("/", (req, res) => {
  const id = req.query.id;
  if (!id || !/^[\w-]{11}$/.test(id)) {
    res.status(400).send("Invalid YouTube ID");
    return;
  }
  tryFetchImage(res, id);
});

export default router;

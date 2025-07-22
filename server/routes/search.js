import express from "express";
import Youtube from "youtubei.js";

const router = express.Router();

let youtube;
const youtubeReady = Youtube.create()
  .then(instance => {
    youtube = instance;
    console.log("✅ YouTube API initialized");
  })
  .catch(err => {
    console.error("❌ Failed to initialize YouTube API:", err);
  });

function generateThumbnails(videoId) {
  if (!videoId) return {};
  return {
    default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` },
    medium:  { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` },
    high:    { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
    standard:{ url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` },
    maxres:  { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` },
  };
}

function normalizeViewCount(viewText) {
  if (typeof viewText !== "string") return "0";

  if (viewText.includes("万")) {
    const num = parseFloat(viewText.replace(/[^\d.]/g, ""));
    return Math.round(num * 10000).toString();
  }
  if (viewText.includes("億")) {
    const num = parseFloat(viewText.replace(/[^\d.]/g, ""));
    return Math.round(num * 100000000).toString();
  }

  return viewText.replace(/[^\d]/g, "") || "0";
}

function formatPublishedAtJapanese(relativeText) {
  if (!relativeText) return "不明";

  const regex = /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i;
  const match = relativeText.match(regex);

  if (!match) {
    if (typeof relativeText === "string" && /前$/.test(relativeText)) {
      return relativeText;
    }
    return "不明";
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "second":
      return value < 60 ? "たった今" : `${value}秒前`;
    case "minute":
      return value === 1 ? "1分前" : `${value}分前`;
    case "hour":
      return value === 1 ? "1時間前" : `${value}時間前`;
    case "day":
      return value === 1 ? "1日前" : `${value}日前`;
    case "week":
      return value === 1 ? "1週間前" : `${value}週間前`;
    case "month":
      return value === 1 ? "1ヶ月前" : `${value}ヶ月前`;
    case "year":
      return value === 1 ? "1年前" : `${value}年前`;
    default:
      return "不明";
  }
}

router.get("/", async (req, res) => {
  await youtubeReady;

  if (!youtube) {
    return res.status(503).json({ error: "YouTube API failed to initialize." });
  }

  const keyword = req.query.q;
  const pageToken = req.query.pageToken;

  if (!keyword && !pageToken) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    let result;
    if (pageToken) {
      result = await youtube.getSearchContinuation(pageToken);
    } else {
      result = await youtube.search(keyword, {
        type: "video,channel",
        limit: 20,
        params: {
          gl: "JP",
          hl: "ja",
        },
      });
    }

    const videos = (result.results || [])
      .filter(item => ["Video", "Channel"].includes(item.type))
      .map(item => {
        if (item.type === "Video") {
          const videoId = item.video_id || item.id;
          return {
            type: "video",
            id: videoId,
            title: item.title?.text || item.title?.runs?.[0]?.text || "無題",
            duration: item.duration?.text || "不明",
            publishedAt: formatPublishedAtJapanese(item.published?.text || ""),
            channel: item.author?.name || "不明なチャンネル",
            channelId: item.author?.id || "",
            channelIcon: item.author?.thumbnails?.[0]?.url || "",
            thumbnails: generateThumbnails(videoId),
            viewCount: normalizeViewCount(item.view_count?.text || ""),
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        } else if (item.type = "Channel") {
          return {
            type: "channel",
            id: item.channel_id || item.id,
            name: item.author?.name || "不明なチャンネル",
            icon: item.author?.thumbnails?.[0]?.url || "",
            subscriberCount: item.video_count?.text || "不明",
            url: `https://www.youtube.com/channel/${item.channel_id || item.id}`,
          };
        }
      });

    res.json({
      results: videos,
      nextPageToken: result.continuation || null,
    });
  } catch (e) {
    console.error("❌ Search error:", e);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

export default router;

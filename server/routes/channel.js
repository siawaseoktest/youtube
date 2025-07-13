import express from "express";
import { Innertube } from "youtubei.js";

const router = express.Router();

let youtube;

// 初期化（最初に一度だけ）
(async () => {
  youtube = await Innertube.create({
    lang: "ja",
    location: "JP",
    retrieve_player: false,
  });
})();

// GET /api/channel/:id
router.get("/:id", async (req, res) => {
  const channelId = req.params.id;

  try {
    const channel = await youtube.getChannel(channelId);

    const metadata = channel.metadata ?? {};
    const header = channel.header ?? {};
    const currentTab = channel.current_tab ?? {};
    const contents = currentTab?.content?.contents ?? [];

    const topVideo = contents?.[0]?.contents?.[0] ?? {};

    // プレイリストセクションのみ抽出
    const playlistSections = contents.slice(1).filter(c => c.type === "ItemSection");

    const playlists = playlistSections.map(section => {
      const content = section?.contents?.[0];
      const items = content?.content?.items ?? [];

      return {
        title: content?.title?.text ?? "",
        playlistId: content?.title?.endpoint?.payload?.browseId ?? "",
        items: items.map(item => ({
          videoId: item.video_id,
          title: item.title?.text ?? "",
          duration: item.duration?.text ?? "",
          published: item.published?.text ?? "",
          author: item.author?.name ?? metadata.title ?? "",
          viewCount: item.short_view_count?.text || item.views?.text || "不明",
          thumbnail: item.thumbnail?.[0]?.url ?? "", 
        }))
      };
    });

    // 動画一覧（チャンネル全動画プレイリスト用）
    const videos = (channel.videos?.items ?? []).map(v => ({
      videoId: v.id,
      title: v.title,
      duration: v.duration_text || "",
      published: v.published_time_text || "",
      author: v.author?.name || "",
      viewCount: v.view_count?.text || "不明",
      thumbnail: v.thumbnail?.[0]?.url ?? "",
    }));

    // ここでチャンネルIDからアップロード動画用プレイリストIDを生成
    // チャンネルIDの先頭が "UC" の場合のみ対応
    let uploadsPlaylistId = "";
    if (channelId.startsWith("UC")) {
      uploadsPlaylistId = "UU" + channelId.slice(2);
    }

    // 整形レスポンス
    const response = {
      channelId,
      title: metadata.title ?? "",
      avatar: metadata.avatar?.[0]?.url ?? "",
      banner: header.content?.banner?.image?.[0]?.url ?? "",
      videoCount: header.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text?.text ?? "",
      description: metadata.description ?? "",
      topVideo: {
        videoId: topVideo.id ?? "",
        viewCount: topVideo.view_count?.text ?? "",
        published: topVideo.published_time?.text ?? "",
        description: (topVideo.description?.text ?? "").replace(/\n/g, "<br>"),
      },
      playlists,
      videos,
      uploadsPlaylistId, // ここに追加
    };

    res.json(response);
  } catch (err) {
    console.error("チャンネル情報取得エラー:", err);
    res.status(500).json({ error: "サーバー内部エラー" });
  }
});

export default router;

import express from "express";
import { Innertube } from "youtubei.js";

const router = express.Router();

let youtube;

(async () => {
  try {
    youtube = await Innertube.create({
      lang: "ja",
      location: "JP",
      retrieve_player: false,
    });
    console.log("YouTube API 初期化完了");
  } catch (initError) {
    console.error("YouTube API 初期化失敗:", initError);
  }
})();

// プレイリストIDを正規化（長すぎる場合は先頭2文字を削除）
function normalizePlaylistId(id = "") {
  return id.length > 34 ? id.slice(2) : id;
}

// GET /api/channel/:id
router.get("/:id", async (req, res) => {
  const channelId = req.params.id;

  if (!youtube) {
    return res.status(503).json({ error: "YouTube APIがまだ初期化されていません" });
  }

  try {
    const channel = await youtube.getChannel(channelId);

    const metadata = channel.metadata ?? {};
    const header = channel.header ?? {};
    const currentTab = channel.current_tab ?? {};
    const contents = currentTab?.content?.contents ?? [];
    const topVideo = contents?.[0]?.contents?.[0] ?? {};

    // プレイリストセクションを抽出（除外）
    const playlistSections = contents.slice(1).filter(c => {
      if (c.type !== "ItemSection") return false;
      const title = c?.contents?.[0]?.title?.text ?? "";
      return title !== "メンバー" && title !== "投稿" && title !== "ショート" && title !== "複数の再生リスト";
    });

    // プレイリスト情報をマップ
    const playlists = playlistSections.map(section => {
      const content = section?.contents?.[0];
      const items = content?.content?.items ?? [];
      const rawPlaylistId = content?.title?.endpoint?.payload?.browseId ?? "";
      const playlistId = normalizePlaylistId(rawPlaylistId);

      return {
        title: content?.title?.text ?? "",
        playlistId,
        items: items.map(item => ({
          videoId: item.video_id ?? item.author?.id ?? "",
          title: item.title?.text ?? item.author?.name ?? "",
          duration: item.duration?.text ?? "",
          published: item.published?.text ?? "",
          author: item.author?.name ?? metadata.title ?? "",
          viewCount: item.short_view_count?.text ?? item.views?.text ?? item.subscribers?.text ?? "",
          thumbnail: item.thumbnail?.[0]?.url ?? "",
          icon: item.author?.thumbnails?.[0]?.url ?? "",
        }))
      };
    });

    // "UCxxxx" → "UUxxxx" に変換（アップロード用プレイリストID）
    let uploadsPlaylistId = "";
    if (channelId.startsWith("UC")) {
      uploadsPlaylistId = "UU" + channelId.slice(2);
    }

    const response = {
      channelId,
      title: metadata.title ?? "",
      avatar: metadata.avatar?.[0]?.url ?? "",
      banner: header.content?.banner?.image?.[0]?.url ?? "",
      videoCount: header.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text?.text ?? "",
      description: metadata.description ?? "",
      topVideo: {
        title: topVideo.title?.text ?? "",
        videoId: topVideo.id ?? topVideo.video_id ?? "",
        viewCount: topVideo.view_count?.text ?? "",
        published: topVideo.published_time?.text ?? "",
        description: (topVideo.description?.text ?? "").replace(/\n/g, "<br>"),
      },
      playlists,
      uploadsPlaylistId,
    };

    res.json(response);
  } catch (err) {
    console.error(`チャンネル[${channelId}]情報取得エラー:`, err?.message || err);
    res.status(500).json({ error: "チャンネル情報の取得中にエラーが発生しました" });
  }
});

export default router;
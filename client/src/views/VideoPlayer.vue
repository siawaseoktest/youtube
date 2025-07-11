<template>
  <div class="page-container">
    <div class="main-content" v-if="video">
      <div class="video-wrapper">
        <iframe
          :src="`https://www.youtube.com/embed/${videoId}`"
          frameborder="0"
          allowfullscreen
          class="main-player"
        ></iframe>
      </div>

      <h1 class="video-title">{{ title }}</h1>
      <div class="video-meta">
        <span>{{ viewCount }}</span>
        <span class="dot">・</span>
        <span>{{ relativeDate }}</span>
      </div>
    </div>

    <aside v-if="relatedVideos.length" class="related-section">
      <h3 class="related-title">関連動画</h3>
      <ul class="related-list">
        <li
          v-for="r in relatedVideos"
          :key="r.videoId"
          class="related-item"
          @mouseenter="hoverId = r.videoId"
          @mouseleave="hoverId = null"
        >
          <div class="thumb-wrapper">
            <img
              v-if="hoverId !== r.videoId || !r.previewUrl"
              :src="getPrimaryThumbnail(r.videoId)"
              :alt="r.title"
              class="thumb-img"
              @error="onImageError($event, r.videoId)"
            />
            <img
              v-else
              :src="r.previewUrl"
              :alt="r.title + ' プレビュー'"
              class="thumb-img"
              @error="onImageError($event, r.videoId)"
            />
            <span
              v-if="r.badge"
              class="duration-badge"
              :class="{ 'badge-live': r.badge.toLowerCase().includes('ライブ') }"
            >
              {{ r.badge }}
            </span>
          </div>

          <div class="video-info">
            <span class="video-title-related" :title="r.title">{{ r.title }}</span>
            <span class="video-metadata">
              {{ r.metadataRow1 }}<br>
              {{ r.metadataRow2Part1 }}<span class="dot">・</span>{{ r.metadataRow2Part2 }}
            </span>
          </div>
        </li>
      </ul>
    </aside>

    <p v-else-if="error" class="error-msg">⚠️ {{ error }}</p>
    <p v-else class="loading-msg">読み込み中...</p>
  </div>
</template>

<script>
export default {
  props: {
    videoId: { type: String, required: true },
  },
  data() {
    return {
      video: null,
      error: null,
      hoverId: null,
    };
  },
  computed: {
    viewCount() {
      return this.video?.primary_info?.view_count?.short_view_count?.text || "情報なし";
    },
    title() {
      return this.video?.primary_info?.title?.text || "情報なし";
    },
    relativeDate() {
      return this.video?.primary_info?.relative_date?.text || "情報なし";
    },
    relatedVideos() {
      const feed = this.video?.watch_next_feed || [];
      return feed.map((item) => {
        const overlays = item.content_image?.overlays || [];
        const badges = overlays[0]?.badges || [];
        const badgeText = badges[0]?.text || "";
        const previewUrl = overlays[1]?.thumbnail?.[0]?.url || "";
        const metadataRows = item.metadata?.metadata?.metadata_rows || [];

        return {
          badge: badgeText, // 動画時間やライブなどのバッジ文字列
          previewUrl,
          title: item.metadata?.title?.text || "",
          metadataRow1: metadataRows[0]?.metadata_parts?.[0]?.text?.text || "",
          metadataRow2Part1: metadataRows[1]?.metadata_parts?.[0]?.text?.text || "",
          metadataRow2Part2: metadataRows[1]?.metadata_parts?.[1]?.text?.text || "",
          videoId: item.renderer_context?.command_context?.on_tap?.payload?.videoId || "",
        };
      });
    },
  },
  methods: {
    getPrimaryThumbnail(id) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    },
    onImageError(event, id) {
      if (!event.target.dataset.error) {
        event.target.src = `/api/yt-img?id=${id}`;
        event.target.dataset.error = true;
      }
    },
  },
  async created() {
    try {
      const res = await fetch(`/api/video/${this.videoId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.video = await res.json();
    } catch (err) {
      console.error("動画取得失敗:", err);
      this.error = "動画の情報を取得できませんでした。";
    }
  },
};
</script>

<style scoped>
.page-container {
  display: flex;
  gap: 24px;
  padding: 16px;
  flex-wrap: wrap;
}

.main-content {
  flex: 1 1 0;
  min-width: 0;
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: #000;
  margin-bottom: 16px;
}

.main-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 8px 0;
  line-height: 1.4;
  color: #030303;
}

.video-meta {
  font-size: 0.9rem;
  color: #606060;
  margin-bottom: 16px;
}

.related-section {
  width: 360px;
  flex-shrink: 0;
}

.related-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 12px;
}

.related-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.related-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  cursor: pointer;
}

.thumb-wrapper {
  position: relative; /* 重要：バッジの絶対配置基準 */
  width: 168px;
  height: 94.5px; /* 16:9 */
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

/* バッジ（動画時間・ライブ） */
.duration-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 6px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 2px;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  z-index: 10;
}

/* 「ライブ」バッジは赤背景 */
.badge-live {
  background: #e62117;
}

.video-info {
  flex: 1;
}

.video-title-related {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.3;
  color: #030303;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.video-metadata {
  font-size: 0.85rem;
  color: #606060;
}

.dot {
  margin: 0 4px;
}

.error-msg {
  color: red;
  font-size: 1rem;
  margin-top: 1rem;
}

.loading-msg {
  font-size: 1rem;
  color: #444;
}

@media (max-width: 768px) {
  .page-container {
    flex-direction: column;
  }

  .related-section {
    width: 100%;
    margin-top: 32px;
  }

  .related-item {
    gap: 10px;
  }

  .thumb-wrapper {
    width: 140px;
    height: 78.75px; /* 16:9 */
  }

  .video-title {
    font-size: 1.25rem;
  }

  .video-title-related {
    font-size: 0.95rem;
  }

  .video-metadata {
    font-size: 0.8rem;
  }

  .duration-badge {
    font-size: 0.65rem;
    padding: 1px 4px;
  }
}
</style>

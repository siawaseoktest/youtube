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

      <h1 class="video-title" ref="videoTitle">{{ title }}</h1>
        <div class="video-info channel-info">
        <router-link
          :to="`/channel/${authorId}`"
          class="channel-icon-link"
        >
          <img
            :src="authorThumbnailUrl"
            alt="チャンネルアイコン"
            class="channel-icon"
            @error="onImageError($event, authorId)"
          />
        </router-link>
        <div class="channel-text">
          <router-link
            :to="`/channel/${authorId}`"
            class="channel-name"
          >
            {{ authorName }}
          </router-link>
          <p class="subscriber-count">{{ subscriberCount }}</p>
        </div>
        </div>
      <div style="padding: 10px 10px 0 10px; border-radius: 8px; background-color: rgba(0, 0, 0, 0.05);">
        <div class="video-meta">
        <span>{{ viewCount }}</span>・<span>高評価数{{ likeCount }}</span>
        <span class="dot">　</span>
        <span>{{ relativeDate }}</span>
        </div>
        <div class="video-description">
        <div v-if="!showFullDescription" class="description-preview">
          <p v-if="descriptionRun0">{{ descriptionRun0 }}</p>
          <p v-if="descriptionRun1">{{ descriptionRun1 }}</p>
        </div>
        <div v-else class="description-full" v-html="formattedDescription"></div>

        <span
          class="description-toggle"
          role="button"
          tabindex="0"
          @click="toggleDescription"
          @keydown.enter="toggleDescription"
          @keydown.space.prevent="toggleDescription"
        >
          {{ showFullDescription ? "一部を表示" : "...もっと見る" }}
        </span>
        </div>
      </div>
      <Comment :videoId="videoId" />
    </div>

    <aside v-if="relatedVideos.length" class="related-section">
        <PlaylistComponent
        v-if="playlistId"
        displayType="watch"
        :playlistId="playlistId"
        :playVideoId="videoId"
        />
      <h3 class="related-title">関連動画</h3>
      <ul class="related-list">
        <li
          v-for="r in relatedVideos"
          :key="r.videoId"
          class="related-item"
          @mouseenter="hoverId = r.videoId"
          @mouseleave="hoverId = null"
        >
          <router-link :to="`/watch?v=${r.videoId}`" class="page-link">
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
          </router-link> 
          <router-link :to="`/watch?v=${r.videoId}`" class="page-link">
          <div class="video-info">
            <span class="video-title-related" :title="r.title">{{ r.title }}</span>
            <div class="video-metadata">
              <div class="one-line">{{ r.metadataRow1 }}</div>
              {{ r.metadataRow2Part1 }}<span class="dot">・</span>{{ r.metadataRow2Part2 }}
            </div>
          </div>
          </router-link>
        </li>
      </ul>
    </aside>

    <p v-else-if="error" class="error-msg">⚠️ {{ error }}</p>
    <p v-else class="loading-msg">読み込み中...</p>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import PlaylistComponent from "@/components/Playlist.vue";
import Comment from "@/components/Comment.vue";

const route = useRoute();
const videoId = computed(() => route.query.v);
const playlistId = computed(() => route.query.list);
</script>

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
      showFullDescription: false,
    };
  },
  computed: {
    viewCount() {
      return this.video?.primary_info?.view_count?.short_view_count?.text || this.video?.primary_info?.view_count?.view_count?.text || "情報なし";
    },
    title() {
      return this.video?.primary_info?.title?.text || "情報なし";
    },
    relativeDate() {
      return this.video?.primary_info?.relative_date?.text || "";
    },
    likeCount() {
      return this.video?.primary_info?.menu?.top_level_buttons?.[0]?.short_like_count || "情報なし";
    },
    subscriberCount() {
      return this.video?.secondary_info?.owner?.subscriber_count?.text || "情報なし";
    },
    authorId() {
      return this.video?.secondary_info?.owner?.author?.id || "情報なし";
    },
    authorName() {
      return this.video?.secondary_info?.owner?.author?.name || "情報なし";
    },
    authorThumbnailUrl() {
      return this.video?.secondary_info?.owner?.author?.thumbnails?.[0]?.url || "情報なし";
    },
    descriptionText() {
      return this.video?.secondary_info?.description?.text || "情報なし";
    },
    formattedDescription() {
      const rawText = this.video?.secondary_info?.description?.text || "この動画には説明が追加されていません。";
      return rawText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    },
    shouldShowToggle() {
      const text = this.descriptionRun3?.trim();
      return text !== "";
    },
    descriptionRun0() {
      return this.video?.secondary_info?.description?.runs?.[0]?.text || "情報なし";
    },
    descriptionRun1() {
      return this.video?.secondary_info?.description?.runs?.[1]?.text || "";
    },
    descriptionRun2() {
      return this.video?.secondary_info?.description?.runs?.[2]?.text || "";
    },
    descriptionRun3() {
      return this.video?.secondary_info?.description?.runs?.[3]?.text || "";
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
          badge: badgeText,
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
    async fetchVideoData(id) {
      try {
        this.video = null;
        this.error = null;

        const res = await fetch(`/api/video/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        this.video = await res.json();
      } catch (err) {
        console.error("動画取得失敗:", err);
        this.error = "動画の情報を取得できませんでした。";
      }
    },
    getPrimaryThumbnail(id) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    },
    onImageError(event, id) {
      if (!event.target.dataset.error) {
        event.target.src = `/api/yt-img?id=${id}`;
        event.target.dataset.error = true;
      }
    },
    toggleDescription() {
      this.showFullDescription = !this.showFullDescription;
      this.$nextTick(() => {
        const el = this.$refs.videoTitle;
        if (el?.scrollIntoView) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    },
  },
  watch: {
    videoId: {
      immediate: true,
      handler(newId) {
        this.fetchVideoData(newId);
      },
    },
  },
};
</script>

<style scoped>
.one-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 180px; 
}

p {
    margin-block-start: 1em;
    margin-block-end: 0.8em;
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    unicode-bidi: isolate;
}
.channel-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.page-link{
  text-decoration: none;
}
.channel-icon-link {
  flex-shrink: 0;
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
}

.channel-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 50%;
}

.channel-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.channel-name {
  font-weight: 500;
  font-size: 1.1rem;
  color: #030303;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel-name:hover,
.channel-name:focus {
  text-decoration: underline;
}

.subscriber-count {
  font-size: 0.85rem;
  color: #606060;
  margin: 2px 0 0 0;
  white-space: nowrap;
}
.video-info p {
  font-size: 0.8rem;  
  color: #606060; 
  margin: 0 0 4px 0;
  line-height: 1.4;
  font-weight: 400;
}
.video-description {
  font-size: 0.9rem;
  color: #030303;
  line-height: 1.5;
  margin-top: 12px;
  margin-bottom: 15px;
  white-space: pre-wrap;   /* 改行をそのまま反映 */
  word-break: break-word;
}
.description-preview {
  max-height: 120px;       
  overflow: hidden;  
  margin: 0 0 0.4em 0;      
}
.description-full {
  margin: 0;
}
.description-toggle {
  display: inline-block;
  color: #065fd4;           /* YouTube青リンク色 */
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  margin-top: 4px;
}

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
  color: #000000;
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
  position: relative; 
  width: 168px;
  height: 94.5px; 
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
  pointer-events: none;
  user-select: none;
  z-index: 10;
}
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
}

.video-metadata {
  font-size: 0.8rem;
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

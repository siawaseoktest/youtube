<template>
  <section v-if="error" class="error-message">
    プレイリストの取得に失敗しました。
  </section>

  <section v-else-if="playlist" class="playlist-section" :class="`type-${displayType}`">
    <template v-if="displayType !== 'channel'">
      <h2 class="playlist-title">{{ playlist.title }}</h2>
      <p class="playlist-meta">
        動画本数: {{ playlist.totalItems }}
        <span class="views" v-if="displayType !== 'watch'">｜再生数: {{ playlist.views }}回</span>
      </p>

    </template>

    <div class="playlist-items-scroll" :class="`scroll-${displayType}`">
      <div
        v-for="(item, idx) in playlist.items"
        :key="item.videoId || idx"
        class="playlist-item"
        :class="{ active: item.videoId === playVideoId }"
        :data-video-id="item.videoId"
      >
        <router-link :to="`/watch?v=${item.videoId}`" class="video-link">
          <div v-if="displayType === 'watch'" class="watch-layout">
            <div class="thumbnail-wrapper small-thumb">
              <img
                :src="item.thumbnail || getPrimaryThumbnail(item.videoId)"
                alt="動画サムネイル"
                class="thumbnail"
                @error="onImageError($event, item.videoId)"
              />
              <span class="duration" v-if="item.duration">{{ item.duration }}</span>
            </div>
            <div class="text-content">
              <p class="title" :title="item.title">{{ item.title }}</p>
              <p class="author">{{ item.author }}</p>
            </div>
          </div>

          <div v-else>
            <div class="thumbnail-wrapper">
              <img
                :src="item.thumbnail || getPrimaryThumbnail(item.videoId)"
                alt="動画サムネイル"
                class="thumbnail"
                @error="onImageError($event, item.videoId)"
              />
              <span class="duration" v-if="item.duration">{{ item.duration }}</span>
            </div>
            <p class="title" :title="item.title">{{ item.title }}</p>
            <p class="author">{{ item.author }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </section>

  <section v-else>
    <p>プレイリストを読み込み中...</p>
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { useRoute } from "vue-router";

// propsの定義（任意）
const props = defineProps({
  playlistId: String,
  playVideoId: String,
  displayType: {
    type: String,
    default: "default",
  },
});

const route = useRoute();

const playlist = ref(null);
const loading = ref(false);
const error = ref(false);

// playlistIdはprops優先、なければURLクエリのlistを使う
const playlistId = computed(() => props.playlistId || route.query.list || "");
// playVideoIdもprops優先、なければURLクエリのplayを使う
const playVideoId = computed(() => props.playVideoId || route.query.play || "");
// displayTypeもprops優先、なければURLクエリのtypeを使う
const displayType = computed(() => props.displayType || route.query.type || "default");

onMounted(async () => {
  if (!playlistId.value) {
    console.error("playlistId が指定されていません");
    error.value = true;
    return;
  }

  loading.value = true;
  error.value = false;

  try {
    // プレイリストAPIからデータ取得
    const res = await fetch(`/api/playlist/${playlistId.value}`);
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);
    playlist.value = await res.json();

    console.log("取得プレイリスト:", playlist.value);
    console.log("表示タイプ:", displayType.value);

    await nextTick();

    // playVideoIdがあれば該当動画までスクロール
    if (playVideoId.value) {
      const target = document.querySelector(`.playlist-item[data-video-id="${playVideoId.value}"]`);
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }

    // displayTypeに応じた追加処理があればここで実装可能
    // 例：if (displayType.value === 'watch') { ... }
  } catch (err) {
    console.error("プレイリスト取得失敗:", err);
    error.value = true;
  } finally {
    loading.value = false;
  }
});

// サムネイルURL取得関数
function getPrimaryThumbnail(id) {
  return `https://i.ytimg.com/vi/${id}/sddefault.jpg`;
}

// 画像読み込み失敗時に代替URLへ切り替え
function onImageError(event, id) {
  if (!event.target.dataset.error) {
    event.target.src = `/api/yt-img?id=${id}`;
    event.target.dataset.error = "true";
  }
}
</script>

<style scoped>
.playlist-item.active {
  background-color: #eee;
}

.playlist-section {
  max-width: 100%;
  margin: 0 auto;
  padding: 0.9rem;
}

/* type=watchのときは背景色なし、細い線で囲む */
.type-watch {
  background-color: transparent;
  border: 1px solid #ccc; /* 細めの線。色はお好みで調整してください */
  border-radius: 8px; /* お好みで丸みを追加 */
  padding: 0.9rem;
  max-width: 360px;
}

.playlist-title {
  font-size: 1.4rem;
  margin-bottom: 0.2rem;
}

.playlist-meta {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
}

.scroll-default,
.scroll-channel {
  display: grid;
  grid-template-columns: repeat(auto-fill, 210px);
  justify-content: center;
  gap: 12px;
  padding-bottom: 1rem;
}

.scroll-watch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 420px;
  padding-right: 6px;
}

.playlist-item {
  width: 210px;
  flex-shrink: 0;
}

.type-watch .playlist-item {
  width: 100%;
}

.video-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.thumbnail-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0.5rem;
}

.thumbnail-wrapper.small-thumb {
  width: 160px;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.75rem;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 2px 5px;
  border-radius: 4px;
}

/* ここがJS除去した2行省略用CSS */
.title {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  margin-top: 1;
  line-height: 1.3;
  max-height: calc(1.3em * 2); /* 2行相当 */
  overflow: hidden;

  /* 2行で省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  white-space: normal;
}

.author {
  font-size: 0.8rem;
  color: #666;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.watch-layout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.text-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

@media (max-width: 600px) {
  .playlist-item {
    width: 100%;
  }
}

/* エラー表示スタイル */
.error-message {
  color: red;
  padding: 1rem;
  text-align: center;
}
</style>

<template>
  <section class="channel-view" v-if="channel">
    <!-- バナー -->
    <div
      class="banner"
      :style="{ backgroundImage: `url(${channel.banner || defaultBanner})` }"
    ></div>

    <!-- チャンネル概要 -->
    <div class="channel-header">
      <img
        :src="channel.avatar || defaultAvatar"
        alt="チャンネルアイコン"
        class="avatar"
      />
      <div class="info">
        <h1 style="font-size: 2em; margin-block-end: 0.67em;">{{ channel.title }}</h1>
        <p class="video-count">{{ channel.videoCount }}</p>
        <p class="description">{{ channel.description }}</p>
      </div>
    </div>

    <!-- タブ -->
    <div class="tabs">
      <button :class="{ active: tab === 'home' }" @click="tab = 'home'">ホーム</button>
      <button :class="{ active: tab === 'videos' }" @click="tab = 'videos'">動画</button>
    </div>

    <!-- ホームタブ -->
    <div v-if="tab === 'home'" class="tab-content">
      <!-- トップ動画 -->
      <section class="top-video" v-if="channel.topVideo?.videoId">
        <router-link
          :to="`/watch?v=${channel.topVideo.videoId}`"
          class="top-video-link"
        >
          <div class="thumbnail-wrapper">
            <img
              :src="getPrimaryThumbnail(channel.topVideo.videoId)"
              alt="トップ動画サムネイル"
              class="thumbnail"
              @error="onImageError($event, channel.topVideo.videoId)"
            />
            <span class="duration" v-if="channel.topVideo.duration">
              {{ channel.topVideo.duration }}
            </span>       
          </div>
          <div class="top-video-info">
            <p><strong>再生回数:</strong> {{ channel.topVideo.viewCount }}</p>
            <p><strong>投稿日:</strong> {{ channel.topVideo.published }}</p>
            <p class="description-text" v-html="channel.topVideo.description"></p>
          </div>
        </router-link>
      </section>

      <section class="playlists">
        <div
          v-for="(playlist, index) in channel.playlists"
          :key="playlist.playlistId || index"
          class="playlist-wrapper"
        >
          <h2 class="playlist-title">{{ playlist.title }}</h2>
          <div class="playlist-items-scroll">
            <div
              v-for="(item, idx) in playlist.items"
              :key="item.videoId || idx"
              class="playlist-item"
            >
              <router-link :to="`/watch?v=${item.videoId}`" class="video-link">
                <div class="thumbnail-wrapper small-thumb">
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
                <p class="meta">{{ item.viewCount }}・{{ item.published }}</p>
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </div>
    <!-- 動画タブ -->
    <div v-else-if="tab === 'videos'" class="tab-content">
      <h3>動画一覧</h3>
        <VideoList :playlist-id="channel.uploadsPlaylistId" displayType="channel" />
    </div>
  </section>
  <p v-else class="loading">読み込み中...</p>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import VideoList from "@/components/Playlist.vue";

const route = useRoute();
const channelId = route.params.id;

const channel = ref(null);
const tab = ref("home");

const defaultAvatar = "/default-avatar.png";
const defaultBanner = "/default-banner.png";

function getPrimaryThumbnail(id) {
  return `https://i.ytimg.com/vi/${id}/sddefault.jpg`;
}

function onImageError(event, id) {
  if (!event.target.dataset.error) {
    event.target.src = `/api/yt-img?id=${id}`;
    event.target.dataset.error = true;
  }
}

onMounted(async () => {
  try {
    const res = await fetch(`/api/channel/${channelId}`);
    if (!res.ok) throw new Error("チャンネル情報取得失敗");
    const data = await res.json();
    channel.value = data;
  } catch (err) {
    console.error("ChannelView エラー:", err);
  }
});
</script>

<style scoped>
.playlist-items-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.playlist-item {
  width: 210px;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 0 6px rgb(0 0 0 / 0.05);
  transition: box-shadow 0.2s;
  padding: 8px;
  overflow: hidden;
}

.playlist-item:hover {
  box-shadow: 0 0 12px rgb(0 0 0 / 0.1);
}

.playlist-item .video-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  height: 100%;
}

.playlist-item .thumbnail-wrapper {
  position: relative;
  width: 100%;
  height: 118px;
  border-radius: 8px;
  overflow: hidden;
}

.playlist-item .thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #ccc;
  border-radius: 8px;
}

.playlist-item .duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  font-size: 0.8rem;
  color: #fff;
  background-color: rgba(50, 50, 50, 0.7);
  border-radius: 3px;
  user-select: none;
}

.playlist-item .title {
  font-weight: 600;
  margin-top: 8px;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  display: block;
}

.playlist-item .author {
  font-size: 0.9rem;
  color: #666;
  margin-top: 2px;
}

.playlist-item .meta {
  font-size: 0.85rem;
  color: #555;
  margin-top: 2px;
}

.channel-view {
  padding: 16px;
  max-width: 90%;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

.banner {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  margin-bottom: 1rem;
  background-color: #ddd;
}

.channel-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  background-color: #eee;
}

.info {
  margin-left: 16px;
  flex-grow: 1;
}

.info h2 {
  margin: 0 0 8px;
  font-size: 1.8rem;
}

.video-count {
  margin: 0 0 8px;
  color: #666;
}

.description {
  margin: 0;
  color: #444;
  white-space: pre-wrap;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
}

.tabs button {
  flex-grow: 1;
  padding: 10px 0;
  border: none;
  border-radius: 6px;
  background: #eee;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}

.tabs button.active {
  background: #222;
  color: white;
}

.tab-content {
  margin-top: 1rem;
}

.top-video {
  display: flex;
  gap: 16px;
  margin-bottom: 2rem;
}

.top-video-link {
  display: flex;
  gap: 16px;
  text-decoration: none;
  color: inherit;
  width: 100%;
}

.thumbnail-wrapper {
  position: relative;
  width: 320px;
  height: 180px;
  flex-shrink: 0;
}

.small-thumb {
  width: 160px;
  height: 90px;
}

.top-video .thumbnail,
.video-item .thumbnail {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
  background-color: #ccc;
}

.top-video .duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 2px 6px;
  font-size: 0.8rem;
  color: #fff;
  background-color: rgba(50, 50, 50, 0.7);
  border-radius: 3px;
  user-select: none;
}

.top-video-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.top-video-info p {
  margin: 4px 0;
}

.description-text {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  max-height: 150px;
  color: #444;
  margin-top: 8px;
}

.playlists {
  margin-top: 1rem;
}

.playlist-wrapper {
  margin-bottom: 2rem;
}

.playlist-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.video-list.compact {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.video-item {
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 6px rgb(0 0 0 / 0.1);
  transition: box-shadow 0.2s;
  padding: 8px;
}

.video-item:hover {
  box-shadow: 0 0 12px rgb(0 0 0 / 0.15);
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}
</style>
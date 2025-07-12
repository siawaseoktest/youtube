<template>
  <div class="playlist">
    <h4 class="playlist-title">{{ playlist.title }}</h4>
    <ul class="playlist-items">
      <li
        v-for="(item, index) in playlist.items"
        :key="item.videoId || index"
        class="playlist-item"
      >
        <router-link :to="`/watch?v=${item.videoId}`" class="video-link">
          <img
            v-if="item.thumbnail"
            :src="item.thumbnail"
            alt="サムネイル"
            class="thumbnail"
          />
          <div class="info">
            <p class="title">{{ item.title }}</p>
            <p class="meta">
              {{ item.author }}・{{ item.viewCount }}・{{ item.published }}
            </p>
            <p class="duration">{{ item.duration }}</p>
          </div>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  playlist: {
    type: Object,
    required: true,
    default: () => ({ title: "", items: [] }),
  },
});
</script>

<style scoped>
.playlist {
  margin-bottom: 2rem;
}

.playlist-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.playlist-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.playlist-item {
  margin-bottom: 12px;
}

.video-link {
  display: flex;
  text-decoration: none;
  color: inherit;
}

.thumbnail {
  width: 160px;
  height: 90px;
  object-fit: cover;
  margin-right: 12px;
  border-radius: 8px;
}

.info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title {
  font-weight: 600;
  margin-bottom: 4px;
}

.meta {
  font-size: 0.9rem;
  color: #555;
}

.duration {
  font-size: 0.8rem;
  color: #999;
}
</style>

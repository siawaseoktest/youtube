<template>
  <div v-if="error" class="error-box">
    ⚠️ {{ error }}
    <button @click="reloadStream" class="reload-button">再取得</button>
  </div>
  <div v-else-if="streamUrl" class="video-container">
    <iframe
      :src="streamUrl"
      frameborder="0"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      title="動画ストリーム"
    ></iframe>
  </div>
  <div v-else-if="loading" style="height: 50px">読み込み中...</div>
</template>

<script setup>
import { ref, watch } from "vue";
import { apiurl } from "@/api";

const props = defineProps({
  videoId: { type: String, required: true }
});
function reloadStream() {
  fetchStreamUrl(props.videoId);
}

const streamUrl = ref("");
const error = ref("");
const loading = ref(false);

async function fetchStreamUrl(id) {
  streamUrl.value = "";
  error.value = "";
  loading.value = true;
  try {
    const res = await fetch(`/api/stream/${id}`);
    if (!res.ok) throw new Error(`ストリーム取得失敗: ${res.status}`);
    const data = await res.json();
    if (!data.url) throw new Error("ストリームURLが空です");
    streamUrl.value = data.url;
  } catch (err) {
    error.value = "ストリームURLの取得に失敗しました。";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.videoId,
  (newId) => {
    if (newId) fetchStreamUrl(newId);
  },
  { immediate: true }
);
</script>

<style scoped>
.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}
.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.error-box {
  color: red;
  margin: 10px;
}
.reload-button {
  margin-top: 6px;
  padding: 6px 12px;
  font-size: 9px;
  background: #444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 50%;
}
.reload-button:hover {
  background: #666;
}
</style>

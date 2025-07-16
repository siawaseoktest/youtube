<template>
  <div class="video-wrapper">
    <div v-if="error">{{ error }}</div>
    <div v-else-if="streamUrl" class="video-container">
      <iframe
        :src="streamUrl"
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>
    <div v-else>読み込み中...</div>
  </div>
</template>

<style scoped>
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
  overflow: hidden;
}
.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  videoId: { type: String, required: true },
});

const streamUrl = ref("");
const error = ref("");

async function fetchStreamUrl(id) {
  try {
    const res = await fetch(`/api/stream/${id}`);
    if (!res.ok) throw new Error(`ストリーム取得エラー: HTTP ${res.status}`);
    const data = await res.json();
    if (!data.url) throw new Error("ストリームURLが空です");
    streamUrl.value = data.url;
  } catch (err) {
    console.error("埋め込み取得エラー:", err);
    error.value = "ストリームURLの取得に失敗しました。";
  }
}

watch(() => props.videoId, (newId) => {
  if (newId) fetchStreamUrl(newId);
}, { immediate: true });
</script>

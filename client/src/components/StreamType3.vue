<template>
  <!-- メインボタン -->
  <button @click="openPopup" class="download-main-btn">
    この動画をダウンロード
  </button>

  <!-- ポップアップ -->
  <div v-if="popupVisible" class="popup-overlay">
    <div class="popup">
      <button class="close-btn" @click="closePopup">×</button>

      <div v-if="loading">読み込み中…</div>

      <div v-else-if="error" class="error">
        {{ error }}
        <button class="retry-btn" @click="fetchStream">再取得</button>
      </div>

      <div v-else>
        <h3>ダウンロードオプション</h3>

        <div class="main-flex-row">
          <div class="main-options">
            <!-- 標準ダウンロード -->
            <div class="option" v-if="streamData.muxed360p?.url">
              <strong>標準（360p）:</strong>
              <a :href="streamData.muxed360p.url" target="_blank" rel="noopener" download>ダウンロード</a>
            </div>

            <!-- 音声のみ -->
            <div class="option" v-if="audioOnlyUrl">
              <strong>音声のみ:</strong>
              <a :href="audioOnlyUrl" target="_blank" rel="noopener" download>ダウンロード</a>
            </div>

            <!-- 映像のみ（可変解像度） -->
            <div class="option" v-if="videoResolutions.length">
              <strong>映像のみ:</strong>
              <div v-for="res in videoResolutions" :key="res.label">
                {{ res.label }}:
                <a :href="res.video.url" target="_blank" rel="noopener" download>ダウンロード</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { apiurl } from "@/api";

const props = defineProps({
  videoId: { type: String, required: true }
});

const popupVisible = ref(false);
const streamData = ref(null);
const error = ref("");
const loading = ref(false);

const videoResolutions = ref([]);
const audioOnlyUrl = ref("");
const audio720pUrl = ref("");

function openPopup() {
  popupVisible.value = true;
  if (!streamData.value) {
    fetchStream();
  }
}

function closePopup() {
  popupVisible.value = false;
  streamData.value = null;
  videoResolutions.value = [];
  audioOnlyUrl.value = "";
  audio720pUrl.value = "";
  error.value = "";
}

async function fetchStream() {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(`${apiurl()}?stream2=${props.videoId}`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    streamData.value = data;

    // 音声のみのURL（高解像度優先）
    const keys = Object.keys(data).filter(k => k !== "muxed360p");
    const sortedKeys = keys.sort((a, b) => parseInt(b) - parseInt(a));

    let highestAudioUrl = "";
    for (let res of sortedKeys) {
      if (data[res]?.audio?.url) {
        if (!audioOnlyUrl.value) audioOnlyUrl.value = data[res].audio.url;
        if (!highestAudioUrl) highestAudioUrl = data[res].audio.url;
      }
    }
    audio720pUrl.value = highestAudioUrl;

    // 映像のみ
    const videoRes = [];
    sortedKeys.forEach(res => {
      if (data[res]?.video?.url) {
        videoRes.push({ label: res , video: data[res].video });
      }
    });
    videoResolutions.value = videoRes;

  } catch (e) {
    console.error(e);
    error.value = "ストリームの取得に失敗しました";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.main-flex-row {
  display: flex;
  flex-direction: row;
  gap: 32px;
  align-items: flex-start;
}
.main-options {
  flex: 1;
}
.download-main-btn {
  padding: 8px 16px;
  background: #85848485;
  color: #191919;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 420px;
  position: relative;
  max-height: 80vh;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  right: 10px;
  top: 10px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
}

.option {
  margin-top: 12px;
}

.error {
  color: red;
  margin-top: 10px;
}

.retry-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: #444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.retry-btn:hover {
  background: #666;
}
</style>

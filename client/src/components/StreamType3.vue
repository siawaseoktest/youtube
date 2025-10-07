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
        <h3>ダウンロードオプション ID={{props.videoId}}</h3>

        <div class="main-flex-row">
          <div class="main-options">
            <!-- 標準ダウンロード（360p複数対応） -->
            <div class="option" v-if="muxed360pList.length">
              <strong>標準（360p）:</strong>
              <div v-for="item in muxed360pList" :key="item.url">
                <a :href="item.url" target="_blank" rel="noopener" download>ダウンロード</a>
              </div>
            </div>

            <!-- 音声のみ（複数対応） -->
            <div class="option" v-if="audioOnlyList.length">
              <strong>音声のみ:</strong>
              <div v-for="item in audioOnlyList" :key="item.url">
                {{ item.ext }}:
                <a :href="item.url" target="_blank" rel="noopener" download>ダウンロード</a>
              </div>
            </div>

            <!-- 映像のみ（複数対応） -->
            <div class="option" v-if="videoOnlyList.length">
              <strong>映像のみ:</strong>
              <div v-for="item in videoOnlyList" :key="item.url">
                {{ item.resolution }} ({{ item.ext }}):
                <a :href="item.url" target="_blank" rel="noopener" download>ダウンロード</a>
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

const muxed360pList = ref([]);
const audioOnlyList = ref([]);
const videoOnlyList = ref([]);

function openPopup() {
  popupVisible.value = true;
  if (!streamData.value) {
    fetchStream();
  }
}

function closePopup() {
  popupVisible.value = false;
  streamData.value = null;
  muxed360pList.value = [];
  audioOnlyList.value = [];
  videoOnlyList.value = [];
  error.value = "";
}

async function fetchStream() {
  loading.value = true;
  error.value = "";
  try {
    const res = await fetch(`/api/stream/${props.videoId}/type3`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    streamData.value = data;

    // 標準（360p）複数対応
    muxed360pList.value = [];
    if (Array.isArray(data["audio&video"])) {
      muxed360pList.value = data["audio&video"].filter(v => v.resolution === "360p").map(v => ({ url: v.url }));
      // 360pがなければ全て
      if (muxed360pList.value.length === 0) {
        muxed360pList.value = data["audio&video"].map(v => ({ url: v.url }));
      }
    }

    // 音声のみ複数対応
    audioOnlyList.value = [];
    if (Array.isArray(data["audio only"])) {
      audioOnlyList.value = data["audio only"].map(v => ({ ext: v.ext, url: v.url }));
    }

    // 映像のみ複数対応
    videoOnlyList.value = [];
    if (Array.isArray(data["video only"])) {
      videoOnlyList.value = data["video only"].map(v => ({ resolution: v.resolution, ext: v.ext, url: v.url }));
    }
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

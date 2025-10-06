<template>
  <div v-if="error" class="error-box">
    ⚠️ {{ error }}
    <button @click="reloadStream" class="reload-button">再取得</button>
  </div>
  <div v-else-if="selectedQuality && availableQualities.length > 0" class="video-container">
    <!-- Appleデバイス: m3u8のみ -->
    <template v-if="isAppleDevice()">
      <video
        ref="videoRef"
        controls
        autoplay
        :src="sources[selectedQuality]?.url"
        type="application/x-mpegURL"
        :key="sources[selectedQuality]?.url"
      ></video>
      <div class="settings-box" v-show="settingsVisible">
        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option v-for="q in availableQualities" :key="q" :value="q">
              {{ q.replace('p', '') }}p
            </option>
          </select>
        </label>
        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>
    <!-- その他: videourlのみ -->
    <template v-else>
      <video ref="videoRef" preload="auto" controls>
        <source :src="sources[selectedQuality]?.video?.url" :type="sources[selectedQuality]?.video?.mimeType" />
      </video>
      <audio ref="audioRef" preload="auto" style="display:none;">
        <source :src="sources[selectedQuality]?.audio?.url" :type="sources[selectedQuality]?.audio?.mimeType" />
      </audio>
      <div class="settings-box" v-show="settingsVisible">
        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option v-for="q in availableQualities" :key="q" :value="q">
              {{ q.replace('p', '') }}p
            </option>
          </select>
        </label>
        <label>
          再生速度:
          <select v-model.number="selectedPlaybackRate" class="selector">
            <option v-for="rate in playbackRates" :key="rate" :value="rate">
              {{ rate }}x
            </option>
          </select>
        </label>
        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>
  </div>
  <div v-else-if="loading" style="height: 50px">読み込み中...</div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { apiurl } from "@/api";
import { setupSyncPlayback } from "@/components/syncPlayback";

const props = defineProps({
  videoId: { type: String, required: true }
});
function reloadStream() {
  fetchStreamUrl(props.videoId);
}

const error = ref("");
const sources = ref({});
const selectedQuality = ref("muxed360p");
const availableQualities = ref([]);
const selectedPlaybackRate = ref(1.0);
const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];
const diffText = ref("0");
const videoRef = ref(null);
const audioRef = ref(null);
const settingsVisible = ref(true);
const loading = ref(false);
const isQualitySwitching = ref(false);

function isAppleDevice() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|Macintosh/.test(ua);
}

async function fetchStreamUrl(id) {
  error.value = "";
  sources.value = {};
  selectedQuality.value = "";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];
  loading.value = true;
  try {
    const res = await fetch(`${apiurl()}?&stream2=${id}`);
    if (!res.ok) throw new Error(`type2 ストリーム取得失敗: ${res.status}`);
    const data = await res.json();
    let srcs = {};
    let qualities = [];
    let m3u8srcs = {};
    let m3u8Qualities = [];
    if (Array.isArray(data.videourl)) {
      data.videourl.forEach((item) => {
        const key = Object.keys(item)[0];
        if (/^\d{3,4}p$/.test(key)) {
          qualities.push(key);
          srcs[key] = {
            video: {
              url: item[key].video.url,
              mimeType: "video/mp4"
            },
            audio: {
              url: item[key].audio.url,
              mimeType: "audio/webm"
            }
          };
        }
      });
    } else if (typeof data.videourl === 'object' && data.videourl !== null) {
      Object.keys(data.videourl).forEach((key) => {
        if (/^\d{3,4}p$/.test(key)) {
          qualities.push(key);
          srcs[key] = {
            video: {
              url: data.videourl[key].video.url,
              mimeType: "video/mp4"
            },
            audio: {
              url: data.videourl[key].audio.url,
              mimeType: "audio/webm"
            }
          };
        }
      });
    }
    if (Array.isArray(data.m3u8)) {
      data.m3u8.forEach((item) => {
        const key = Object.keys(item)[0];
        if (/^\d{3,4}p$/.test(key)) {
          let m3u8url = item[key].url;
          if (typeof m3u8url === 'object' && m3u8url.url) m3u8url = m3u8url.url;
          m3u8Qualities.push(key);
          m3u8srcs[key] = {
            url: m3u8url,
            mimeType: "application/x-mpegURL"
          };
        }
      });
    } else if (typeof data.m3u8 === 'object' && data.m3u8 !== null) {
      Object.keys(data.m3u8).forEach((key) => {
        if (/^\d{3,4}p$/.test(key)) {
          let m3u8url = data.m3u8[key].url;
          if (typeof m3u8url === 'object' && m3u8url.url) m3u8url = m3u8url.url;
          m3u8Qualities.push(key);
          m3u8srcs[key] = {
            url: m3u8url,
            mimeType: "application/x-mpegURL"
          };
        }
      });
    }
    // 画質の降順ソート
    qualities = qualities.sort((a, b) => parseInt(b) - parseInt(a));
    m3u8Qualities = m3u8Qualities.sort((a, b) => parseInt(b) - parseInt(a));
    // デフォルト画質選び
    const defaultQuality = ["1080p", "720p", "480p"].find(q => qualities.includes(q)) || qualities[0];
    const defaultM3u8Quality = ["1080p", "720p", "480p"].find(q => m3u8Qualities.includes(q)) || m3u8Qualities[0];
    // Appleデバイスの場合はm3u8で再生
    if (isAppleDevice() && m3u8Qualities.length > 0) {
      sources.value = m3u8srcs;
      availableQualities.value = m3u8Qualities;
      selectedQuality.value = defaultM3u8Quality;
    } else if (qualities.length > 0) {
      sources.value = srcs;
      availableQualities.value = qualities;
      selectedQuality.value = defaultQuality;
    } else {
      error.value = "利用可能なストリームがありません。";
      loading.value = false;
      return;
    }
    await nextTick();
    // 同期再生
    if (!isAppleDevice() && selectedQuality.value && srcs[selectedQuality.value]) {
      setupSyncPlayback(
        videoRef.value,
        audioRef.value,
        sources,
        selectedQuality,
        diffText,
        selectedPlaybackRate
      );
    }
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

watch(selectedPlaybackRate, () => {
  if (videoRef.value) videoRef.value.playbackRate = selectedPlaybackRate.value;
});

function clearType2SrcRepeated() {
  let count = 0;
  const interval = setInterval(() => {
    if (videoRef.value) {
      videoRef.value.removeAttribute("src");
      videoRef.value.load();
    }
    if (audioRef.value) {
      audioRef.value.removeAttribute("src");
      audioRef.value.load();
    }
    count++;
    if (count >= 2) {
      clearInterval(interval);
    }
  }, 200);
}

watch(selectedQuality, () => {
  if (isAppleDevice()) {
    isQualitySwitching.value = true;
    setTimeout(() => {
      isQualitySwitching.value = false;
    }, 1000);
    return;
  }
  // その他: videourl同期再生
  if (sources.value[selectedQuality.value]) {
    isQualitySwitching.value = true;
    setTimeout(() => {
      isQualitySwitching.value = false;
    }, 2000);
    let prevTime = 0;
    if (videoRef.value) {
      prevTime = videoRef.value.currentTime;
      videoRef.value.pause();
    }
    if (audioRef.value) {
      audioRef.value.pause();
    }
    nextTick(() => {
      clearType2SrcRepeated();
      setupSyncPlayback(
        videoRef.value,
        audioRef.value,
        sources,
        selectedQuality,
        diffText,
        selectedPlaybackRate
      );
      setTimeout(() => {
        if (videoRef.value) videoRef.value.currentTime = prevTime;
        if (audioRef.value) audioRef.value.currentTime = prevTime;
        setTimeout(() => {
          if (videoRef.value) videoRef.value.currentTime = prevTime;
          if (audioRef.value) audioRef.value.currentTime = prevTime;
        }, 600);
      }, 600);
    });
  }
});
</script>

<style scoped>
.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}
.video-container video,
.video-container audio {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.settings-box {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  transition: opacity 0.3s ease;
}
.selector {
  background: #222;
  color: white;
  border: 1px solid #555;
  padding: 4px 8px;
  border-radius: 6px;
  margin-left: 6px;
}
.reload-button {
  margin-top: 6px;
  padding: 6px 15px;
  font-size: 9px;
  background: #444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  width: 60%;
}
.reload-button:hover {
  background: #666;
}
audio {
  display: none;
}
.block-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.315);
  pointer-events: all;
}
</style>

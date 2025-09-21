<template>
  <div v-if="error" class="error-box">
    ⚠️ {{ error }}
    <button @click="reloadStream" class="reload-button">再取得</button>
  </div>
  <div v-else-if="selectedQuality && (sources.muxed360p || availableQualities.length > 0)" class="video-container">
    <template v-if="selectedQuality === 'muxed360p'">
      <video ref="videoRef" controls autoplay>
        <source :src="sources.muxed360p?.url" :type="sources.muxed360p?.mimeType" />
      </video>
    </template>
    <template v-else>
      <video ref="videoRef" preload="auto" controls>
        <source :src="sources[selectedQuality]?.video?.url" :type="sources[selectedQuality]?.video?.mimeType" />
      </video>
      <audio ref="audioRef" preload="auto" style="display:none;">
        <source :src="sources[selectedQuality]?.audio?.url" :type="sources[selectedQuality]?.audio?.mimeType" />
      </audio>
    </template>
    <div class="settings-box" v-show="settingsVisible">
      <label>
        画質:
        <select v-model="selectedQuality" class="selector">
          <option value="muxed360p" v-if="sources.muxed360p">通常</option>
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

async function fetchStreamUrl(id) {
  error.value = "";
  sources.value = {};
  selectedQuality.value = "muxed360p";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];
  loading.value = true;
  try {
    const res = await fetch(`${apiurl()}?&stream2=${id}`);
    if (!res.ok) throw new Error(`type2 ストリーム取得失敗: ${res.status}`);
    const data = await res.json();
    const srcs = {};
    const qualities = [];
    if (data.muxed360p) {
      srcs.muxed360p = {
        url: data.muxed360p.url,
        mimeType: data.muxed360p.mimeType
      };
    }
    Object.keys(data).forEach((key) => {
      if (/^\d{3,4}p$/.test(key)) {
        qualities.push(key);
        srcs[key] = {
          video: {
            url: data[key].video.url,
            mimeType: data[key].video.mimeType
          },
          audio: {
            url: data[key].audio.url,
            mimeType: data[key].audio.mimeType
          }
        };
      }
    });
    availableQualities.value = qualities.sort((a, b) => parseInt(b) - parseInt(a));
    sources.value = srcs;
    if (selectedQuality.value !== "muxed360p" && qualities.length > 0) {
      selectedQuality.value = qualities[0];
    }
    await nextTick();
    if (selectedQuality.value !== "muxed360p") {
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
  if (
    selectedQuality.value !== "muxed360p" &&
    sources.value[selectedQuality.value]
  ) {
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

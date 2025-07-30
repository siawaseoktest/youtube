<template>
  <div class="video-wrapper">
    <div v-if="error">{{ error }}</div>

    <!-- StreamType=2 -->
    <div
      v-else-if="
        streamType2 &&
        selectedQuality &&
        (sources.muxed360p || availableQualities.length > 0)
      "
      class="video-container"
    >
      <template v-if="selectedQuality === 'muxed360p'">
        <video ref="videoRef" :src="sources.muxed360p" controls></video>
      </template>
      <template v-else-if="selectedQuality !== 'muxed360p'">
        <video ref="videoRef" controls></video>
        <audio ref="audioRef" controls></audio>
      </template>

      <!-- 設定ボックス -->
      <div class="settings-box" v-show="settingsVisible">
        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option value="muxed360p">通常</option>
            <option
              v-for="q in availableQualities"
              :key="q"
              :value="q"
            >
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
    </div>

    <!-- iframeモード -->
    <div v-else-if="streamUrl" class="video-container">
      <iframe
        :src="streamUrl"
        frameborder="0"
        allowfullscreen
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin"
        title="動画ストリーム"
      ></iframe>
    </div>

    <div style="height: 500px" v-else>読み込み中...</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";

// props
const props = defineProps({
  videoId: { type: String, required: true },
});

onMounted(() => {
  document.cookie = "webappname=siatube; path=/; max-age=31536000"; 
});

// 状態
const streamUrl = ref("");
const error = ref("");
const sources = ref({});
const selectedQuality = ref("muxed360p");
const availableQualities = ref([]); // 追加
const selectedPlaybackRate = ref(1.0);
const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];
const streamType2 = ref(false);
const diffText = ref("0");

const videoRef = ref(null);
const audioRef = ref(null);

// クッキー監視用
const currentStreamType = ref(getCookie("StreamType"));
let cookieWatchInterval = null;

// 設定ボックスの自動非表示
const settingsVisible = ref(true);
let visibilityTimer = null;

function getCookie(name) {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.split("=")[1]) : null;
}

function setCookie(name, value, seconds) {
  const expires = new Date(Date.now() + seconds * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

// 動画再取得処理
function reloadStream() {
  if (props.videoId) {
    fetchStreamUrl(props.videoId);
  }
}

async function fetchStreamUrl(id) {
  streamUrl.value = "";
  error.value = "";
  streamType2.value = false;
  sources.value = {};
  selectedQuality.value = "muxed360p";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];

  try {
    const streamType = getCookie("StreamType");
    if (streamType === "2") {
      const res = await fetch(`/api/stream/${id}/type2`);
      if (!res.ok) throw new Error(`type2 ストリーム取得失敗: ${res.status}`);
      const data = await res.json();

      // muxed360pは従来通り
      const srcs = {};
      if (data.muxed360p) srcs.muxed360p = data.muxed360p.url;

      // 新しい解像度を抽出
      const qualities = [];
      Object.keys(data).forEach((key) => {
        if (/^\d{3,4}p$/.test(key)) {
          qualities.push(key);
          srcs[key] = {
            video: data[key].video.url,
            audio: data[key].audio.url,
          };
        }
      });
      availableQualities.value = qualities.sort((a, b) => parseInt(b) - parseInt(a));
      sources.value = srcs;

      // デフォルト画質
      if (selectedQuality.value !== "muxed360p" && qualities.length > 0) {
        selectedQuality.value = qualities[0];
      }

      streamType2.value = true;

      await nextTick();
      if (selectedQuality.value !== "muxed360p") {
        setupSyncPlayback();
      }
    } else {
      const res = await fetch(`/api/stream/${id}`);
      if (!res.ok) throw new Error(`ストリーム取得失敗: ${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error("ストリームURLが空です");
      streamUrl.value = data.url;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("取得エラー:", err);
    error.value = "ストリームURLの取得に失敗しました。";
  }
}

function watchStreamTypeCookie() {
  cookieWatchInterval = setInterval(() => {
    const newType = getCookie("StreamType");
    if (newType !== currentStreamType.value) {
      currentStreamType.value = newType;
    }
  }, 1000);
}

function resetSettingsVisibility() {
  settingsVisible.value = true;
  if (visibilityTimer) clearTimeout(visibilityTimer);
  visibilityTimer = setTimeout(() => {
    settingsVisible.value = false;
  }, 3000);
}

function setupAutoHide() {
  ["mousemove", "click", "touchstart"].forEach((event) => {
    window.addEventListener(event, resetSettingsVisibility);
  });
}

function removeAutoHide() {
  ["mousemove", "click", "touchstart"].forEach((event) => {
    window.removeEventListener(event, resetSettingsVisibility);
  });
}

// 再生速度
watch(selectedPlaybackRate, () => {
  if (videoRef.value) videoRef.value.playbackRate = selectedPlaybackRate.value;
  // audio.playbackRate は correctPlaybackRate で常時補正されるため直接は変更しない
});

// StreamType変化時に再取得
watch(currentStreamType, () => {
  if (props.videoId) fetchStreamUrl(props.videoId);
});

// videoId変化時に再取得
watch(
  () => props.videoId,
  (newId) => {
    if (newId) fetchStreamUrl(newId);
  },
  { immediate: true }
);

// 画質変更時にセットアップ（muxed360p以外は同期再生）
watch(selectedQuality, () => {
  if (
    streamType2.value &&
    selectedQuality.value !== "muxed360p" &&
    sources.value[selectedQuality.value]
  ) {
    nextTick(() => setupSyncPlayback());
  }
});

// 高画質モードの映像・音声同期＆補正
function setupSyncPlayback() {
  const video = videoRef.value;
  const audio = audioRef.value;
  if (!video || !audio) return;

  let videoSrc, audioSrc;
  if (selectedQuality.value !== "muxed360p" && sources.value[selectedQuality.value]) {
    videoSrc = sources.value[selectedQuality.value].video;
    audioSrc = sources.value[selectedQuality.value].audio;
  } else if (sources.value.separateHigh) {
    videoSrc = sources.value.separateHigh.video;
    audioSrc = sources.value.separateHigh.audio;
  } else {
    return;
  }

  video.src = videoSrc;
  audio.src = audioSrc;

  let isStartupJumpDone = false;
  let isBuffering = false;

  function isJumpCooldown() {
    return getCookie("audioJumpCooldown") === "true";
  }

  function startJumpCooldown() {
    setCookie("audioJumpCooldown", "true", 1);
    setTimeout(() => setCookie("audioJumpCooldown", "false", 1), 1000);
  }

  function jumpAudioToVideo() {
    if (isJumpCooldown()) return;
    const target = Math.max(0, video.currentTime - 0.05);
    audio.currentTime = target;
    startJumpCooldown();
  }

  function correctPlaybackRate(diff) {
    const abs = Math.abs(diff);
    let rateAdjust = 1.0;

    if (abs < 0.01) {
      rateAdjust = 1.0;
    } else if (abs < 0.1) {
      rateAdjust = diff > 0 ? 1.02 : 0.98;
    } else if (abs < 1.5) {
      rateAdjust = diff > 0 ? 1.06 : 0.94;
    } else if (abs < 2.0) {
      rateAdjust = diff > 0 ? 1.1 : 0.9;
    } else {
      rateAdjust = 1.0;
      jumpAudioToVideo();
    }

    audio.playbackRate = selectedPlaybackRate.value * rateAdjust;
  }

  video.addEventListener("waiting", () => {
    isBuffering = true;
    audio.pause();
  });

  video.addEventListener("playing", () => {
    if (isBuffering) {
      isBuffering = false;
      if (!video.paused) audio.play().catch(console.warn);
    }
  });

  video.addEventListener("pause", () => {
    if (!audio.paused) audio.pause();
  });

  video.onplay = () => {
    video.playbackRate = selectedPlaybackRate.value;
    audio.playbackRate = selectedPlaybackRate.value;
    audio.play().catch(console.warn);

    if (!isStartupJumpDone) {
      setTimeout(() => {
        audio.currentTime = Math.max(0, video.currentTime - 0.05);
        isStartupJumpDone = true;
      }, 100);
    }
  };

  video.onseeking = () => {
    setTimeout(() => jumpAudioToVideo(), 100);
  };

  video.ontimeupdate = () => {
    const diff = video.currentTime - audio.currentTime;
    diffText.value = `${(diff * 1000).toFixed(0)} ms`;
    correctPlaybackRate(diff);
  };

  video.playbackRate = selectedPlaybackRate.value;
  audio.playbackRate = selectedPlaybackRate.value;
}

onMounted(() => {
  setCookie("audioJumpCooldown", "false", 1);
  watchStreamTypeCookie();
  setupAutoHide();
  resetSettingsVisibility();
});

onBeforeUnmount(() => {
  if (cookieWatchInterval) clearInterval(cookieWatchInterval);
  removeAutoHide();
});
</script>

<style scoped>
.video-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}
.video-container iframe,
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
</style>

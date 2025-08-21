<template>
  <div class="video-wrapper">
    <!-- エラー表示 -->
    <div v-if="error" class="error-box">
      ⚠️ {{ error }}
      <button @click="reloadStream" class="reload-button">再取得</button>
    </div>

    <!-- StreamType=3 -->
    <div v-else-if="streamType === '3' && streamUrl">
      <a :href="streamUrl" target="_blank" rel="noopener noreferrer">
        ダウンロード
      </a>
    </div>

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
        <audio ref="audioRef" preload="auto" style="display:none;"></audio>
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
    <!-- StreamType=1 -->
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

    <!-- 読み込み中 -->
    <div v-else-if="loading">読み込み中...</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { API_URL } from "@/api";

// props
const props = defineProps({
  videoId: { type: String, required: true },
  streamType: { type: String, default: "" }
});

// cookie安全取得
function getCookieSafe(name) {
  try {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return value ? decodeURIComponent(value.split("=")[1]) : null;
  } catch {
    return null;
  }
}

function setCookieSafe(name, value, seconds) {
  try {
    const expires = new Date(Date.now() + seconds * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/`;
  } catch {
    // cookie使えない環境なら何もしない
  }
}

// 状態
const streamUrl = ref("");
const error = ref("");
const sources = ref({});
const selectedQuality = ref("muxed360p");
const availableQualities = ref([]);
const selectedPlaybackRate = ref(1.0);
const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4];
const streamType2 = ref(false);
const diffText = ref("0");

const videoRef = ref(null);
const audioRef = ref(null);

// 現在のstreamType（props優先、なければcookie、なければ"2"）
const currentStreamType = ref(
  props.streamType || getCookieSafe("StreamType") || "2"
);
let cookieWatchInterval = null;

// 設定ボックスの自動非表示
const settingsVisible = ref(true);
let visibilityTimer = null;

const loading = ref(false);

onMounted(() => {
  document.cookie = "webappname=siatube; path=/; max-age=31536000";
  watchStreamTypeCookie();
  setupAutoHide();
});

onBeforeUnmount(() => {
  if (cookieWatchInterval) clearInterval(cookieWatchInterval);
  removeAutoHide();
});

// 動画再取得処理
function reloadStream() {
  if (props.videoId) {
    fetchStreamUrl(props.videoId, currentStreamType.value);
  }
}

async function fetchStreamUrl(id, streamType) {
  streamUrl.value = "";
  error.value = "";
  streamType2.value = false;
  sources.value = {};
  selectedQuality.value = "muxed360p";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];
  loading.value = true;

  try {
    const Type = streamType || "1";

    if (Type === "2") {
      // Type2 ストリーム取得
      const res = await fetch(`${API_URL}?&stream2=${id}`);
      if (!res.ok) throw new Error(`type2 ストリーム取得失敗: ${res.status}`);
      const data = await res.json();

      const srcs = {};
      if (data.muxed360p) srcs.muxed360p = data.muxed360p.url;

      const qualities = [];
      Object.keys(data).forEach((key) => {
        if (/^\d{3,4}p$/.test(key)) {
          qualities.push(key);
          srcs[key] = {
            video: data[key].video.url,
            audio: data[key].audio.url
          };
        }
      });

      availableQualities.value = qualities.sort((a, b) => parseInt(b) - parseInt(a));
      sources.value = srcs;

      if (selectedQuality.value !== "muxed360p" && qualities.length > 0) {
        selectedQuality.value = qualities[0];
      }

      streamType2.value = true;

      await nextTick();
      if (selectedQuality.value !== "muxed360p") {
        setupSyncPlayback();
      }

    } else if (Type === "3") {
      // Type3: muxed360p 全画面
      // Type2 で取得済みがあればそれを使う
      if (sources.value.muxed360p) {
        streamUrl.value = sources.value.muxed360p;
      } else {
        const res = await fetch(`${API_URL}?stream2=${id}`);
        if (!res.ok) throw new Error(`type3 ストリーム取得失敗: ${res.status}`);
        const data = await res.json();
        if (!data.muxed360p) throw new Error("Type3: muxed360p がありません");
        streamUrl.value = data.muxed360p.url;
        sources.value.muxed360p = streamUrl.value;
      }

      selectedQuality.value = "muxed360p";
      streamType2.value = false;

      await nextTick();
      if (videoRef.value) {
        videoRef.value.requestFullscreen().catch(() => {});
        videoRef.value.play().catch(() => {});
      }

    } else {
      // Type1 またはその他
      const res = await fetch(`${API_URL}?stream=${id}`);
      if (!res.ok) throw new Error(`ストリーム取得失敗: ${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error("ストリームURLが空です");
      streamUrl.value = data.url;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (err) {
    console.error("取得エラー:", err);
    error.value = "ストリームURLの取得に失敗しました。";
  } finally {
    loading.value = false;
  }
}

// Cookie監視
function watchStreamTypeCookie() {
  cookieWatchInterval = setInterval(() => {
    const cookieType = getCookieSafe("StreamType");
    if (!props.streamType && cookieType !== currentStreamType.value) {
      currentStreamType.value = cookieType || "1";
    }
  }, 1000);
}

// 設定自動非表示
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

// 再生速度変更
watch(selectedPlaybackRate, () => {
  if (videoRef.value) videoRef.value.playbackRate = selectedPlaybackRate.value;
});

// 親からの props.streamType 変更に追従
watch(
  () => props.streamType,
  (newType) => {
    if (newType) {
      currentStreamType.value = newType;
    }
  }
);

// streamType 変更時に再取得
watch(currentStreamType, (newType) => {
  if (props.videoId) fetchStreamUrl(props.videoId, newType);
});

// videoId 変更時に再取得
watch(
  () => props.videoId,
  (newId) => {
    if (newId) fetchStreamUrl(newId, currentStreamType.value);
  },
  { immediate: true }
);

// 画質変更時にセットアップ
watch(selectedQuality, () => {
  if (
    streamType2.value &&
    selectedQuality.value !== "muxed360p" &&
    sources.value[selectedQuality.value]
  ) {
    nextTick(() => setupSyncPlayback());
  }
});

function setupSyncPlayback() {
  const video = videoRef.value;
  const audio = audioRef.value;
  if (!video || !audio) return;

  // Safari系判定
  function isSafari() {
    const ua = navigator.userAgent;
    return (
      /Safari/.test(ua) &&
      !/Chrome/.test(ua) &&
      (/iPhone|iPad|Macintosh/.test(ua))
    );
  }
  const safariMode = isSafari();

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
  let isSyncingPlayback = false;
  let lastJumpTime = 0;
  const jumpCooldown = 500; // ms

  function jumpAudioToVideo() {
    const now = performance.now();
    if (now - lastJumpTime < jumpCooldown) {
    return;
    }
    const target = Math.max(0, video.currentTime - 0.05);
    audio.currentTime = target;
    lastJumpTime = now;
  }
  
  function correctPlaybackRate(diff) {
    const abs = Math.abs(diff);

    // Safari系専用
    if (safariMode) {
      // 2秒以上のズレは即ジャンプ
      if (abs >= 2) {
        jumpAudioToVideo();
        return;
      }
      
      if (abs < 0.01) {
        audio.playbackRate = 1.0;
      } else if (abs < 0.1) {
        audio.playbackRate = diff > 0 ? 1.02 : 0.98;
      } else if (abs < 1.5) {
        audio.playbackRate = diff > 0 ? 1.06 : 0.94;
      } else if (abs < 2.0) {
        audio.playbackRate = diff > 0 ? 1.1 : 0.9;
      } else {
        audio.playbackRate = 1.0;
        jumpAudioToVideo();
      }

      if (abs < 0.015) {
        audio.playbackRate = selectedPlaybackRate.value;
        return;
      }

      const adjustmentRatio = abs / 1.5;
      const rateAdjust = 1 + adjustmentRatio * maxAdjust * (diff > 0 ? 1 : -1);
      audio.playbackRate = selectedPlaybackRate.value * rateAdjust;
      return;
    }

    // 通常ブラウザ
    if (performance.now() - lastJumpTime < jumpCooldown) {
      audio.playbackRate = selectedPlaybackRate.value;
      return;
    }
    if (abs >= 0.9) {
      jumpAudioToVideo();
      return;
    }

    let maxAdjust;
    if (abs >= 0.8) {
      maxAdjust = 0.85;
    } else if (abs >= 0.1) {
      maxAdjust = 0.75;
    } else {
      maxAdjust = 0.015;
    }

    if (abs < 0.015) {
      audio.playbackRate = selectedPlaybackRate.value;
      return;
    }

    const adjustmentRatio = abs / 0.9;
    const rateAdjust = 1 + adjustmentRatio * maxAdjust * (diff > 0 ? 1 : -1);
    audio.playbackRate = selectedPlaybackRate.value * rateAdjust;
  }

  // 再生・停止時
  function playBoth(withJump = false) {
    if (isSyncingPlayback) return;
    isSyncingPlayback = true;

    Promise.all([
      video.paused ? video.play() : Promise.resolve(),
      audio.paused ? audio.play() : Promise.resolve(),
    ])
      .then(() => {
        if (withJump) jumpAudioToVideo();
      })
      .finally(() => {
        isSyncingPlayback = false;
      });
  }

  function pauseBoth() {
    if (isSyncingPlayback) return;
    isSyncingPlayback = true;
    video.pause();
    audio.pause();
    isSyncingPlayback = false;
  }

  video.removeEventListener("play", playBoth);
  audio.removeEventListener("play", playBoth);
  video.removeEventListener("pause", pauseBoth);
  audio.removeEventListener("pause", pauseBoth);

  video.addEventListener("play", () => playBoth(true));
  audio.addEventListener("play", () => playBoth(true));
  video.addEventListener("pause", pauseBoth);
  audio.addEventListener("pause", pauseBoth);

  video.addEventListener("waiting", () => {
    isBuffering = true;
    audio.pause();
  });

  video.addEventListener("playing", () => {
    if (isBuffering) {
      isBuffering = false;
      jumpAudioToVideo();
      if (!video.paused) {
        audio.play().catch(() => {});
      }
    }
  });

  // 再生開始
  video.onplay = () => {
    video.playbackRate = selectedPlaybackRate.value;
    audio.playbackRate = selectedPlaybackRate.value;
    audio.play().catch(() => {});

    if (!isStartupJumpDone) {
      setTimeout(() => {
        jumpAudioToVideo();
        isStartupJumpDone = true;
      }, 100);
    }
  };

  video.onseeking = () => {
    setTimeout(() => jumpAudioToVideo(), 100);
  };

  function syncLoop() {
    if (!video.paused && !audio.paused) {
      const diff = video.currentTime - audio.currentTime;
      diffText.value = `${(diff * 1000).toFixed(0)} ms`;
      correctPlaybackRate(diff);
    }
    requestAnimationFrame(syncLoop);
  }
  requestAnimationFrame(syncLoop);

  // 倍速
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

.full-screen-video video {
  width: 100vw;
  height: 100vh;
  object-fit: contain; 
}

</style>

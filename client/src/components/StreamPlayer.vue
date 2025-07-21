<template>
  <div class="video-wrapper">
    <div v-if="error">{{ error }}</div>

    <!-- StreamType=2 のとき -->
    <div
      v-else-if="
        streamType2 &&
        selectedQuality &&
        sources.muxed360p &&
        sources.separateHigh
      "
      class="video-container"
    >
      <template v-if="selectedQuality === 'muxed360p'">
        <video :src="sources.muxed360p" controls></video>
      </template>
      <template v-else-if="selectedQuality === 'separateHigh'">
        <video ref="videoRef" controls></video>
        <audio ref="audioRef" controls></audio>
        <p>
          音声の差<span>{{ diffText }}</span>
        </p>
      </template>

      <select v-model="selectedQuality" class="quality-selector">
        <option value="muxed360p">通常</option>
        <option value="separateHigh">高画質</option>
      </select>
    </div>

    <!-- StreamType=1（iframeのみ） -->
    <div v-else-if="streamUrl" class="video-container">
      <iframe :src="streamUrl" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>    
    </div>

    <div style="height: 500px" v-else>読み込み中...</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";

const props = defineProps({
  videoId: { type: String, required: true },
});

const streamUrl = ref("");
const error = ref("");
const sources = ref({});
const selectedQuality = ref("muxed360p");
const streamType2 = ref(false);
const diffText = ref("0");

const videoRef = ref(null);
const audioRef = ref(null);

// 現在のCookie値を保存して監視するためのref
const currentStreamType = ref(getCookie("StreamType"));

let cookieWatchInterval = null;

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

async function fetchStreamUrl(id) {
  streamUrl.value = "";
  error.value = "";
  streamType2.value = false;
  sources.value = {};
  selectedQuality.value = "muxed360p";
  diffText.value = "0";

  try {
    const streamType = getCookie("StreamType");
    if (streamType === "2") {
      const res = await fetch(`/api/stream/${id}/type2`);
      if (!res.ok) throw new Error(`type2 ストリーム取得失敗: ${res.status}`);
      const data = await res.json();

      sources.value = {
        muxed360p: data.muxed360p.url,
        separateHigh: {
          video: data.video.url,
          audio: data.audio.url,
        },
      };
      streamType2.value = true;

      await nextTick();
      if (selectedQuality.value === "separateHigh") {
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

// 1秒ごとにCookieのStreamTypeをチェックして変化を監視
function watchStreamTypeCookie() {
  cookieWatchInterval = setInterval(() => {
    const newType = getCookie("StreamType");
    if (newType !== currentStreamType.value) {
      currentStreamType.value = newType;
    }
  }, 1000);
}

watch(currentStreamType, () => {
  if (props.videoId) {
    fetchStreamUrl(props.videoId);
  }
});

watch(
  () => props.videoId,
  (newId) => {
    if (newId) fetchStreamUrl(newId);
  },
  { immediate: true }
);

watch(selectedQuality, () => {
  if (streamType2.value && selectedQuality.value === "separateHigh") {
    nextTick(() => setupSyncPlayback());
  }
});

onMounted(() => {
  setCookie("audioJumpCooldown", "false", 1);
  watchStreamTypeCookie();
});

onBeforeUnmount(() => {
  if (cookieWatchInterval) clearInterval(cookieWatchInterval);
});

function setupSyncPlayback() {
  const video = videoRef.value;
  const audio = audioRef.value;
  if (!video || !audio || !sources.value.separateHigh) return;

  const { video: videoSrc, audio: audioSrc } = sources.value.separateHigh;
  video.src = videoSrc;
  audio.src = audioSrc;

  let isStartupJumpDone = false;
  let isBuffering = false;

  const cooldownName = "audioJumpCooldown";

  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );
    return match ? match[2] : null;
  }

  function isJumpCooldown() {
    return getCookie(cooldownName) === "true";
  }

  function startJumpCooldown() {
    setCookie(cooldownName, "true", 1);
    setTimeout(() => setCookie(cooldownName, "false", 1), 1000);
  }

  function jumpAudioToVideo() {
    if (isJumpCooldown()) return;
    const target = Math.max(0, video.currentTime - 0.05);
    audio.currentTime = target;
    startJumpCooldown();
  }

  function correctPlaybackRate(diff) {
    const abs = Math.abs(diff);
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
}
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
.quality-selector {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
}
audio {
  display: none;
}
</style>

<template>
  <div class="video-wrapper">
    <!-- 画質変更中の操作禁止オーバーレイこれやっとかないとえらいこっちゃになるしブラウザも認識できないばぐった音声が再生されつずけちゃう、(まあバグったら画質を変えれば直る("通常"以外の画質で))-->
    <div
      v-if="isQualitySwitching"
      class="block-overlay"
      aria-hidden="true"
    ></div>

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
        <video ref="videoRef" controls autoplay>
          <source
            :src="sources.muxed360p?.url"
            :type="sources.muxed360p?.mimeType"
          />
        </video>
      </template>

      <template v-else-if="selectedQuality !== 'muxed360p'">
        <video ref="videoRef" preload="auto" controls>
          <source
            :src="sources[selectedQuality]?.video?.url"
            :type="sources[selectedQuality]?.video?.mimeType"
          />
        </video>
        <audio ref="audioRef" preload="auto" style="display:none;">
          <source
            :src="sources[selectedQuality]?.audio?.url"
            :type="sources[selectedQuality]?.audio?.mimeType"
          />
        </audio>
      </template>

      <!-- 設定ボックス -->
      <div class="settings-box" v-show="settingsVisible">
        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option value="muxed360p" v-if="sources.muxed360p">通常</option>
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
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        title="動画ストリーム"
      ></iframe>
    </div>

    <!-- 読み込み中 -->
    <div v-else-if="loading" style="height: 50px">読み込み中...</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { API_URL } from "@/api";
import { setupSyncPlayback } from "@/components/syncPlayback";

// props
const props = defineProps({
  videoId: { type: String, required: true },
  streamType: { type: String, default: "" }
});

// cookieを安全に取得
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
  } catch {}
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

const currentStreamType = ref(
  props.streamType || getCookieSafe("StreamType") || "1"
);
let cookieWatchInterval = null;

const settingsVisible = ref(true);
let visibilityTimer = null;
const loading = ref(false);
const isQualitySwitching = ref(false);

// mount
onMounted(() => {
  document.cookie = "webappname=siatube; path=/; max-age=31536000";
  setCookieSafe("audioJumpCooldown", "false", 1);
  watchStreamTypeCookie();
  setupAutoHide();
  resetSettingsVisibility();
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
      const res = await fetch(`${API_URL}?&stream2=${id}`);
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

      availableQualities.value = qualities.sort(
        (a, b) => parseInt(b) - parseInt(a)
      );
      sources.value = srcs;

      if (selectedQuality.value !== "muxed360p" && qualities.length > 0) {
        selectedQuality.value = qualities[0];
      }

      streamType2.value = true;

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
    } else if (Type === "3") {
      const res = await fetch(`${API_URL}?stream2=${id}`);
      if (!res.ok) throw new Error(`type3 ストリーム取得失敗: ${res.status}`);
      const data = await res.json();
      if (!data.muxed360p) throw new Error("Type3: muxed360p がありません");
      streamUrl.value = data.muxed360p.url;
      sources.value.muxed360p = { url: streamUrl.value, mimeType: data.muxed360p.mimeType };

      selectedQuality.value = "muxed360p";
      streamType2.value = false;

      await nextTick();
      if (videoRef.value) {
        videoRef.value.requestFullscreen().catch(() => {});
        videoRef.value.play().catch(() => {});
      }
    } else {
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

// props変更追従
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
function clearType2SrcRepeated() {
  if (!streamType2.value) return;

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
    streamType2.value &&
    selectedQuality.value !== "muxed360p" &&
    sources.value[selectedQuality.value]
  ) {
    // 画質変更中フラグON（動画の準備ができる前にユーザーが再生再開をしてしまうとグワーってばぐります。）
    isQualitySwitching.value = true;

    // overlayは2s後に自動で消す（画質変更処理と並列、今は2sだけど回線速度が遅い場合は2sじゃ足りない）
    setTimeout(() => {
      isQualitySwitching.value = false;
    }, 2000);

    // 画質変更処理
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

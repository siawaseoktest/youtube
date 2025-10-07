<template>
  <div class="video-wrapper">
    <StreamType1 v-if="currentStreamType === '1'" :videoId="videoId" :reloadStream="reloadStream" />
    <StreamType2 v-else-if="currentStreamType === '2'" :videoId="videoId" :reloadStream="reloadStream" />
    <StreamType3 v-else-if="currentStreamType === '3'" :videoId="videoId" :reloadStream="reloadStream" />
  </div>
</template>

<script setup>
<<<<<<< HEAD
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { setupSyncPlayback } from "@/components/syncPlayback";
=======
import { ref, watch, onMounted } from "vue";
import StreamType1 from "./StreamType1.vue";
import StreamType2 from "./StreamType2.vue";
import StreamType3 from "./StreamType3.vue";
>>>>>>> 54e593e0086e9159b9f7806dfc2a432e30786130

// props
const props = defineProps({
  videoId: { type: String, required: true },
  streamType: { type: String, default: "" }
});

const currentStreamType = ref(props.streamType || "1");

function reloadStream() {
  // 各子コンポーネントで再取得用に渡すだけ
}

<<<<<<< HEAD
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
      const res = await fetch(`/api/stream/${id}/type2`);
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
      const res = await fetch(`/api/stream/${id}/type2`);
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
=======
>>>>>>> 54e593e0086e9159b9f7806dfc2a432e30786130
watch(
  () => props.streamType,
  (newType) => {
    if (newType) {
      currentStreamType.value = newType;
    }
  }
);
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

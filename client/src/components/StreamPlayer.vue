<template>
  <div class="video-wrapper">
      <StreamType1 v-if="currentStreamType === '1'" :videoId="videoId" :reloadStream="reloadStream" @ended="onEnded" />
      <StreamType2 v-else-if="currentStreamType === '2'" :videoId="videoId" :reloadStream="reloadStream" @ended="onEnded" />
      <StreamType3 v-else-if="currentStreamType === '3'" :videoId="videoId" :reloadStream="reloadStream" @ended="onEnded" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import StreamType1 from "./StreamType1.vue";
import StreamType2 from "./StreamType2.vue";
import StreamType3 from "./StreamType3.vue";

// props
const props = defineProps({
  videoId: { type: String, required: true },
  streamType: { type: String, default: "" }
});

const emit = defineEmits(["ended"]);

const currentStreamType = ref(props.streamType || "1");

function reloadStream() {
  // 各子コンポーネントで再取得用に渡すだけ
}

function onEnded(payload) {
  emit('ended', payload);
}

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

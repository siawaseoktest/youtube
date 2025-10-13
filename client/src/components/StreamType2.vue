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
        :autoplay="autoplayEnabled"
        :loop="repeatEnabled"
        :src="sources[selectedQuality]?.url"
        type="application/x-mpegURL"
        :key="sources[selectedQuality]?.url"
      ></video>
      <div v-if="showUnmutePrompt" class="unmute-prompt" @click.stop="handleUnmuteClick">
        ミュートを解除する
      </div>
      <div class="settings-box" v-show="settingsVisible">
        <label>
          画質:
          <select v-model="selectedQuality" class="selector">
            <option v-for="q in availableQualities" :key="q" :value="q">
              {{ q.replace('p', '') }}p
            </option>
          </select>
        </label>
        <details class="other-settings">
          <summary>その他</summary>
          <label>
            繰り返し:
            <input type="checkbox" v-model="repeatEnabled" />
          </label>
            <label :class="{ 'autoplay-disabled': repeatEnabled }">
            自動再生:
              <input type="checkbox" v-model="autoplayEnabled" :disabled="repeatEnabled" />
          </label>
        </details>
        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>
    <!-- その他: videourlのみ -->
    <template v-else>
      <video ref="videoRef" preload="auto" autoplay controls>
        <source :src="sources[selectedQuality]?.video?.url" :type="sources[selectedQuality]?.video?.mimeType" />
      </video>
      <div v-if="showUnmutePrompt" class="unmute-prompt" @click.stop="handleUnmuteClick">
        ミュートを解除する
      </div>
      <audio ref="audioRef" preload="auto" style="display:none;" autoplay>
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
          <details class="other-settings">
            <summary>その他</summary>
            <label>
              繰り返し:
              <input type="checkbox" v-model="repeatEnabled" />
            </label>
            <label :class="{ 'autoplay-disabled': repeatEnabled }">
              自動再生:
                <input type="checkbox" v-model="autoplayEnabled" :disabled="repeatEnabled" />
            </label>
          </details>
        <button @click="reloadStream" class="reload-button">再読込み</button>
      </div>
      <div v-if="isQualitySwitching" class="block-overlay" aria-hidden="true"></div>
    </template>
  </div>
  <div v-else-if="loading" style="height: 50px">読み込み中...</div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
import { apiurl } from "@/api";
import { setupSyncPlayback } from "@/components/syncPlayback";

const props = defineProps({
  videoId: { type: String, required: true }
});
const emit = defineEmits(["ended"]);
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
const repeatEnabled = ref(false);
const autoplayEnabled = ref(true);
const loading = ref(false);
const isQualitySwitching = ref(false);
const showUnmutePrompt = ref(false);
const USER_GESTURE_KEY = 'yt_user_gesture_v1';
const AUTOPLAY_DELAY_MS = 3000;
const LOOP_BUFFER_SECONDS = 2; // wait 2s buffer when loop restarts
let _autoplayTimer = null;
let _buffering = false;
let _loopResumeTimer = null;
let _loopBufferListenersAttached = false;
const BUFFER_RESUME_SECONDS = 5;

function getBufferedAhead(el) {
  try {
    if (!el || !el.buffered) return 0;
    const cur = el.currentTime || 0;
    const buf = el.buffered;
    for (let i = buf.length - 1; i >= 0; i--) {
      const start = buf.start(i);
      const end = buf.end(i);
      if (end > cur) {
        if (start <= cur) return end - cur;
        // if start > cur, still return end - cur as ahead buffer
        return end - cur;
      }
    }
    return 0;
  } catch (e) { return 0; }
}

function checkAndResumeIfBuffered() {
  const vAhead = getBufferedAhead(videoRef.value);
  const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
  if (_buffering && vAhead >= BUFFER_RESUME_SECONDS && aAhead >= BUFFER_RESUME_SECONDS) {
    _buffering = false;
    try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
    try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
    // detach buffer listeners after resume
    detachBufferListeners();
  }
}

let _bufferListenersAttached = false;
function attachBufferListeners() {
  if (_bufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.addEventListener('waiting', onWaiting);
      videoRef.value.addEventListener('progress', onProgress);
      videoRef.value.addEventListener('playing', onPlaying);
    }
    if (audioRef.value) {
      audioRef.value.addEventListener('waiting', onWaiting);
      audioRef.value.addEventListener('progress', onProgress);
      audioRef.value.addEventListener('playing', onPlaying);
    }
    _bufferListenersAttached = true;
  } catch (e) {}
}

function detachBufferListeners() {
  if (!_bufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.removeEventListener('waiting', onWaiting);
      videoRef.value.removeEventListener('progress', onProgress);
      videoRef.value.removeEventListener('playing', onPlaying);
    }
    if (audioRef.value) {
      audioRef.value.removeEventListener('waiting', onWaiting);
      audioRef.value.removeEventListener('progress', onProgress);
      audioRef.value.removeEventListener('playing', onPlaying);
    }
  } catch (e) {}
  _bufferListenersAttached = false;
}

function onWaiting() {
  _buffering = true;
  // start checking; rely on progress/timeupdate events
  // ensure listeners attached
  attachBufferListeners();
}

function onProgress() {
  if (!_buffering) return;
  checkAndResumeIfBuffered();
}

function onPlaying() {
  _buffering = false;
  // once playing, can remove buffer listeners
  detachBufferListeners();
}

function handleUnmuteClick() {
  try { localStorage.setItem(USER_GESTURE_KEY, '1'); } catch (e) {}
  showUnmutePrompt.value = false;
  try {
    if (videoRef.value) { videoRef.value.muted = false; videoRef.value.play(); }
    if (audioRef.value) { audioRef.value.muted = false; audioRef.value.play(); }
  } catch (e) {}
}

function onFirstUserGesture() {
  try { localStorage.setItem(USER_GESTURE_KEY, '1'); } catch (e) {}
  showUnmutePrompt.value = false;
  try {
    if (videoRef.value) { videoRef.value.muted = false; videoRef.value.play(); }
    if (audioRef.value) { audioRef.value.muted = false; audioRef.value.play(); }
  } catch (e) {}
}

function scheduleAutoplay() {
  // cancel any previous
  try { if (_autoplayTimer) { clearTimeout(_autoplayTimer); _autoplayTimer = null; } } catch (e) {}
  if (!autoplayEnabled.value) return;
  _autoplayTimer = setTimeout(() => {
    try {
      if (videoRef.value) videoRef.value.play();
      if (audioRef.value) audioRef.value.play();
    } catch (e) {}
    _autoplayTimer = null;
  }, AUTOPLAY_DELAY_MS);
}

function cancelAutoplay() {
  try { if (_autoplayTimer) { clearTimeout(_autoplayTimer); _autoplayTimer = null; } } catch (e) {}
}

function isAppleDevice() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|Macintosh/.test(ua);
}

// --- Loop / Autoplay mutual exclusion and auto-resume at 00:00 ---
function onTimeUpdateLoopHandler() {
  try {
    if (!videoRef.value) return;
    // If loop is enabled and video has jumped back to near 0, ensure it resumes
    if (repeatEnabled.value) {
      const cur = videoRef.value.currentTime || 0;
      // sometimes currentTime may be slightly >0 due to rounding; use small threshold
      if (cur <= 0.12 && videoRef.value.paused) {
        // start a delayed resume that allows buffer to accumulate
        startLoopResume();
      }
    }
  } catch (e) {}
}

function startLoopResume() {
  try { cancelLoopResume(); } catch (e) {}
  // schedule a 2s wait for buffer creation
  _loopResumeTimer = setTimeout(() => {
    try { attemptResumeLoop(); } catch (e) {}
  }, LOOP_BUFFER_SECONDS * 1000);
}

function cancelLoopResume() {
  try { if (_loopResumeTimer) { clearTimeout(_loopResumeTimer); _loopResumeTimer = null; } } catch (e) {}
  detachLoopBufferListeners();
}

function attemptResumeLoop() {
  const vAhead = getBufferedAhead(videoRef.value);
  const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
  if (vAhead >= LOOP_BUFFER_SECONDS && aAhead >= LOOP_BUFFER_SECONDS) {
    try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
    try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
    cancelLoopResume();
  } else {
    // Not enough buffer yet: attach listeners to resume when buffer grows
    attachLoopBufferListeners();
  }
}

function attachLoopBufferListeners() {
  if (_loopBufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.addEventListener('progress', onLoopBufferProgress);
      videoRef.value.addEventListener('playing', onLoopBufferProgress);
    }
    if (audioRef.value) {
      audioRef.value.addEventListener('progress', onLoopBufferProgress);
      audioRef.value.addEventListener('playing', onLoopBufferProgress);
    }
    _loopBufferListenersAttached = true;
  } catch (e) {}
}

function detachLoopBufferListeners() {
  if (!_loopBufferListenersAttached) return;
  try {
    if (videoRef.value) {
      videoRef.value.removeEventListener('progress', onLoopBufferProgress);
      videoRef.value.removeEventListener('playing', onLoopBufferProgress);
    }
    if (audioRef.value) {
      audioRef.value.removeEventListener('progress', onLoopBufferProgress);
      audioRef.value.removeEventListener('playing', onLoopBufferProgress);
    }
  } catch (e) {}
  _loopBufferListenersAttached = false;
}

function onLoopBufferProgress() {
  try {
    const vAhead = getBufferedAhead(videoRef.value);
    const aAhead = audioRef.value ? getBufferedAhead(audioRef.value) : vAhead;
    if (vAhead >= LOOP_BUFFER_SECONDS && aAhead >= LOOP_BUFFER_SECONDS) {
      try { if (videoRef.value) videoRef.value.play(); } catch (e) {}
      try { if (audioRef.value) audioRef.value.play(); } catch (e) {}
      cancelLoopResume();
    }
  } catch (e) {}
}

// watch repeatEnabled to enforce mutual exclusion with autoplay
watch(repeatEnabled, (newVal) => {
  try {
    if (newVal) {
      // if repeat turned on, disable autoplay and clear any scheduled autoplay
      autoplayEnabled.value = false;
      try { cancelAutoplay(); } catch (e) {}
    } else {
      // if repeat turned off, re-enable autoplay by default
      autoplayEnabled.value = true;
      // if sources ready, schedule autoplay
      try {
        if (autoplayEnabled.value) scheduleAutoplay();
      } catch (e) {}
    }
  } catch (e) {}
});


function fetchStreamUrl(id) {
  error.value = "";
  sources.value = {};
  selectedQuality.value = "";
  selectedPlaybackRate.value = 1.0;
  diffText.value = "0";
  availableQualities.value = [];
  loading.value = true;

  // ランダムなコールバック関数名を生成
  const cbName = "jsonp_cb2_" + Math.random().toString(36).slice(2, 10);
  let timeoutId;

  window[cbName] = function(data) {
    clearTimeout(timeoutId);
    loading.value = false;
    try {
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
      qualities = qualities.sort((a, b) => parseInt(b) - parseInt(a));
      m3u8Qualities = m3u8Qualities.sort((a, b) => parseInt(b) - parseInt(a));
      const defaultQuality = ["1080p", "720p", "480p"].find(q => qualities.includes(q)) || qualities[0];
      const defaultM3u8Quality = ["1080p", "720p", "480p"].find(q => m3u8Qualities.includes(q)) || m3u8Qualities[0];
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
        return;
      }
      nextTick().then(() => {
        if (!isAppleDevice() && selectedQuality.value && srcs[selectedQuality.value]) {
          setupSyncPlayback(
            videoRef.value,
            audioRef.value,
            sources,
            selectedQuality,
            diffText,
            selectedPlaybackRate
          );
            // 自動再生とミュート挙動: 初回はミュート、2回目以降はミュート解除
            const granted = (() => { try { return localStorage.getItem(USER_GESTURE_KEY) === '1'; } catch (e) { return false; } })();
            try {
              if (videoRef.value) {
                videoRef.value.muted = !granted;
                if (autoplayEnabled.value) scheduleAutoplay();
              }
              if (audioRef.value) {
                audioRef.value.muted = !granted;
                if (autoplayEnabled.value) scheduleAutoplay();
              }
              // attach buffer listeners to handle resume after buffering
              attachBufferListeners();
              // 初回で未許可ならプロンプト表示
              showUnmutePrompt.value = !granted;
              if (!granted) {
                // still schedule autoplay but keep muted until user gesture
                scheduleAutoplay();
                window.addEventListener('click', onFirstUserGesture, { once: true });
                window.addEventListener('touchstart', onFirstUserGesture, { once: true });
              } else {
                // already granted -> schedule autoplay normally
                scheduleAutoplay();
              }
            } catch (e) {}
        }
      });
    } catch (e) {
      error.value = "ストリームURLの取得に失敗しました (JSONP)";
    }
    cleanup();
  };

  function cleanup() {
    if (script.parentNode) script.parentNode.removeChild(script);
    delete window[cbName];
    try { cancelAutoplay(); } catch (e) {}
    try { detachBufferListeners(); } catch (e) {}
  }

  timeoutId = setTimeout(() => {
    loading.value = false;
    error.value = "ストリームURLの取得に失敗しました (タイムアウト)";
    cleanup();
  }, 30000);

  const script = document.createElement("script");
  script.src = `${apiurl()}?&stream2=${id}&callback=${cbName}`;
  script.onerror = function() {
    clearTimeout(timeoutId);
    loading.value = false;
    error.value = "ストリームURLの取得に失敗しました (script error)";
    cleanup();
  };
  document.body.appendChild(script);
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

// videoRef の変化を監視して ended リスナの attach/detach を行う
watch(videoRef, (newEl, oldEl) => {
  if (oldEl && _onEndedAttached) {
    try { oldEl.removeEventListener('ended', _onEnded); } catch (e) {}
    _onEndedAttached = false;
  }
  if (newEl) {
    try { newEl.addEventListener('ended', _onEnded); _onEndedAttached = true; } catch (e) {}
  }
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
      // 設定に応じて loop と autoplay を反映
      applyRepeatAndAutoplay();
      // ミュート/自動再生の制御（画質切替時にも反映）
      const granted2 = (() => { try { return localStorage.getItem(USER_GESTURE_KEY) === '1'; } catch (e) { return false; } })();
      try {
        if (videoRef.value) {
          videoRef.value.muted = !granted2;
          if (autoplayEnabled.value) scheduleAutoplay();
        }
        if (audioRef.value) {
          audioRef.value.muted = !granted2;
          if (autoplayEnabled.value) scheduleAutoplay();
        }
        // attach buffer listeners to handle resume after buffering
        attachBufferListeners();
        showUnmutePrompt.value = !granted2;
        if (!granted2) {
          scheduleAutoplay();
          window.addEventListener('click', onFirstUserGesture, { once: true });
          window.addEventListener('touchstart', onFirstUserGesture, { once: true });
        } else {
          scheduleAutoplay();
        }
      } catch (e) {}
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

function applyRepeatAndAutoplay() {
  if (videoRef.value) {
    videoRef.value.loop = !!repeatEnabled.value;
    videoRef.value.autoplay = !!autoplayEnabled.value;
    videoRef.value.playbackRate = selectedPlaybackRate.value;
  }
  if (audioRef.value) {
    audioRef.value.loop = !!repeatEnabled.value;
    audioRef.value.autoplay = !!autoplayEnabled.value;
    audioRef.value.playbackRate = selectedPlaybackRate.value;
  }
}

// 設定ボックスの管理
const settingsVisible = ref(false); 
let hideTimeout = null;

function showSettingsBox() {
  settingsVisible.value = true;
  if (hideTimeout) clearTimeout(hideTimeout);

  // 5秒後に自動で非表示
  hideTimeout = setTimeout(() => {
    settingsVisible.value = false;
  }, 5000);
}

onMounted(() => {
  if (videoRef.value) {
    videoRef.value.addEventListener('mousemove', showSettingsBox);
    videoRef.value.addEventListener('click', showSettingsBox);
    // その他設定を反映
    applyRepeatAndAutoplay();
  }

  window.addEventListener('mousemove', showSettingsBox);
  window.addEventListener('click', showSettingsBox);
  window.addEventListener('scroll', showSettingsBox);
  // attach loop timeupdate handler if video element exists
  try {
    if (videoRef.value) videoRef.value.addEventListener('timeupdate', onTimeUpdateLoopHandler);
  } catch (e) {}
});

// ended イベント検知: videoRef にリスナ登録
let _onEnded = () => {
  emit('ended');
};

function attachEndedListener() {
  if (videoRef.value && !_onEndedAttached) {
    videoRef.value.addEventListener('ended', _onEnded);
    _onEndedAttached = true;
  }
}

function detachEndedListener() {
  if (videoRef.value && _onEndedAttached) {
    try { videoRef.value.removeEventListener('ended', _onEnded); } catch (e) {}
    _onEndedAttached = false;
  }
}

let _onEndedAttached = false;

onBeforeUnmount(() => {
  try {
    detachEndedListener();
  } catch (e) {}
  window.removeEventListener('mousemove', showSettingsBox);
  window.removeEventListener('click', showSettingsBox);
  window.removeEventListener('scroll', showSettingsBox);
  try { window.removeEventListener('click', onFirstUserGesture); window.removeEventListener('touchstart', onFirstUserGesture); } catch (e) {}
  try { cancelAutoplay(); } catch (e) {}
  try { detachBufferListeners(); } catch (e) {}
  try { if (videoRef.value) videoRef.value.removeEventListener('timeupdate', onTimeUpdateLoopHandler); } catch (e) {}
});

// repeat/autoplay の変更を監視して要素に反映
watch([repeatEnabled, autoplayEnabled], () => {
  applyRepeatAndAutoplay();
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

.unmute-prompt {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(128,128,128,0.6);
  color: #fff;
  padding: 8px 10px;
  border-radius: 6px;
  z-index: 50;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.autoplay-disabled {
  color: rgba(255,255,255,0.5);
  position: relative;
}
.autoplay-disabled::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(255,255,255,0.6);
  transform: translateY(-50%);
  pointer-events: none;
}
</style>

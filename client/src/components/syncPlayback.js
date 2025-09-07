export function setupSyncPlayback(video, audio, sources, selectedQuality, diffText, selectedPlaybackRate) {
  if (!video || !audio) return;

  // Safari判定
  function isSafari() {
    const ua = navigator.userAgent;
    return /Safari/.test(ua) && !/Chrome/.test(ua) && (/iPhone|iPad|Macintosh/.test(ua));
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
    if (now - lastJumpTime < jumpCooldown) return;
    const target = Math.max(0, video.currentTime - 0.05);
    audio.currentTime = target;
    lastJumpTime = now;
  }

  function correctPlaybackRate(diff) {
    const abs = Math.abs(diff);

    if (safariMode) {
      let maxAdjust = 0.1;
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

  // 再生・停止イベント
  async function playBoth(withJump = false) {
    if (isSyncingPlayback) return;
    isSyncingPlayback = true;
    try {
      if (video.paused) await video.play();
      if (audio.paused) await audio.play();
      if (withJump) jumpAudioToVideo();
    } catch (e) {
      // 再生失敗時は何もしない
    } finally {
      isSyncingPlayback = false;
    }
  }

  async function pauseBoth() {
    if (isSyncingPlayback) return;
    isSyncingPlayback = true;
    try {
      video.pause();
      audio.pause();
    } finally {
      isSyncingPlayback = false;
    }
  }

  video.addEventListener("play", () => playBoth(true));
  audio.addEventListener("play", () => playBoth(true));
  video.addEventListener("pause", pauseBoth);
  audio.addEventListener("pause", pauseBoth);

  video.addEventListener("waiting", () => {
    isBuffering = true;
    if (!audio.paused) audio.pause();
  });

  video.addEventListener("playing", () => {
    if (isBuffering) {
      isBuffering = false;
      jumpAudioToVideo();
      if (video.paused) return;
      if (audio.paused && !isSyncingPlayback) {
        audio.play().catch(() => {});
      }
    }
  });

  // 再生開始
  video.onplay = () => {
    video.playbackRate = selectedPlaybackRate.value;
    audio.playbackRate = selectedPlaybackRate.value;
    // 映像が再生可能か確認してから音声再生
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
      if (audio.paused && !isSyncingPlayback) {
        audio.play().catch(() => {});
      }
    } else {
      // 映像が再生可能になるまで待つ
      const onCanPlay = () => {
        if (audio.paused && !isSyncingPlayback) {
          audio.play().catch(() => {});
        }
        video.removeEventListener("canplay", onCanPlay);
      };
      video.addEventListener("canplay", onCanPlay);
    }
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

  // 初期倍速反映
  video.playbackRate = selectedPlaybackRate.value;
  audio.playbackRate = selectedPlaybackRate.value;
}

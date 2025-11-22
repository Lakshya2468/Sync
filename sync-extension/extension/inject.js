"use strict";
(() => {
  // inject.ts
  (function() {
    "use strict";
    console.log("Sync Extension: Inject script loaded for Netflix");
    let videoElement = null;
    let lastState = {
      currentTime: 0,
      paused: true,
      playbackRate: 1
    };
    function findVideoElement() {
      const videos = document.querySelectorAll("video");
      if (videos.length > 0) {
        return videos[0];
      }
      return null;
    }
    function initVideoTracking() {
      videoElement = findVideoElement();
      if (!videoElement) {
        console.log("Video element not found, retrying...");
        setTimeout(initVideoTracking, 1e3);
        return;
      }
      console.log("Video element found:", videoElement);
      videoElement.addEventListener("play", handleVideoEvent);
      videoElement.addEventListener("pause", handleVideoEvent);
      videoElement.addEventListener("seeked", handleVideoEvent);
      videoElement.addEventListener("ratechange", handleVideoEvent);
      videoElement.addEventListener("timeupdate", handleTimeUpdate);
    }
    function handleVideoEvent(event) {
      if (!videoElement)
        return;
      const state = {
        currentTime: videoElement.currentTime,
        paused: videoElement.paused,
        playbackRate: videoElement.playbackRate,
        duration: videoElement.duration,
        event: event.type,
        timestamp: Date.now()
      };
      console.log("Video event:", state);
      sendStateToContentScript(state);
      lastState = state;
    }
    let lastTimeUpdate = 0;
    function handleTimeUpdate(event) {
      const now = Date.now();
      if (now - lastTimeUpdate < 5e3)
        return;
      lastTimeUpdate = now;
      handleVideoEvent(event);
    }
    function sendStateToContentScript(state) {
      window.postMessage(
        {
          type: "VIDEO_STATE",
          payload: state
        },
        "*"
      );
    }
    window.addEventListener("message", (event) => {
      if (event.source !== window)
        return;
      if (event.data.type === "SYNC_VIDEO") {
        const { currentTime, paused, playbackRate } = event.data.payload;
        console.log("Sync command received:", event.data.payload);
        if (!videoElement) {
          videoElement = findVideoElement();
        }
        if (videoElement) {
          if (Math.abs(videoElement.currentTime - currentTime) > 1) {
            videoElement.currentTime = currentTime;
          }
          if (playbackRate && videoElement.playbackRate !== playbackRate) {
            videoElement.playbackRate = playbackRate;
          }
          if (paused && !videoElement.paused) {
            videoElement.pause();
          } else if (!paused && videoElement.paused) {
            videoElement.play().catch((err) => console.error("Play failed:", err));
          }
        }
      }
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initVideoTracking);
    } else {
      initVideoTracking();
    }
  })();
})();

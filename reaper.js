"use strict";

// Keep-alive reaper. Instagram leaks a corked audio stream for every reel you
// scroll past and never closes them, so sound eventually dies. A reaped reel
// can't be restored (its MediaSource/blob pipeline is gone and Instagram won't
// rebuild a scrolled-past position), so instead of eliminating the leak we BOUND
// it: keep the most recent N reels behind the viewport alive, and reap only
// reels older than that. The audio-stream count then plateaus at ~N instead of
// climbing without limit.
//
// Reaping = pause + strip source + load(), which forces Firefox to release the
// audio stream. We leave the emptied element in place (rather than removing it)
// so Instagram's scroll layout is left undisturbed while you scroll.

const VERSION = "1.0";
const KEEP_ALIVE = 5; // reels kept alive behind the viewport

const reaped = new WeakSet();

function releaseVideo(video) {
  video.pause();
  video.removeAttribute("src");
  while (video.firstChild) {
    video.removeChild(video.firstChild);
  }
  if (video.srcObject) {
    video.srcObject = null;
  }
  video.load();
  reaped.add(video);
}

// Reap reels scrolled more than KEEP_ALIVE positions behind the viewport.
// Never touches the reel in view or reels ahead (below) — forward scroll is the
// primary direction and must stay seamless.
function reapBeyondBuffer() {
  const behind = Array.from(document.querySelectorAll("video"))
    .map((v) => ({ v, rect: v.getBoundingClientRect() }))
    .filter(({ rect }) => rect.bottom < 0) // fully above the viewport
    .sort((a, b) => b.rect.top - a.rect.top); // closest-behind first

  let count = 0;
  for (let i = KEEP_ALIVE; i < behind.length; i += 1) {
    const video = behind[i].v;
    if (!reaped.has(video)) {
      releaseVideo(video);
      count += 1;
    }
  }
  return count;
}

// --- Debug panel: hidden by default, toggled with Alt+Shift+R for testing.
// The reaper runs regardless of whether the panel is visible. ---

const panel = document.createElement("div");
panel.style.cssText = [
  "position:fixed", "bottom:16px", "left:16px", "z-index:2147483647",
  "background:#1a1a1a", "color:#eee", "font:13px/1.4 monospace",
  "padding:10px 12px", "border-radius:8px", "box-shadow:0 2px 12px rgba(0,0,0,.5)",
  "min-width:220px", "display:none"
].join(";");

const title = document.createElement("div");
title.textContent = `Reel Audio Reaper v${VERSION} (keep ${KEEP_ALIVE})`;
title.style.cssText = "font-weight:bold;margin-bottom:6px;color:#7ab8ff";

const stats = document.createElement("div");
stats.style.whiteSpace = "pre";

const button = document.createElement("button");
button.textContent = "Reap now";
button.style.cssText = [
  "margin-top:8px", "width:100%", "padding:6px",
  "background:#2d6cdf", "color:#fff", "border:0",
  "border-radius:6px", "cursor:pointer", "font:13px monospace"
].join(";");

let totalReaped = 0;
button.addEventListener("click", () => {
  totalReaped += reapBeyondBuffer();
});

panel.appendChild(title);
panel.appendChild(stats);
panel.appendChild(button);
document.body.appendChild(panel);

// Toggle the debug panel with Alt+Shift+R (event.code is keyboard-layout safe).
window.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.code === "KeyR") {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }
});

function refresh() {
  const videos = Array.from(document.querySelectorAll("video"));
  const behind = videos.filter((v) => v.getBoundingClientRect().bottom < 0).length;
  const onScreen = videos.find((v) => {
    const r = v.getBoundingClientRect();
    return r.bottom >= 0 && r.top <= window.innerHeight;
  });
  const src = onScreen
    ? (onScreen.currentSrc || onScreen.src || "(empty)")
    : "(none on screen)";
  stats.textContent =
    `videos on page: ${videos.length}\n` +
    `behind viewport: ${behind}\n` +
    `reaped total: ${totalReaped}\n` +
    `src: ${src.slice(0, 40)}`;
}

// --- Triggers: debounced on scroll (capture phase catches inner-container
// scrolling, which doesn't bubble), plus a periodic safety sweep. ---

let scrollTimer = null;
window.addEventListener(
  "scroll",
  () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      totalReaped += reapBeyondBuffer();
    }, 400);
  },
  { passive: true, capture: true }
);

setInterval(() => {
  totalReaped += reapBeyondBuffer();
}, 2000);

setInterval(refresh, 1000);
refresh();

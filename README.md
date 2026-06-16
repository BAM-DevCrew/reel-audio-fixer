# Reel Audio Fixer

A Firefox / LibreWolf extension that stops Instagram Reels from silently
killing your browser audio.

## The problem

Instagram opens a new audio stream for every Reel you scroll past — and never
closes them. They pile up as idle ("corked") streams until Firefox can't open
new ones, and your sound dies until you restart the browser. It's a real,
six-year-old bug affecting all Firefox-based browsers (Mozilla bugs
[1602345](https://bugzilla.mozilla.org/show_bug.cgi?id=1602345) and
[1851747](https://bugzilla.mozilla.org/show_bug.cgi?id=1851747)), with no
official fix.

Measured on a normal session: **~70 Reels → ~70 leaked streams**, climbing
until audio fails.

## What it does

Reel Audio Fixer **bounds** the leak. It keeps the last few Reels behind you
alive and reaps the older ones, releasing their stuck audio streams. The stream
count then plateaus instead of climbing without limit — so your sound keeps
working no matter how long you scroll.

Same session with the fix: **~70 Reels → a steady 6 streams** (the one playing
plus a 5-Reel buffer).

## How it works

- A Reel's audio stream is released by stripping its `<video>` source, which
  forces Firefox to tear the stream down.
- Reaped Reels can't be restored (Instagram drives them via MediaSource/blob
  and won't rebuild a scrolled-past Reel), so rather than reaping everything,
  the extension keeps a **keep-alive buffer**: the most recent 5 Reels behind
  the viewport stay alive for instant rewind; only older ones are reaped.
- The Reel you're watching, and any Reels ahead, are never touched — so forward
  scrolling and playback are never interrupted.

### Trade-off

If you scroll *back* more than 5 Reels, the older ones show gray and need a
reload. That's deliberate: infinite scroll is a forward experience, and a small
buffer keeps memory bounded while covering normal rewinds.

## Install

**From source (temporary, for testing):**

1. Open `about:debugging` in Firefox
2. Click **This Firefox** → **Load Temporary Add-on…**
3. Select `manifest.json` from this folder

The temporary add-on is removed when you restart Firefox. A signed release on
[addons.mozilla.org](https://addons.mozilla.org) is planned.

## Debug panel

The extension runs silently. Press **Alt + Shift + R** on an Instagram tab to
toggle a small panel showing video counts and a manual reap button — handy for
testing.

## Compatibility

Works on any Firefox-based browser that supports Firefox WebExtensions:

- Firefox (including ESR, Developer Edition, Nightly)
- LibreWolf
- Waterfox
- Mullvad Browser
- Zen Browser
- Floorp
- Tor Browser*

\*Tor Browser runs it, but installing add-ons there is discouraged — extras
can weaken anonymity.

**Not supported:** Pale Moon, Basilisk, and Waterfox Classic — these use the
older Goanna/UXP engine (XUL add-ons only) and can't run WebExtensions.

## License

[MIT](LICENSE) © 2026 BAM-DevCrew

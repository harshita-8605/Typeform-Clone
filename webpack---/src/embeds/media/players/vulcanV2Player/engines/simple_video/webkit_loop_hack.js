import { elemBind, elemUnbind } from 'utilities/elem.js';
import { cachedDetect } from 'utilities/detect.js';
import { doTimeout, clearTimeouts } from 'utilities/timeout-utils.js';
import { count } from 'utilities/metrics.js';

// On WebKit + MSE, a looping video intermittently wedges at the end of a loop:
// the playhead halts a few milliseconds short of `duration` (paused:false, fully
// buffered) and never crosses to the end, so the browser's native `<video loop>`
// seek-back never fires and it sits on the last frame forever (our waiting
// heuristic surfaces this as an endless load spinner).
//
// Root cause (packet-verified on the affected medias): our HLS packaging leaves
// the audio track a few ms longer than the video track, and the MSE `duration`
// derives from the audio end — so the last few ms before `duration` contain no
// video frames. The playhead parks exactly at the last video frame's end and,
// under decode contention (several looping videos on one page), WebKit's
// renderer fails to coast that video-frameless tail to reach `duration`. Once a
// video falls into the state it recurs every loop. The same media as a plain
// MP4 loops fine (Safari's native file path); only MSE wedges. This is the
// open hls.js "track duration mismatch" family (video-dev/hls.js#7543, #7266);
// the durable fix is packaging-side (align track ends), and this hack can be
// removed if/when the packager guarantees video reaches `duration`.
//
// We keep native loop (so normal looping stays seamless) and add a safety net
// driven by `timeupdate`: while a looping video is in the last `NEAR_END_EPSILON`
// seconds, we (re)arm a one-shot timer. During healthy playback `timeupdate`
// keeps firing and keeps pushing the timer out; if the playhead stalls,
// `timeupdate` goes silent and the armed timer fires `STUCK_THRESHOLD_MS` later,
// at which point — if we're still parked near the end with no progress — we
// restart the loop ourselves: seek to `buffered.start(0)` (NOT 0; these streams
// often have a small unbuffered head gap) and play. No standing poll — the timer
// only exists transiently in the last fraction of each loop.

const NEAR_END_EPSILON = 0.5;
const STUCK_THRESHOLD_MS = 700;

// Note: detect's `browser.webkit` is the UA *engine token*, which is also true
// on Chrome/Blink (their UA contains AppleWebKit). The stall only exists in
// real WebKit's MSE implementation, so gate on Safari/iOS specifically.
const isActuallyWebkit = (detect) => {
  return Boolean(detect.safari || detect.iphone || detect.ipad);
};

const isNearEndOfLoop = (video) => {
  if (!video || !video.loop || video.ended) {
    return false;
  }
  if (!video.duration || video.buffered.length === 0) {
    return false;
  }
  return video.duration - video.currentTime <= NEAR_END_EPSILON;
};

export const setup = (simpleVideo) => {
  if (!isActuallyWebkit(cachedDetect())) {
    return;
  }

  const timeoutKey = `${simpleVideo.uuid}.webkit_loop_recovery`;

  // Fires only if `timeupdate` went silent for STUCK_THRESHOLD_MS while parked
  // near the end of a loop — i.e. the playhead stalled and won't loop.
  const recoverIfStuck = (armedAtTime) => {
    const video = simpleVideo.video;
    if (!isNearEndOfLoop(video) || video.currentTime !== armedAtTime) {
      // looped or progressed in the meantime — nothing to do.
      return;
    }
    const target = video.buffered.start(0);
    count('player/webkit-loop-recovery', 1, {
      duration: video.duration,
      hashed_id: simpleVideo.attributes.hashedId,
      stalled_at: video.currentTime,
      url: simpleVideo.attributes.pageUrl || location.href,
    });
    simpleVideo.seek(target).then(() => simpleVideo.play());
  };

  const onTimeUpdate = () => {
    const video = simpleVideo.video;
    if (isNearEndOfLoop(video)) {
      // (Re)arm. doTimeout replaces any pending timer on the same key, so while
      // timeupdate keeps firing the recovery never runs; it only runs once
      // timeupdate stops (the stall).
      const armedAtTime = video.currentTime;
      doTimeout(timeoutKey, () => recoverIfStuck(armedAtTime), STUCK_THRESHOLD_MS);
    }
  };

  simpleVideo._webkitLoopOnTimeUpdate = onTimeUpdate;
  elemBind(simpleVideo.video, 'timeupdate', onTimeUpdate);
};

export const teardown = (simpleVideo) => {
  if (simpleVideo._webkitLoopOnTimeUpdate) {
    elemUnbind(simpleVideo.video, 'timeupdate', simpleVideo._webkitLoopOnTimeUpdate);
    clearTimeouts(`${simpleVideo.uuid}.webkit_loop_recovery`);
    simpleVideo._webkitLoopOnTimeUpdate = undefined;
  }
};

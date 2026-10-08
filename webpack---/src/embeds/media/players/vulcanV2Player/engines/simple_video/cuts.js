import { cachedDetect } from 'utilities/detect.js';
import {
  getCurrentTimeAfterCuts,
  getCuts,
  getDurationAfterCuts,
  getDurationBeforeCuts,
  getTimeAfterCuts,
  getTimeBeforeCuts,
} from './cutsCalc.js';
import { seekWithoutCuts } from './seeking.js';

const detect = cachedDetect();

export {
  getCurrentTimeAfterCuts,
  getCuts,
  getDurationAfterCuts,
  getTimeAfterCuts,
  getTimeBeforeCuts,
};

export const trimStartFromCuts = (simpleVideo) => {
  const cuts = getCuts(simpleVideo);

  if (cuts.length < 1 || cuts[0].start > 0) {
    return 0;
  }

  return cuts[0].end;
};

export const trimEndFromCuts = (simpleVideo) => {
  const cuts = getCuts(simpleVideo);
  const uncutDuration = getDurationBeforeCuts(simpleVideo);

  if (cuts.length < 1 || cuts[cuts.length - 1].end < uncutDuration) {
    return -1;
  }

  return cuts[cuts.length - 1].start;
};

export const getTrim = (simpleVideo) => {
  return {
    start: trimStartFromCuts(simpleVideo),
    end: trimEndFromCuts(simpleVideo),
  };
};

export const setCuts = (simpleVideo, cuts) => {
  simpleVideo.attributes.cuts = cuts;
  if (cuts !== simpleVideo._rawCuts) {
    simpleVideo._cuts = undefined;
    simpleVideo._rawCuts = undefined;
  }
  enforceCuts(simpleVideo);
};

const rafLoop = (fn, rafRef) => {
  if (!rafRef) {
    rafRef = { current: null };
  }

  rafRef.current = requestAnimationFrame(() => {
    const result = fn();
    if (result !== false) {
      rafLoop(fn, rafRef);
    }
  });

  return () => {
    cancelAnimationFrame(rafRef.current);
  };
};

export const enforceCuts = (simpleVideo) => {
  if (simpleVideo._stopEnforcingCuts) {
    return;
  }

  const cuts = getCuts(simpleVideo);
  if (cuts.length === 0) {
    // nothing to enforce
    return;
  }

  const startRafLoop = () => {
    stopRafLoop();
    simpleVideo._stopEnforcingCutsViaRafLoop = rafLoop(() => {
      if (simpleVideo.state.seeking || simpleVideo.video.seeking) {
        return;
      }
      enforceCutsNow(simpleVideo);
      if (!simpleVideo._stopEnforcingCutsViaRafLoop) {
        return false;
      }
    });
  };

  const stopRafLoop = () => {
    if (simpleVideo._stopEnforcingCutsViaRafLoop) {
      simpleVideo._stopEnforcingCutsViaRafLoop();
      simpleVideo._stopEnforcingCutsViaRafLoop = undefined;
    }
  };

  const unbinds = [
    simpleVideo.on('playing', startRafLoop),
    simpleVideo.on('pause', stopRafLoop),
    simpleVideo.on('ended', stopRafLoop),
    simpleVideo.on('beforeplay', stopRafLoop),
    simpleVideo.on('timeupdate', () => {
      enforceCutsNow(simpleVideo);
    }),
  ];

  simpleVideo._stopEnforcingCuts = () => {
    stopRafLoop();
    unbinds.forEach((u) => u());
    simpleVideo._stopEnforcingCuts = undefined;
  };
};

export const teardownCuts = (simpleVideo) => {
  if (simpleVideo._stopEnforcingCuts) {
    simpleVideo._stopEnforcingCuts();
    simpleVideo._stopEnforcingCuts = undefined;
  }
};

export const enforceCutsNow = (simpleVideo) => {
  if (simpleVideo.getPlaybackMode() === 'beforeplay') {
    return;
  }

  const currentTime = simpleVideo.video.currentTime;
  const cuts = getCuts(simpleVideo);
  let currentCutIndex = -1;
  const currentCut = cuts.filter((cut, index) => {
    if (cut.start <= currentTime && currentTime < cut.end && currentCutIndex < 0) {
      currentCutIndex = index;
    }

    return cut.start <= currentTime && currentTime < cut.end;
  })[0];

  const uncutDuration = getDurationBeforeCuts(simpleVideo);
  if (
    simpleVideo.state.fakeEnded &&
    getTimeAfterCuts(simpleVideo, currentTime) < getDurationAfterCuts(simpleVideo) - 0.1
  ) {
    simpleVideo.state.fakeEnded = false;
  }

  if (currentCut) {
    const effectiveEnd = getEffectiveEnd(cuts, currentCutIndex);
    if (effectiveEnd < uncutDuration - 0.1) {
      // without the fudge factor, some browsers (i.e. Firefox) may seek to the
      // _exact_ end of the cut and trigger timeupdate or raf before the time
      // has a chance to advance. But since the cut math is _inclusive_ of the
      // end, this value is still technically inside the cut, so it'll enter an
      // infinite loop trying to get _out_ of the cut.

      const nudgeTime = detect.ios.version > 0 ? 0.09 : 0.000001;
      seekWithoutCuts(simpleVideo, effectiveEnd + nudgeTime);
    } else if (!simpleVideo.state.fakeEnded) {
      simpleVideo.state.fakeEnded = true;
      if (simpleVideo.attributes.loop) {
        simpleVideo.trigger('ended');
        simpleVideo.seek(0).then(() => simpleVideo.play());
      } else {
        simpleVideo.pause();
        simpleVideo.trigger('ended');
      }
    }
  }
};

export const setTrim = (simpleVideo, settings) => {
  const { start, end } = settings;
  if (start != null) {
    if (start >= 0) {
      simpleVideo.attributes.trimStart = settings.start;
    } else {
      delete simpleVideo.attributes.trimStart;
    }
  }
  if (end != null) {
    if (end >= 0) {
      simpleVideo.attributes.trimEnd = settings.end;
    } else {
      delete simpleVideo.attributes.trimEnd;
    }
  }
  simpleVideo._cuts = undefined;

  enforceCutsNow(simpleVideo);
  enforceCuts(simpleVideo);
};

export const getEffectiveEnd = (cuts, index) => {
  if (index >= cuts.length) {
    return -1;
  }

  let lastEnd = cuts[index].end;
  for (let i = index; i < cuts.length; i += 1) {
    const c = cuts[i];
    if (c.start > lastEnd) {
      // clips are no longer consecutive, return.
      break;
    }
    if (c.start === lastEnd) {
      lastEnd = c.end;
    }
  }

  return lastEnd;
};

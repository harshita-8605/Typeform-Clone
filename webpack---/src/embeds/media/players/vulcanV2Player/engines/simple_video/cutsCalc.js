export const getDurationBeforeCuts = (simpleVideo) => {
  const attrs = simpleVideo.attributes;
  if (attrs.duration != null) {
    return attrs.duration;
  }
  if (simpleVideo.video.readyState >= 2) {
    return simpleVideo.video.duration;
  }
  return null;
};

export const getDurationAfterCuts = (simpleVideo) => {
  const cuts = getCuts(simpleVideo);
  const uncutDuration = getDurationBeforeCuts(simpleVideo);

  if (cuts.length < 1) {
    return uncutDuration;
  }

  let duration = uncutDuration;
  cuts.forEach((cut) => {
    duration -= cut.end - cut.start;
  });

  return duration;
};

export const getTimeBeforeCuts = (simpleVideo, t) => {
  const uncutDuration = getDurationBeforeCuts(simpleVideo);
  const cuts = getCuts(simpleVideo);

  let timeThatWasCutOut = 0;
  let lastCutEnd = 0;
  let expandedTime = 0;
  cuts.forEach((cut) => {
    const lastClipLength = cut.start - lastCutEnd;
    expandedTime += lastClipLength;
    if (expandedTime <= t + timeThatWasCutOut) {
      const cutLength = cut.end - cut.start;
      timeThatWasCutOut += cutLength;
      expandedTime += cutLength;
    }
    lastCutEnd = cut.end;
  });

  return Math.min(uncutDuration, t + timeThatWasCutOut);
};

export const getTimeAfterCuts = (simpleVideo, uncutCurrentTime) => {
  const cuts = getCuts(simpleVideo);

  if (cuts.length < 1) {
    return uncutCurrentTime;
  }

  let currentTime = uncutCurrentTime;

  cuts.forEach((cut) => {
    if (cut.start <= uncutCurrentTime) {
      currentTime -= Math.min(uncutCurrentTime, cut.end) - cut.start;
    }
  });

  return Math.max(0, currentTime);
};

export const getCurrentTimeAfterCuts = (simpleVideo) => {
  return getTimeAfterCuts(simpleVideo, simpleVideo.video.currentTime);
};

const EMPTY_ARR = Object.freeze([]);

export const getCuts = (simpleVideo) => {
  const { cuts: rawCuts, trimStart, trimEnd } = simpleVideo.attributes;

  if (simpleVideo._cuts && rawCuts === simpleVideo._rawCuts) {
    return simpleVideo._cuts;
  }

  if (!rawCuts && trimStart == null && trimEnd == null) {
    return EMPTY_ARR;
  }

  simpleVideo._rawCuts = rawCuts;
  simpleVideo._cuts = normalizeCuts(simpleVideo);

  const trimSettings = {
    start: simpleVideo.attributes.trimStart,
    end: simpleVideo.attributes.trimEnd,
  };

  simpleVideo._cuts = applyTrimToCuts(simpleVideo, trimSettings, simpleVideo._cuts);

  Object.freeze(simpleVideo._cuts);

  return simpleVideo._cuts;
};

// Fill in unspecified values, make sure end > start, sort by start, and ensure
// no overlapping cuts. These guarantees simplify our other functions.
const normalizeCuts = (simpleVideo) => {
  const uncutDuration = getDurationBeforeCuts(simpleVideo);
  const { cuts: rawCuts, trimStart, trimEnd } = simpleVideo.attributes;

  if (!rawCuts) {
    return [];
  }

  let cuts = rawCuts
    .map((c) => {
      const start = c.start != null ? clampCutTime(simpleVideo, c.start) : 0;
      const end = c.end != null && c.end !== -1 ? clampCutTime(simpleVideo, c.end) : uncutDuration;
      return end > start ? { start, end } : null;
    })
    .filter(Boolean);

  // support legacy trim attributes with cuts instead
  if (trimStart != null) {
    cuts.push({ start: 0, end: trimStart });
  }
  if (trimEnd != null) {
    cuts.push({ start: trimEnd, end: uncutDuration });
  }

  cuts = cuts.sort((a, b) => a.start - b.start);

  let lastCut = { start: 0, end: 0 };
  cuts = cuts
    .map((cut) => {
      // Since this is sorted, if the last cut both starts and ends before this
      // one ends, then it is a duplicate; it can be discarded.
      if (cut.end < lastCut.end) {
        return null;
      }

      // If this cut starts before the previous one ends, adjust the start so
      // they don't overlap.
      if (cut.start < lastCut.end) {
        cut.start = lastCut.end;
      }

      lastCut = cut;
      return cut;
    })
    .filter(Boolean);

  return cuts;
};

const applyTrimToCuts = (simpleVideo, settings, origCuts) => {
  const cuts = [...origCuts];
  const uncutDuration = getDurationBeforeCuts(simpleVideo);

  const { start, end } = settings;

  const firstCut = cuts[0];
  const lastCut = cuts[cuts.length - 1];
  const existingStartCut =
    firstCut && (firstCut.start === 0 || firstCut.start < 0) ? firstCut : undefined;
  const existingEndCut =
    lastCut && (lastCut.end >= uncutDuration || lastCut.end < 0) ? lastCut : undefined;

  if (start != null) {
    if (start >= 0) {
      const newCut = { start: 0, end: start };
      if (existingStartCut) {
        // replace the old one at the beginning
        cuts.splice(0, 1, newCut);
      } else {
        // add a new cut to the beginning
        cuts.unshift(newCut);
      }
    } else if (existingStartCut) {
      // start: -1 means "no trimStart", so delete it if there is one
      cuts.shift();
    }
  }

  if (end != null) {
    if (end >= 0) {
      const newCut = { start: end, end: uncutDuration };
      if (existingEndCut) {
        // replace the old one at the end
        cuts.splice(cuts.length - 1, 1, newCut);
      } else {
        // add a new cut to the end
        cuts.push(newCut);
      }
    } else if (existingEndCut) {
      // end: -1 means "no trimEnd", so delete it if there is one
      cuts.pop();
    }
  }

  return cuts;
};

const clampCutTime = (simpleVideo, t) => {
  const uncutDuration = getDurationBeforeCuts(simpleVideo);
  return Math.min(uncutDuration, Math.max(0, t));
};

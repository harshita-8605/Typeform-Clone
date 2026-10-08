import { wlog } from 'utilities/wlog.js';
import * as Helpers from './helpers.js';

const logger = wlog.getPrefixedFunctions('buffering');

const anyBuffered = (simpleVideo) => {
  const video = simpleVideo.video;
  return video.buffered.length > 0 && video.buffered.end(0) > 0;
};

const activeBufferRange = (simpleVideo) => {
  const video = simpleVideo.video;
  let currentTime = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    let start = video.buffered.start(i);
    let end = video.buffered.end(i);
    if (start <= currentTime && currentTime < end) {
      return [start, end];
    }
  }
  return null;
};

const totalBuffered = (simpleVideo) => {
  return Helpers.sumTimeRanges(simpleVideo.video.buffered);
};

const sequentialBufferedRange = (simpleVideo) => {
  const video = simpleVideo.video;
  const buffered = video.buffered;
  let startIndex = null;
  try {
    for (let i = 0; i < buffered.length; i++) {
      let start = buffered.start(i) - 0.5;
      let end = buffered.end(i) + 0.5;
      if (start <= video.currentTime && video.currentTime < end) {
        startIndex = i;
        break;
      }
    }
    if (startIndex != null) {
      let lastSequentialIndex = startIndex;
      for (let i = startIndex; i < buffered.length; i++) {
        let thisBufferStart = buffered.start(i) - 0.5;
        let lastBufferEnd = buffered.end(lastSequentialIndex) + 0.5;
        if (thisBufferStart <= lastBufferEnd) {
          lastSequentialIndex = i;
        } else {
          break;
        }
      }
      let start = buffered.start(startIndex);
      let end = buffered.end(lastSequentialIndex);
      return [start, end];
    }
    return null;
  } catch (e) {
    logger.error(e);
    return null;
  }
};

const bufferInfo = (simpleVideo, pos, maxHoleDuration) => {
  const video = simpleVideo.video;
  if (video) {
    let vbuffered = video.buffered;
    let buffered = [];
    let i;
    for (i = 0; i < vbuffered.length; i++) {
      buffered.push({ start: vbuffered.start(i), end: vbuffered.end(i) });
    }
    return Helpers.bufferedInfo(buffered, pos, maxHoleDuration);
  }
  return { len: 0, start: 0, end: 0, nextStart: undefined };
};

const lastBufferedTime = (simpleVideo, maxBufferHole) => {
  return bufferInfo(simpleVideo, simpleVideo.getCurrentTime(), maxBufferHole).end;
};

const timeBeforeEndOfBuffer = (simpleVideo, maxBufferHole) => {
  return lastBufferedTime(simpleVideo, maxBufferHole) - simpleVideo.getCurrentTime();
};

export {
  anyBuffered,
  activeBufferRange,
  totalBuffered,
  sequentialBufferedRange,
  bufferInfo,
  lastBufferedTime,
  timeBeforeEndOfBuffer,
};

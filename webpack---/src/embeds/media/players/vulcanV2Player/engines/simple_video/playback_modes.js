import { wlog } from 'utilities/wlog.js';

const logger = wlog.getPrefixedFunctions('SimpleVideo');

export const BEFORE_PLAY = 'beforeplay';
export const ENDED = 'ended';
export const PAUSED = 'paused';
export const PLAYING = 'playing';
export const UNKNOWN = 'unknown';

export const getPlaybackMode = (simpleVideo) => {
  const video = simpleVideo.video;
  try {
    if (!simpleVideo.state.hasPlayed) {
      return BEFORE_PLAY;
    }
    if (simpleVideo.state.fakeEnded || video.ended) {
      return ENDED;
    }
    if (video.paused) {
      return PAUSED;
    }
    return PLAYING;
  } catch (e) {
    logger.warn(e);
    return UNKNOWN;
  }
};

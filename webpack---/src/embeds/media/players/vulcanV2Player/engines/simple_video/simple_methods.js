import {
  elemUnbind,
  safeRequestAnimationFrame,
  elemRequestFullscreen,
  elemCancelFullscreen,
  inUserEventContext,
} from 'utilities/elem.js';
import { wlog } from 'utilities/wlog.js';
import { cachedDetect } from 'utilities/detect.js';
import { merge } from 'utilities/obj.js';
import { getTimeBeforeCuts } from './cutsCalc.js';
import { getCurrentTimeAfterCuts, getDurationAfterCuts, trimStartFromCuts } from './cuts.js';

const logger = wlog.getPrefixedFunctions('SimpleVideo');
const detect = cachedDetect();

const PLAY = 'play';
const PLAY_SILENTLY = 'play-silently';
const CANNOT_PLAY = 'cannot-play';

const providesFeedbackOnPlayFailure = () => {
  if (detect.chrome || detect.firefox || detect.edge) {
    return 'probably';
  }
  if (detect.safari || (detect.ios.version && detect.ios.version >= 12)) {
    return 'maybe';
  }
  return false;
};

export const play = (simpleVideo, options) => {
  const trimStart = trimStartFromCuts(simpleVideo);
  if (simpleVideo.state.fakeEnded || simpleVideo.video.currentTime < trimStart) {
    return simpleVideo.seek(0, { pause: false }).then((playType) => {
      return playWithoutCuts(simpleVideo, merge({}, options, { playType: PLAY }));
    });
  }
  return playWithoutCuts(simpleVideo, options);
};

export const playWithoutCuts = (simpleVideo, options = {}) => {
  const video = simpleVideo.video;
  const myPlayType = options.playType || playType(simpleVideo, options);
  if (simpleVideo.state.issuedPlay == null && myPlayType !== CANNOT_PLAY) {
    simpleVideo.state.issuedPlay = true;
  }
  return new Promise((resolve, reject) => {
    simpleVideo.state.lastPlayRejected = false;
    const playbackMode = simpleVideo.getPlaybackMode();
    logger.info('play: start', myPlayType);
    if (playbackMode === 'playing') {
      logger.info('play: already playing, resolve');
      resolve(PLAY);
    } else if (myPlayType === CANNOT_PLAY) {
      reject(new Error('Cannot issue play.'));
    } else {
      if (myPlayType === PLAY_SILENTLY) {
        simpleVideo.mute();
      }

      simpleVideo.trigger('beforeplay');
      const playPromise = video.play();
      if (playPromise && playPromise.then && playPromise.catch) {
        // Not all browsers return a promise from play(). For those that do,
        // let's reject our own promise quickly if it fails.
        playPromise
          .then(() => {
            logger.info('play: got', myPlayType, 'resolve');
            resolve(myPlayType);
          })
          .catch(async (e) => {
            logger.notice(e);

            // We mark that play() has been rejected because the browser may
            // still throw "waiting" events after this, and we want to ignore
            // them if we're not actually trying to play back the video.
            simpleVideo.state.lastPlayRejected = true;

            // Okay, the play rejected and we didn't expect that. But if we're
            // fine with silent autoplay, let's try that.
            const silentAutoplayOption =
              options.silentAutoplay != null
                ? options.silentAutoplay
                : simpleVideo.attributes.silentAutoplay;
            if (
              myPlayType === PLAY &&
              !simpleVideo.isMuted() &&
              (silentAutoplayOption === 'allow' || silentAutoplayOption == null)
            ) {
              simpleVideo.mute();
              try {
                await video.play();
                logger.info('play: got silent fallback, resolve');
                resolve(PLAY_SILENTLY);
              } catch (e) {
                simpleVideo.unmute();
                reject(e);
              }
            } else {
              logger.notice('play: rejected');
              reject(e);
            }
          });
      } else {
        setTimeout(() => {
          // a video that's trying to play will have video.paused = false, even
          // before the "playing" event fires.
          if (detect.ios.version && detect.ios.version < 10.1 && video.paused) {
            reject(new Error('Video still paused after play issued.'));
          }
        }, 10);
        // Browsers that don't return a Promise from play() go down this route.
        const onPlaying = () => {
          logger.info('play: got playing, resolve');
          resolve(myPlayType);
          return elemUnbind;
        };
        simpleVideo.bind('playing', onPlaying);
      }
    }
  });
};

export const playType = (simpleVideo, options = {}) => {
  // The logic tree could be flattened a little, but is instead split by
  // depth to try and communicate different types of decisions. The levels
  // are like:
  //
  // CONTEXT
  //   PREFERENCE
  //     CAPABILITY
  //
  // So first we decide what context we're in. Many of the contexts simplify
  // the decision tree a lot--that's why it's at the root level. Then we
  // look at the preference (for example, even if the device can autoplay
  // with sound, we might want to exclude that possibility). And last, based
  // on the viewer's situation and the customer's preference, we determine
  // what will actually happen based on the browser capabilities.
  //
  if (simpleVideo.getPlaybackMode() === 'playing') {
    // The video is already playing, so calling play() again is fine.
    return PLAY;
  }
  if (simpleVideo.isInitializingFromUnmuted()) {
    // If we're changing videos and the old video was unmuted, then this one
    // can be too.
    return PLAY;
  }
  if (inUserEventContext()) {
    // the user has clicked somewhere to make this happen; we're pretty
    // much guaranteed to be able to play, whether or not it's muted.
    return PLAY;
  }
  // this is playing without a user event, i.e. autoplay
  const attrs = simpleVideo.attributes;
  const silentAutoplay =
    options.silentAutoplay != null ? options.silentAutoplay : attrs.silentAutoplay;

  if (silentAutoplay === true) {
    if (simpleVideo.isMuted()) {
      // the video has already been muted by other means; just play.
      return PLAY;
    }
    return PLAY_SILENTLY;
  }
  if (silentAutoplay === false) {
    return PLAY;
  }
  if (silentAutoplay === 'allow' || silentAutoplay == null) {
    if (providesFeedbackOnPlayFailure() || simpleVideo.isMuted()) {
      return PLAY;
    }
    return PLAY_SILENTLY;
  }
  // the silentAutoplay value is invalid
  return PLAY;
};

export const pause = (simpleVideo) => {
  const video = simpleVideo.video;
  logger.info('pause');
  return new Promise((resolve) => {
    logger.info('pause: start');
    video.pause();
    // In Chrome, if you issue a pause before the play() promise has
    // completed, an exception will be thrown. However, the completion of
    // the play promise is not actually inline with when pause() can be
    // triggered. Waiting for the next animation frame seems to solve the
    // issue. Reevaluate later; remember that the videoElement.play() actually
    // returns a Promise on new browsers.
    safeRequestAnimationFrame(() => {
      logger.info('pause: resolve');
      resolve();
    });
  });
};

export const setCurrentTime = (simpleVideo, t) => {
  const uncutTime = getTimeBeforeCuts(simpleVideo, t);
  return setCurrentTimeWithoutCuts(simpleVideo, uncutTime);
};

export const setCurrentTimeWithoutCuts = (simpleVideo, t) => {
  logger.info('setCurrentTime', t);
  simpleVideo.video.currentTime = t;
};

export const getCurrentTime = (simpleVideo) => {
  return getCurrentTimeAfterCuts(simpleVideo);
};

export const getState = (simpleVideo) => {
  return {
    playbackMode: simpleVideo.getPlaybackMode(),
    currentTime: simpleVideo.getCurrentTime(),
    volume: simpleVideo.getVolume(),
    playbackRate: simpleVideo.getPlaybackRate(),
  };
};

export const setVolume = (simpleVideo, v) => {
  logger.info('setVolume', v);
  simpleVideo.video.volume = v;
};

export const getVolume = (simpleVideo) => {
  return simpleVideo.video.volume;
};

export const supportsPlaybackRate = (simpleVideo) => {
  return simpleVideo.video.playbackRate != null;
};

export const setPlaybackRate = (simpleVideo, r) => {
  logger.info('setPlaybackRate', r);
  if (supportsPlaybackRate(simpleVideo)) {
    simpleVideo.video.playbackRate = r;
  } else {
    logger.info('playbackRate is not supported on', simpleVideo.video);
  }
};

export const getPlaybackRate = (simpleVideo) => {
  if (supportsPlaybackRate(simpleVideo)) {
    return simpleVideo.video.playbackRate;
  }
  return 1;
};

export const getDuration = (simpleVideo) => {
  return getDurationAfterCuts(simpleVideo);
};

export const isSourceOfBrowserEvent = (simpleVideo, event) => {
  return event.target == simpleVideo.video;
};

export const isMuted = (simpleVideo) => {
  const video = simpleVideo.video;
  return !!(
    video.muted ||
    (simpleVideo.state.loadedMetadata && video.volume === 0) ||
    // A video might not have metadata downloaded until it has played, which
    // will cause it to report 0 audioTracks, which makes this check unreliable
    // before play. However, it's still useful to report that the video is
    // muted for some checks after play (e.g. rotate to fullscreen).
    (simpleVideo.state.hasPlayed && video.audioTracks && video.audioTracks.length === 0)
  );
};

export const getPreload = (simpleVideo) => {
  return simpleVideo.video.getAttribute('preload');
};

export const mute = (simpleVideo) => {
  simpleVideo.video.muted = true;
  simpleVideo.video.setAttribute('muted', 'muted');
};

export const unmute = (simpleVideo) => {
  simpleVideo.video.muted = false;
  simpleVideo.video.removeAttribute('muted');
};

export const onEnterFullscreen = (simpleVideo) => {
  simpleVideo.state.isInFullscreen = true;
  const backgroundColor = simpleVideo.attributes.backgroundColor || '#000';
  simpleVideo.video.style.backgroundColor = backgroundColor;
};

export const onLeaveFullscreen = (simpleVideo) => {
  simpleVideo.state.isInFullscreen = false;
  simpleVideo.video.style.backgroundColor = 'transparent';
  simpleVideo.setAttributes({
    fitStrategy: simpleVideo.state.fitStrategyBeforeFullscreen || 'auto',
  });
  delete simpleVideo.state.fitStrategyBeforeFullscreen;
  simpleVideo.fit();
};

export const isInitializingFromUnmuted = (simpleVideo) => {
  const state = simpleVideo.state;
  return (
    state.isInitializingFromOtherEngine && state.otherEnginePlayed && !state.otherEngineWasMuted
  );
};

export const isInFullscreen = (simpleVideo) => {
  return !!simpleVideo.state.isInFullscreen;
};

export const onWidthChange = (_simpleVideo) => {
  // do nothing
};

export const onHeightChange = (_simpleVideo) => {
  // do nothing
};

export const requestFullscreen = (simpleVideo) => {
  simpleVideo.state ||= {};
  simpleVideo.state.fitStrategyBeforeFullscreen = simpleVideo.attributes.fitStrategy;
  simpleVideo.setAttributes({ fitStrategy: 'contain' });
  simpleVideo.fit();
  return elemRequestFullscreen(simpleVideo.video);
};

export const cancelFullscreen = (simpleVideo) => {
  simpleVideo.setAttributes({
    fitStrategy: simpleVideo.state.fitStrategyBeforeFullscreen || 'auto',
  });
  simpleVideo.fit();
  return elemCancelFullscreen(simpleVideo.video);
};

export const captureCurrentFrame = (simpleVideo, ...args) => {
  const video = simpleVideo.video;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(...args);
};

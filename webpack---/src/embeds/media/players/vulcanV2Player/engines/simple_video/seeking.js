import { assign } from 'utilities/obj.js';
import { elemBind, elemUnbind } from 'utilities/elem.js';
import { wlog } from 'utilities/wlog.js';
import * as Modes from './playback_modes.js';
import { playWithoutCuts, pause } from './simple_methods.js';
import { getTimeBeforeCuts } from './cutsCalc.js';

const logger = wlog.getPrefixedFunctions('SimpleVideo');

export const seek = (simpleVideo, t, options) => {
  const uncutTime = getTimeBeforeCuts(simpleVideo, t);
  return seekWithoutCuts(simpleVideo, uncutTime, options);
};

export const seekWithoutCuts = (simpleVideo, t, options) => {
  logger.info('seek', t);
  if (simpleVideo.getPlaybackMode() === Modes.BEFORE_PLAY) {
    return seekBeforePlay(simpleVideo, t, options);
  }
  return seekNow(simpleVideo, t, options);
};

const seekBeforePlay = (simpleVideo, t, options = {}) => {
  const video = simpleVideo.video;
  logger.info('seekBeforePlay', t);
  return new Promise((resolve, reject) => {
    logger.info(`time ${t}: seek beforeplay`);

    const playingBeforeSeek = simpleVideo.getPlaybackMode() === 'playing';
    const onPlaying = (playType) => {
      logger.info(`time ${t}: jump to time after playing`);
      video.currentTime = t;
      const afterSeekActions = new Promise((resolve) => {
        if (playingBeforeSeek || options.pause === false) {
          logger.info(`time: ${t}: play after seek`);
          resolve();
        } else {
          logger.info(`time: ${t}: pause after seek`);
          pause(simpleVideo).then(resolve);
        }
      });
      whenDoneSeeking(simpleVideo)
        .then(() => {
          return afterSeekActions;
        })
        .then(() => {
          video.style.visibility = 'inherit';
          assign(simpleVideo.state, { seeking: false });
          resolve(playType);
        });
    };

    video.style.visibility = 'hidden';
    assign(simpleVideo.state, { seeking: true });
    logger.info(`time ${t}: start stream by calling play`);
    playWithoutCuts(simpleVideo)
      .then(onPlaying)
      .catch((e) => {
        video.style.visibility = 'inherit';
        assign(simpleVideo.state, { seeking: false });
        reject(e);
      });
  });
};

const seekNow = (simpleVideo, t) => {
  logger.info('seekNow', t);
  return new Promise((resolve) => {
    logger.info('seekNow: start', t);
    simpleVideo.video.currentTime = t;
    assign(simpleVideo.state, { seeking: true });
    whenDoneSeeking(simpleVideo).then(() => {
      assign(simpleVideo.state, { seeking: false });
      logger.info('seekNow: resolve', t);
      resolve();
    });
  });
};

export const seekOnPlay = (simpleVideo, t) => {
  return new Promise((resolve) => {
    if (simpleVideo.getPlaybackMode() === 'playing') {
      seekNow(simpleVideo, t).then(resolve);
    } else {
      simpleVideo.bind('playing', () => {
        seekNow(simpleVideo, t).then(resolve);
        return simpleVideo.unbind;
      });
    }
  });
};

const whenDoneSeeking = (simpleVideo) => {
  const video = simpleVideo.video;
  return new Promise((resolve) => {
    if (video.seeking) {
      logger.info('waiting for seek');
      elemBind(video, 'seeked', () => {
        logger.info('seeked');
        resolve();
        return elemUnbind;
      });
    } else {
      logger.info('no wait for seek');
      resolve();
    }
  });
};

export const isSeeking = (simpleVideo) => {
  const { state, video } = simpleVideo;
  return Boolean(state.seeking || video.seeking);
};

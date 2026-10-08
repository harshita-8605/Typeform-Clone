import { wlog } from 'utilities/wlog.js';
import { elemInDom, elemBind, elemUnbind } from 'utilities/elem.js';
import { findClosestAssetByQuality } from 'utilities/assets.js';
import * as Initialization from './initialization.js';
import * as Helpers from './helpers.js';

const logger = wlog.getPrefixedFunctions('SimpleVideo');

const getSources = (simpleVideo) => {
  const video = simpleVideo.video;
  const result = [];
  for (let i = 0; i < video.childNodes.length; i++) {
    let node = video.childNodes[i];
    if (node.nodeType === 1 && node.tagName.toLowerCase() === 'source') {
      result.push(node);
    }
  }
  return result;
};

const stopStreaming = (simpleVideo) => {
  try {
    if (simpleVideo.state.destroyed) {
      return;
    }

    logger.info('stopStreaming');
    const video = simpleVideo.video;
    video.src = `${Helpers.srcProtocolAndHost(video.getAttribute('src'))}/tiny.mp4`;
    video.load();
  } catch (e) {
    logger.notice(e);
  }
};

const changeQuality = (simpleVideo, quality, autoPlay, reload) => {
  const assets = simpleVideo.selectableAssets();
  const asset = findClosestAssetByQuality(assets, quality);
  if (simpleVideo.getPlaybackMode() === 'beforeplay') {
    changeStreamWithoutLoad(simpleVideo, asset);
    return Promise.resolve();
  }
  return changeStream(simpleVideo, asset, autoPlay, reload);
};

const changeStreamWithoutLoad = (simpleVideo, asset) => {
  logger.info('changeStreamWithoutLoad', asset && asset.slug, asset);
  const video = simpleVideo.video;
  if (!elemInDom(video)) {
    return;
  }
  const src = Helpers.properAssetUrl(asset.url, asset.container);
  simpleVideo.state = { eventContext: simpleVideo.state.eventContext };
  simpleVideo._currentAsset = asset;
  video.src = src;
  const sources = getSources(simpleVideo);
  if (sources.length > 0) {
    sources[0].src = src;
  }
};

const changeStream = (simpleVideo, asset, autoPlay = true, reload = false) => {
  logger.info('changeStream', autoPlay, reload, asset && asset.slug, asset);
  const video = simpleVideo.video;
  simpleVideo.asset = asset;
  return new Promise((resolve) => {
    const src = Helpers.properAssetUrl(asset.url, asset.container);
    if (!reload && src === video.getAttribute('src')) {
      resolve();
      return;
    }

    const stateBeforeSwitch = simpleVideo.getState();

    simpleVideo.state.seeking = true;
    elemBind(video, 'loadstart', async () => {
      if (reload) {
        video.style.visibility = 'visible';
        simpleVideo.state.seeking = false;
        resolve();
      } else if (stateBeforeSwitch.currentTime > 2) {
        await simpleVideo.seek(stateBeforeSwitch.currentTime);
        if (stateBeforeSwitch.playbackMode === 'playing') {
          await simpleVideo.play();
          simpleVideo.state.seeking = false;
          video.style.visibility = 'visible';
          resolve();
        } else {
          await simpleVideo.pause();
          video.style.visibility = 'visible';
          simpleVideo.state.seeking = false;
          resolve();
        }
      } else {
        if (stateBeforeSwitch.playbackMode === 'playing') {
          simpleVideo.play();
        }
        video.style.visibility = 'visible';
        simpleVideo.state.seeking = false;
        resolve();
      }
      simpleVideo.setPlaybackRate(stateBeforeSwitch.playbackRate);
      return elemUnbind;
    });
    video.style.visibility = 'hidden';
    changeStreamWithoutLoad(simpleVideo, asset, reload);
    if (!(stateBeforeSwitch.playbackMode === 'beforeplay' || autoPlay)) {
      simpleVideo.play();
    }
  });
};

const isChangingVideo = (simpleVideo) => {
  return !!simpleVideo.state.isChangingVideo;
};

const changeVideo = (simpleVideo, mediaData, attributes) => {
  teardownBeforeChangeVideo(simpleVideo);
  simpleVideo.state.isChangingVideo = true;
  initAfterChangeVideo(simpleVideo, mediaData, attributes);
  return new Promise((resolve) => {
    changeStream(simpleVideo, simpleVideo.defaultAsset()).then(() => {
      simpleVideo.state.isChangingVideo = false;
      resolve();
    });
  });
};

const teardownBeforeChangeVideo = (simpleVideo) => {
  const eventContext = simpleVideo.state.eventContext;
  simpleVideo.destroy();

  // we preserve the event context because this is relevant to both the old
  // video and the new video. If we want to play() or something immediately
  // after replace, this needs to be accurate.
  simpleVideo.state.eventContext = eventContext;
};

const initAfterChangeVideo = (simpleVideo, mediaData, attributes) => {
  Initialization.setupProperties(simpleVideo, mediaData, attributes);
  Initialization.setupBindingsAndLoops(simpleVideo, simpleVideo.allAssets, attributes);
};

export {
  stopStreaming,
  changeQuality,
  changeStreamWithoutLoad,
  changeStream,
  changeVideo,
  initAfterChangeVideo,
  isChangingVideo,
  teardownBeforeChangeVideo,
};

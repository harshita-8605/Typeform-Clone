import { wlog } from 'utilities/wlog.js';

const logger = wlog.getPrefixedFunctions('SimpleVideo');

const onReady = (simpleVideo) => {
  const video = simpleVideo.video;
  if (simpleVideo.state == null) {
    simpleVideo.state = {};
  }
  const state = simpleVideo.state;
  if (state.onReadyPromise) {
    return state.onReadyPromise;
  }
  state.onReadyPromise = new Promise((resolve) => {
    if (state.hasBeenReady) {
      resolve();
    } else {
      if (video.readyState >= 2) {
        // The video might be past where it will fire "loadstart", in which
        // case we should just mark it ready ASAP.
        logger.info('ready readyState', video.src, video.readyState);
        state.hasBeenReady = true;
        resolve();
      } else {
        // The video will respond to @play() immediately after loadstart fires.
        // Otherwise it'll be ignored or error out.
        const onLoadStart = () => {
          logger.info('ready loadstart');
          state.hasBeenReady = true;
          resolve();
        };
        simpleVideo.bind('loadstart', onLoadStart);
      }

      // There are rare occasions where loadstart does not fire. This ensures that after 200ms re consider ourselves ready.
      // For instance, on iOS apps in WKWebViews a user generated call to play is required for the `load` to occur.
      // The problem with this is that we won't try to play until we are ready, so we're in a catch 22.
      // This fix should ensure that we can eventually try and play
      setTimeout(() => {
        if (!state.hasBeenReady) {
          state.hasBeenReady = true;
          resolve();
        }
      }, 200);
    }
  });
  return state.onReadyPromise;
};

export { onReady };

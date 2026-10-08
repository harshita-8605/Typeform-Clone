import { elemAppend } from 'utilities/elem.js';
import * as Helpers from './helpers.js';
import * as CustomStateTracking from './custom_state_tracking.js';
import * as WaitingEvents from './waiting_events.js';
import * as RelayEvents from './relay_events.js';
import * as WebkitLoopHack from './webkit_loop_hack.js';
import { enforceCuts, teardownCuts } from './cuts.js';

export const setupProperties = (simpleVideo, mediaData, attributes) => {
  let allAssets = mediaData.assets;
  if (allAssets.length === 0) {
    // other video types that use MSE might pass in an empty array here since
    // they will be handling all the video src stuff on their own.
    allAssets = [{}];
  }

  simpleVideo.mediaData = mediaData;
  simpleVideo.allAssets = allAssets;
  simpleVideo.attributes = attributes;
};

export const injectVideo = (simpleVideo) => {
  simpleVideo._currentAsset = simpleVideo.defaultAsset();
  simpleVideo.video = Helpers.createElement(
    simpleVideo.uuid,
    simpleVideo._currentAsset,
    simpleVideo.attributes,
  );

  // Chrome fires the loadstart callback synchronously when appended to the
  // DOM, so we'll miss it unless we seed it here.
  simpleVideo.onReady();

  elemAppend(simpleVideo.root, simpleVideo.video);
};

export const fromOtherEngine = (simpleVideo, otherEngine) => {
  const wasMuted = otherEngine.isMuted();
  const issuedPlay = otherEngine.hasIssuedPlay();

  if (otherEngine.mediaData.mediaType === 'Audio') {
    injectVideo(simpleVideo);
  } else {
    simpleVideo.video = otherEngine.getMediaElement();
  }

  simpleVideo.onReady();
  simpleVideo.bind('loadstart', () => {
    setTimeout(() => {
      simpleVideo.state.isInitializingFromOtherEngine = false;
    }, 0);
    return simpleVideo.unbind;
  });
  Helpers.setupVideoElemAttributes(
    simpleVideo.video,
    simpleVideo.defaultAsset(),
    simpleVideo.attributes,
  );

  Helpers.setupVideoElemStyles(simpleVideo.video, simpleVideo.attributes);

  simpleVideo.state.eventContext = otherEngine.eventContext();
  simpleVideo.root.appendChild(simpleVideo.video);
  simpleVideo._currentAsset = simpleVideo.defaultAsset();
  simpleVideo.changeStreamWithoutLoad(simpleVideo.defaultAsset());
  simpleVideo.state.isInitializingFromOtherEngine = true;
  simpleVideo.state.otherEngineWasMuted = wasMuted;
  simpleVideo.state.otherEnginePlayed = issuedPlay;
  simpleVideo.video.load();
};

export const setupBindingsAndLoops = (simpleVideo) => {
  WaitingEvents.setup(simpleVideo);
  enforceCuts(simpleVideo);
  RelayEvents.setup(simpleVideo);
  WebkitLoopHack.setup(simpleVideo);

  // it's important for this to go last because it sets values like
  // `lastTimePosition` based on the current values in the global event loop.
  // Other functions that depend on those values from the previous run (like
  // WaitingEvents) should run before it.
  CustomStateTracking.setup(simpleVideo);
};

export const killBindingsAndStopLoops = (simpleVideo) => {
  RelayEvents.teardown(simpleVideo);
  teardownCuts(simpleVideo);
  CustomStateTracking.teardown(simpleVideo);
  WaitingEvents.teardown(simpleVideo);
  WebkitLoopHack.teardown(simpleVideo);
};

import { assign } from 'utilities/obj.js';
import { globalEventLoop } from 'utilities/event_loop.js';

const DEFAULT_EVENT_LOOP_DURATION = 300;

const getEventLoopDuration = (simpleVideo) => {
  const attrs = simpleVideo.attributes;
  const baseEventLoopDuration =
    attrs.eventLoopDuration != null ? attrs.eventLoopDuration : DEFAULT_EVENT_LOOP_DURATION;
  return baseEventLoopDuration / simpleVideo.getPlaybackRate();
};

const setup = (simpleVideo) => {
  if (simpleVideo.state == null) {
    simpleVideo.state = {};
  }

  if (simpleVideo.getPlaybackMode() === 'playing') {
    simpleVideo.state.hasPlayed = true;
  }
  simpleVideo.bind('playing', () => {
    simpleVideo.state.hasPlayed = true;
  });
  simpleVideo.bind('waiting', () => {
    simpleVideo.state.gotWaiting = true;
  });
  simpleVideo.bind('loadedmetadata', () => {
    simpleVideo.state.loadedMetadata = true;
  });

  assign(simpleVideo.state, {
    lastPlaybackMode: simpleVideo.getPlaybackMode(),
    lastTimePosition: simpleVideo.getCurrentTime(),
    lastEventLoopDuration: getEventLoopDuration(simpleVideo),
  });

  const eventLoopKey = `${simpleVideo.uuid}.custom_state_and_events`;
  globalEventLoop.add(eventLoopKey, getEventLoopDuration(simpleVideo), () => {
    assign(simpleVideo.state, {
      lastTimePosition: simpleVideo.getCurrentTime(),
      lastPlaybackMode: simpleVideo.getPlaybackMode(),
      lastEventLoopDuration: getEventLoopDuration(simpleVideo),
    });

    // the interval can change if playback rate changes.
    globalEventLoop.interval(eventLoopKey, getEventLoopDuration(simpleVideo));
  });
};

const teardown = (simpleVideo) => {
  const eventLoopKey = `${simpleVideo.uuid}.custom_state_and_events`;
  globalEventLoop.remove(eventLoopKey);
};

export { setup, teardown };

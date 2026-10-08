import { assign } from 'utilities/obj.js';
import { elemBind, elemUnbind } from 'utilities/elem.js';
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

  simpleVideo.state.waiting = -1;

  const eventLoopKey = `${simpleVideo.uuid}.waiting_events`;
  globalEventLoop.add(eventLoopKey, getEventLoopDuration(simpleVideo), () => {
    maybeTriggerWaiting(simpleVideo);
    globalEventLoop.interval(eventLoopKey, getEventLoopDuration(simpleVideo));
  });
};

const teardown = (simpleVideo) => {
  const eventLoopKey = `${simpleVideo.uuid}.waiting_events`;
  globalEventLoop.remove(eventLoopKey);
};

const maybeTriggerWaiting = (simpleVideo) => {
  const video = simpleVideo.video;
  const state = simpleVideo.state;
  const lastPlaybackMode = state.lastPlaybackMode;
  const isTryingToPlay =
    (state.gotWaiting && simpleVideo.getPlaybackMode() === 'beforeplay') ||
    simpleVideo.getPlaybackMode() === 'playing';
  const eligibleToTriggerWaiting =
    lastPlaybackMode === 'playing' ||
    (lastPlaybackMode === 'beforeplay' && !state.lastPlayRejected);
  const loopDuration = state.lastEventLoopDuration || getEventLoopDuration(simpleVideo);

  if (isTryingToPlay && eligibleToTriggerWaiting) {
    // the video wants to be playing
    if (simpleVideo.getCurrentTime() === state.lastTimePosition) {
      // but the playhead isn't moving
      const startedWaitingAt = state.startedWaitingAt;
      if (startedWaitingAt) {
        // we're already in a waiting state
        state.waiting = (new Date().getTime() - startedWaitingAt) / 1000;
        simpleVideo.trigger('custom-waiting', state.waiting);
      } else {
        // we're just entering a waiting state
        assign(state, {
          startedWaitingAt: new Date().getTime() - loopDuration,
          waiting: loopDuration / 1000,
        });
        simpleVideo.trigger('custom-waiting', loopDuration / 1000);
        elemBind(video, 'timeupdate', () => {
          finishWaitingLoop(simpleVideo);
          return elemUnbind;
        });
      }
    } else {
      finishWaitingLoop(simpleVideo);
    }
  } else {
    finishWaitingLoop(simpleVideo);
  }
};

const finishWaitingLoop = (simpleVideo) => {
  const prevWaiting = simpleVideo.state.waiting;
  assign(simpleVideo.state, {
    waiting: -1,
    startedWaitingAt: null,
  });
  if (prevWaiting != null && prevWaiting >= 0) {
    simpleVideo.trigger('custom-done-waiting', prevWaiting);
  }
};

export { maybeTriggerWaiting, setup, teardown };

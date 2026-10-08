import { elemBind, elemUnbind } from 'utilities/elem.js';

const VIDEO_DOM_EVENTS = [
  'beforeplay',
  'canplay',
  'canplaythrough',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'volumechange',
  'timeupdate',
  'waiting',
  'webkitbeginfullscreen',
  'webkitendfullscreen',
  'webkitplaybacktargetavailabilitychanged',
];

const setup = (simpleVideo) => {
  for (let i = 0; i < VIDEO_DOM_EVENTS.length; i++) {
    let eventType = VIDEO_DOM_EVENTS[i];
    ((video, eventType) => {
      let fnKey = `_marshalEvent_${eventType}`;
      simpleVideo[fnKey] =
        simpleVideo[fnKey] ||
        ((event) => {
          if (simpleVideo.state == null) {
            simpleVideo.state = {};
          }
          // We have special logic for the "playing" event because, if play() is
          // rejected in Desktop Safari, the "playing" event still fires, but
          // video.paused is true. Since the video isn't actually playing, this
          // seems like a bug to me (although it does apparently cause data to load).
          if (eventType !== 'playing' || (eventType === 'playing' && !video.paused)) {
            simpleVideo.state.eventContext = event;
            simpleVideo.trigger(eventType, event);
            simpleVideo.state.eventContext = null;
          }
        });
      elemBind(video, eventType, simpleVideo[fnKey]);
    })(simpleVideo.video, eventType);
  }
};

const teardown = (simpleVideo) => {
  for (let i = 0; i < VIDEO_DOM_EVENTS.length; i++) {
    let eventType = VIDEO_DOM_EVENTS[i];
    let fnKey = `_marshalEvent_${eventType}`;
    elemUnbind(simpleVideo.video, eventType, simpleVideo[fnKey]);
  }
};

export { setup, teardown };

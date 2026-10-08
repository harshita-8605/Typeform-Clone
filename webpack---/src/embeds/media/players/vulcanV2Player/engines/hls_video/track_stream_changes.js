import Hls from 'hls.js';
import { wlog } from 'utilities/wlog.js';
import { makeCacheable, uncacheNamespace, makeNamespace } from 'utilities/cacheable.js';

const logger = wlog.getPrefixedFunctions('hls_video');
const cacheable = makeCacheable('track_stream_changes');
const ns = makeNamespace('track_stream_changes');

export const setup = (hlsVideo) => {
  const hls = hlsVideo.hls;

  ns(hlsVideo).lastLevel = null;
  ns(hlsVideo).lastAutoLevel = null;
  ns(hlsVideo).substreamIndex = 0;

  const onFragChanged = cacheable(hlsVideo, 'onFragChanged', () => {
    return (event, data) => {
      // Ignore fragments that belong to the current stream, unless we
      // switched from/to adaptive.
      if (
        data.frag.level === hlsVideo._lastLevel &&
        data.frag.autoLevel == hlsVideo._lastAutoLevel
      ) {
        return;
      }

      const level = hlsVideo.hls.levels[data.frag.level];

      ns(hlsVideo).lastLevel = data.frag.level;
      ns(hlsVideo).lastAutoLevel = data.frag.autoLevel;
      ns(hlsVideo).substreamIndex += 1;

      if (data.frag.level >= 0) {
        logger.notice('frag switch to', level, 'at', hlsVideo.getCurrentTime());
      } else {
        logger.notice('frag switch to Auto at', hlsVideo.getCurrentTime());
      }
    };
  });
  hls.off(Hls.Events.FRAG_CHANGED, onFragChanged);
  hls.on(Hls.Events.FRAG_CHANGED, onFragChanged);

  const onAudioSwitching = cacheable(hlsVideo, 'onAudioSwitching', () => {
    return (event, data) => {
      hlsVideo.trigger('audiostreamchange');
      if (data.id > 0) {
        logger.notice('audio asset switch to track: ', data.id, 'at', hlsVideo.lastBufferedTime());
      } else {
        logger.notice('level switch to original encoded audio at', hlsVideo.lastBufferedTime());
      }
    };
  });

  hls.off(Hls.Events.AUDIO_TRACK_SWITCHING, onAudioSwitching);
  hls.on(Hls.Events.AUDIO_TRACK_SWITCHING, onAudioSwitching);

  const onLevelSwitching = cacheable(hlsVideo, 'onLevelSwitching', () => {
    return (_eventName, data) => {
      if (data.level >= 0) {
        const level = hlsVideo.hls.levels[data.level];
        logger.notice('level switch to', level, 'at', hlsVideo.lastBufferedTime());
      } else {
        logger.notice('level switch to Auto at', hlsVideo.lastBufferedTime());
      }
    };
  });
  hls.off(Hls.Events.LEVEL_SWITCHING, onLevelSwitching);
  hls.on(Hls.Events.LEVEL_SWITCHING, onLevelSwitching);
};

export const teardown = (hlsVideo) => {
  if (ns(hlsVideo).onFragChanged && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.FRAG_CHANGED, ns(hlsVideo).onFragChanged);
  }
  if (ns(hlsVideo).onLevelSwitch && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.LEVEL_SWITCHING, ns(hlsVideo).onLevelSwitching);
  }
  uncacheNamespace('track_stream_changes', hlsVideo);
};

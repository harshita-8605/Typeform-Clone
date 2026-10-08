import Hls from 'hls.js';
import { doTimeout, clearTimeouts } from 'utilities/timeout-utils.js';
import { clone, merge, eachDeep } from 'utilities/obj.js';
import { wlog } from 'utilities/wlog.js';
import * as Metrics from 'utilities/metrics.js';
import { makeCacheable, uncacheNamespace, makeNamespace } from 'utilities/cacheable.js';

const cacheable = makeCacheable('error_handling');
const ns = makeNamespace('error_handling');
const logger = wlog.getPrefixedFunctions('hls error_handling');
let fatalErrorCount = 0;

export const setup = (hlsVideo) => {
  const onError = cacheable(hlsVideo, 'onError', () => {
    return (event, data) => {
      onHlsError(hlsVideo, event, data);
    };
  });
  hlsVideo.hls.on(Hls.Events.ERROR, onError);

  const onEmergencyAbortLoad = cacheable(hlsVideo, 'onEmergencyAbortLoad', () => {
    return () => {
      tryStartLoadAtDifferentTimeouts(hlsVideo);
    };
  });
  hlsVideo.hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, onEmergencyAbortLoad);
};

const onHlsError = (hlsVideo, event, data) => {
  if (data.fatal) {
    handleFatalError(hlsVideo, event, data);
  }

  const metricName = `player/hlsjs/error/${data.details}`;
  countMetric(hlsVideo, metricName, sanitizeErrorData(data));
};

// Sanitize the error data to remove any sensitive info, including asset urls
const sanitizeErrorData = (data = {}) => {
  return {
    errorType: data.type,
    errorDetails: data.details,
    fatal: data.fatal,
    reason: data.reason,
    responseCode: data.response != null ? data.response.code : undefined,
  };
};

const handleFatalError = (hlsVideo, event, data) => {
  const hls = hlsVideo.hls;
  const attrs = hlsVideo.attributes;
  fatalErrorCount += 1;
  let timeAtStall;
  let recoveryTimeout;

  switch (data.type) {
    case Hls.ErrorTypes.MEDIA_ERROR:
      wlog.info('hlsjsplugin - Fatal media error encountered, try to recover');
      if (!ns(hlsVideo).countedRecoverMediaError) {
        ns(hlsVideo).countedRecoverMediaError = true;
        countMetric(hlsVideo, 'player/hls/recover_media_error');
      }

      // If the video is being replaced inPlace, this _impl might not be
      // the active one, but it shares <video> with the new impl. In that
      // case, _don't_ try to recover because we might accidentally put
      // the old stream on the new video.
      if (!hlsVideo.isChangingVideo()) {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          hls.startLoad();
        }
      }

      logger.error('trying to recover from media error...');
      timeAtStall = hlsVideo.getCurrentTime();

      if (fatalErrorCount === 3) {
        clearTimeouts(`${hlsVideo.uuid}.nudge_if_not_playing`);
        // destroyHls (not hls.destroy()) so hlsVideo.hls doesn't point at a
        // destroyed instance, which throws on any hls property access.
        hlsVideo.destroyHls();
        hlsVideo.trigger('fatalerrorrebuild');
      } else {
        hls.recoverMediaError();
        recoveryTimeout =
          attrs.bufferStallRecoveryTimeout != null ? attrs.bufferStallRecoveryTimeout : 1000;
        doTimeout(
          `${hlsVideo.uuid}.nudge_if_not_playing`,
          () => {
            if (hlsVideo.getPlaybackMode() !== 'playing') {
              logger.error('trying to nudge 0.5 seconds...');
              hlsVideo.seek(hlsVideo.getCurrentTime() + 0.5).then(() => {
                hlsVideo.play();
              });
            } else if (hlsVideo.getCurrentTime() !== timeAtStall) {
              logger.error('video is playing; recoverMediaError() succeeded');
            }
          },
          recoveryTimeout,
        );
      }
      break;

    default:
      // Increment the number of overall playback errors as well as the more specific count for HLS fatal errors
      countMetric(hlsVideo, 'player/playback-error');

      // send all fatals, including live, here.
      countMetric(hlsVideo, 'player/hls/fatal', {
        errorType: data.type,
        errorDetails: data.details,
        errorInfo: sanitizeErrorData(data),
      });
      wlog.info('hlsjsplugin - Fatal error - cannot recover', event, data); // destroyHls (not hls.destroy()) so hlsVideo.hls doesn't point at a
      // destroyed instance, which throws on any hls property access.
      hlsVideo.destroyHls();
      break;
  }
};

const START_LOAD_TIMEOUTS = [100, 500, 1500, 3000, 6000];
const tryStartLoadAtDifferentTimeouts = (hlsVideo) => {
  const startLoad = () => {
    const hls = hlsVideo.hls;
    if (hls) {
      hls.startLoad();
    }
  };
  for (let i = 0; i < START_LOAD_TIMEOUTS.length; i++) {
    let duration = START_LOAD_TIMEOUTS[i];
    doTimeout(`${hlsVideo.uuid}.hls.start_load_on_stall_${duration}`, startLoad, duration);
  }
};

const URL_BEARING_KEYS = ['url', 'src', 'currentSrc', '_url', 'baseurl'];

const scrubUrls = (payload) => {
  eachDeep(payload, (_value, _path, parent, key) => {
    if (parent != null && key != null && URL_BEARING_KEYS.includes(key)) {
      delete parent[key];
    }
  });
  return payload;
};

const countMetric = (hlsVideo, metricName, metricData) => {
  metricData = scrubUrls(
    clone(diagnosticData(hlsVideo, merge({ at: hlsVideo.getCurrentTime() }, metricData))),
  );

  if (hlsVideo.attributes.liveMedia) {
    Metrics.count(`live_stream/${metricName}`, 1, metricData);
  }

  Metrics.count(metricName, 1, metricData);
  markReported(hlsVideo, metricName);
};

const markReported = (hlsVideo, metricName) => {
  countOnceInit(hlsVideo);
  ns(hlsVideo).metricsCounted[metricName] = true;
};

const countOnceInit = (hlsVideo) => {
  if (ns(hlsVideo).metricsCounted == null) {
    ns(hlsVideo).metricsCounted = {};
  }
};

const diagnosticData = (hlsVideo, extraData = {}) => {
  const result = { hlsVideo: hlsVideo.diagnosticData() };
  result.locationHref = location.href;
  if (top !== self) {
    result.referrer = document.referrer;
    result.inIframe = true;
  }
  return merge(result, extraData);
};

export const teardown = (hlsVideo) => {
  if (ns(hlsVideo).onError && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.ERROR, ns(hlsVideo).onError);
  }

  if (ns(hlsVideo).onEmergencyAbortLoad && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.ERROR, ns(hlsVideo).onEmergencyAbortLoad);
  }

  uncacheNamespace('error_handling', hlsVideo);
};

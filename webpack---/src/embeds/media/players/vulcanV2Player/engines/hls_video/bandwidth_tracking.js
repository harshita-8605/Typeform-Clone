import Hls from 'hls.js';
import { makeCacheable, uncacheNamespace, makeNamespace } from 'utilities/cacheable.js';
import { setOrGet } from 'utilities/legacyLocalstorage.js';

const cacheable = makeCacheable('bandwidth_tracking');
const ns = makeNamespace('bandwidth_tracking');

export const setup = (hlsVideo) => {
  const hls = hlsVideo.hls;

  const persistBandwidthEstimate = cacheable(hlsVideo, 'persistBandwidthEstimate', () => {
    return () => {
      const estimate = hls.abrController.bwEstimator.getEstimate();

      setOrGet('hls.bandwidth_estimate', estimate);
    };
  });

  hls.off(Hls.Events.FRAG_LOADED, persistBandwidthEstimate);
  hls.on(Hls.Events.FRAG_LOADED, persistBandwidthEstimate);
};

export const teardown = (hlsVideo) => {
  if (ns(hlsVideo).persistBandwidthEstimate && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.FRAG_LOADED, ns(hlsVideo).persistBandwidthEstimate);
  }
  uncacheNamespace('bandwidth_tracking', hlsVideo);
};

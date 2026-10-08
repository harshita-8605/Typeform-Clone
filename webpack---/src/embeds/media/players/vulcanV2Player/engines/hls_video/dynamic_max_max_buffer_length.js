import Hls from 'hls.js';
import { wlog } from 'utilities/wlog.js';
import { makeCacheable, uncacheNamespace, makeNamespace } from 'utilities/cacheable.js';

const logger = wlog.getPrefixedFunctions('hls_video');
const cacheable = makeCacheable('dynamic_max_max_buffer');
const ns = makeNamespace('dynamic_max_max_buffer');

export const setup = (hlsVideo) => {
  const hls = hlsVideo.hls;
  const onFragLoaded = cacheable(hlsVideo, 'onFragLoaded', () => {
    return () => {
      updateMaxMaxBufferLength(hlsVideo);
    };
  });
  hls.off(Hls.Events.FRAG_LOADED, onFragLoaded);
  hls.on(Hls.Events.FRAG_LOADED, onFragLoaded);
};

const updateMaxMaxBufferLength = (hlsVideo) => {
  const hls = hlsVideo.hls;

  if (hlsVideo.attributes.maxMaxBufferLength) {
    hls.config.maxMaxBufferLength = hlsVideo.attributes.maxMaxBufferLength;
  }

  const asset = hls.levels[hls.currentLevel];
  // We can't reliably support this asset.
  if (
    asset &&
    hls.abrController.bwEstimator.getEstimate() * hls.config.abrBandWidthFactor <
      asset.attrs.BANDWIDTH
  ) {
    // If the viewer has chosen an asset they can't support, or we're
    // already on the lowest quality asset we have available, allow
    // buffering ahead all the way to the end.
    if (hls.manualLevel >= 0 || hls.currentLevel === 0) {
      logger.info('set maxMaxBufferLength', hlsVideo.getDuration());
      hls.config.maxMaxBufferLength = hlsVideo.getDuration();
    } else {
      logger.info('set maxMaxBufferLength', 60);
      hls.config.maxMaxBufferLength = 60;
    }
  }
};

export const teardown = (hlsVideo) => {
  if (ns(hlsVideo).onFragLoaded && hlsVideo.hls) {
    hlsVideo.hls.off(Hls.Events.FRAG_LOADED, ns(hlsVideo).onFragLoaded);
  }
  uncacheNamespace('dynamic_max_max_buffer', hlsVideo);
};

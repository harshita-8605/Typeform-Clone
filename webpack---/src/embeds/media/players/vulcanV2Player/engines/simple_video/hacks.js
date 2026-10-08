import { cachedDetect } from 'utilities/detect.js';
import { wlog } from 'utilities/wlog.js';

const detect = cachedDetect();
const logger = wlog.getPrefixedFunctions('SimpleVideo');

export const fixWebkitControlsBug = (simpleVideo) => {
  const video = simpleVideo.video;
  if (detect.browser.webkit) {
    logger.info('fixWebkitControlsBug');
    const prevValue = video.getAttribute('controls');
    video.setAttribute('controls', 'controls');
    video.removeAttribute('controls');
    if (prevValue != null) {
      video.setAttribute('controls', prevValue);
    }
  }
};

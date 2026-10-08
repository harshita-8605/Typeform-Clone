import { elemStyle, elemWidth, elemHeight } from 'utilities/elem.js';
import { originalAspect, videoAspect } from 'utilities/assets.js';
import { cachedDetect } from 'utilities/detect.js';

const detect = cachedDetect();

const onWidthChange = (simpleVideo, width) => {
  simpleVideo.setAttributes({ width });
  return fit(simpleVideo);
};

const onHeightChange = (simpleVideo, height) => {
  simpleVideo.setAttributes({ height });
  return fit(simpleVideo);
};

const CONTAIN = 'contain';
const COVER = 'cover';
const FILL = 'fill';

const fit = (simpleVideo) => {
  const fitStrategy = simpleVideo.attributes.fitStrategy || getDefaultStrategy(simpleVideo);

  if (fitStrategy === CONTAIN) {
    return contain(simpleVideo);
  }

  if (fitStrategy === COVER) {
    return cover(simpleVideo);
  }

  if (fitStrategy === FILL) {
    return fill(simpleVideo);
  }

  return contain(simpleVideo);
};

const getDefaultStrategy = (simpleVideo) => {
  const actualHeight = simpleVideo.attributes.height;
  const actualWidth = simpleVideo.attributes.width;
  const ogAspect = originalAspect(simpleVideo.allAssets);
  const expectedWidth = actualHeight * ogAspect;
  const expectedHeight = Math.floor(actualWidth / ogAspect / 2) * 2;
  const heightDiff = Math.abs(expectedHeight - actualHeight);
  const widthDiff = Math.abs(expectedWidth - actualWidth);
  const firefox36Plus = detect.firefox && detect.browser.mozilla && detect.browser.version >= 36;

  if (!detect.browser.webkit && !firefox36Plus) {
    return CONTAIN;
  }

  if (heightDiff > 0 && heightDiff <= 10 && widthDiff > 0 && widthDiff <= 10) {
    // Pretty dang close; let's stretch to fit.
    return FILL;
  }
  return CONTAIN;
};

const cover = (simpleVideo) => {
  const video = simpleVideo.video;
  const mediaAspect = videoAspect(simpleVideo.allAssets);
  const rootWidth = elemWidth(simpleVideo.root);
  const rootHeight = elemHeight(simpleVideo.root);
  const browserAspect = rootWidth / rootHeight;

  // object fit only works on images in Edge. In those instances
  // we need to take another approach for our cover strategy
  if (detect.edge) {
    // object-fit: contain with a video. We set the video as large as possible
    // so it fills the space. 1920x1088 is the largest possible video size in
    // IE11.
    if (browserAspect <= mediaAspect) {
      elemStyle(video, {
        height: '100%',
        left: '50%',
        objectFit: 'contain',
        position: 'relative',
        top: '50%',
        transform: 'translate(-50%,-50%)',
        width: '1920px',
      });
    } else {
      elemStyle(video, {
        height: '1088px',
        left: '50%',
        objectFit: 'contain',
        position: 'relative',
        top: '50%',
        transform: 'translate(-50%,-50%)',
        width: '100%',
      });
    }
  } else {
    elemStyle(video, { objectFit: 'cover' });
  }
};

const contain = (simpleVideo) => {
  const video = simpleVideo.video;

  const containStyle = {
    height: '100%',
    width: '100%',
  };

  containStyle.objectFit = 'contain';

  elemStyle(video, containStyle);
};

const fill = (simpleVideo) => {
  const video = simpleVideo.video;

  const fillStyle = {
    height: '100%',
    width: '100%',
  };

  fillStyle.objectFit = 'fill';

  elemStyle(video, fillStyle);
};

export { onWidthChange, onHeightChange, fit };

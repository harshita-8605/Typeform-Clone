import { elemFromObject } from 'utilities/elem.js';
import { Url } from 'utilities/url.js';
import { isBakeryUrl } from 'utilities/assets.js';
import { eV1Protocol, eV1HostWithPort, deliveryHost } from 'utilities/hosts.js';

const BLANK_IMAGE = `${eV1Protocol()}//${eV1HostWithPort()}/assets/images/blank.gif`;

export const createElement = (id, asset, attributes) => {
  const videoObject = {
    tagName: 'video',
    id,
    crossorigin: 'anonymous',
    style: {
      background: 'transparent',
      display: 'block',
      height: '100%',
      maxHeight: 'none',
      maxWidth: 'none',
      position: 'static',
      visibility: 'visible',
      width: '100%',
    },
  };

  if (attributes.isWebComponentPlayer) {
    videoObject.style.aspectRatio = attributes.aspectRatio || 'auto';

    // This is a hack to fix the issue with the live media player where there are black bars on the right
    // and bottom edges of the video. This was currently being solved with style overrides on the live page itself,
    // but those styles don't penetrate Aurora's shadow DOM. These black bars are baked into the video stream itself,
    // so it is not a styling issue of the player.
    // This scale increase is the minimum amount needed to remove the black bars. Hopefully temporary until the video stream is fixed.
    // https://wistia.slack.com/archives/C09NUJY7WMP -- #live-20251024-black_border_in_live_vods
    if (attributes.liveMedia === true) {
      videoObject.style.transform = 'scale(1.003)';
    }
  }

  return setupVideoElemAttributes(elemFromObject(videoObject), asset, attributes);
};

const setupAttribute = (videoElem, name, val) => {
  if (val != null && val !== false) {
    if (val === true) {
      videoElem[name] = true;
      videoElem.setAttribute(name, '');
    } else {
      videoElem[name] = val;
      videoElem.setAttribute(name, val);
    }
  } else {
    videoElem[name] = false;
    videoElem.removeAttribute(name);
  }
};

// when coming from another engine, we need to update the aspect-ratio of the underlying video element
// for <wistia-player/> embeds
export const setupVideoElemStyles = (videoElem, attributes) => {
  if (attributes.isWebComponentPlayer) {
    videoElem.style.aspectRatio = attributes.aspectRatio || 'auto';
  }
};

export const setupVideoElemAttributes = (videoElem, asset, attributes) => {
  if (attributes.poster) {
    videoElem.poster = attributes.poster;
    videoElem.setAttribute('poster', attributes.poster);
    // Setting a small poster image is affecting the size of the player in Chrome in certain
    // flex environments.
    // We're testing removing this in the web component player first, but we should be able
    // to remove it completely as long as no issues pop up from that smaller amount of usage.
  } else if (!attributes.isWebComponentPlayer) {
    videoElem.poster = BLANK_IMAGE;
    videoElem.setAttribute('poster', BLANK_IMAGE);
  }

  setupAttribute(videoElem, 'aria-label', attributes.name || 'Video');
  setupAttribute(videoElem, 'src', properAssetUrl(asset.url));
  setupAttribute(videoElem, 'controlslist', attributes.controlslist || 'nodownload');
  setupAttribute(videoElem, 'playsinline', attributes.playsinline);
  setupAttribute(videoElem, 'muted', attributes.muted);
  setupAttribute(videoElem, 'loop', attributes.loop);
  setupAttribute(videoElem, 'controls', attributes.controls != null ? attributes.controls : false);
  setupAttribute(videoElem, 'preload', attributes.preload || 'none');
  setupAttribute(videoElem, 'type', inferTypeAttribute(asset, attributes));
  setupAttribute(
    videoElem,
    'x-webkit-airplay',
    attributes.webkitAirplay != null ? attributes.webkitAirplay : 'allow',
  );

  if (attributes.volume != null) {
    videoElem.volume = attributes.volume;
  }

  if (attributes.disablePictureInPicture) {
    setupAttribute(videoElem, 'disablePictureInPicture', attributes.disablePictureInPicture);
  }

  if (attributes.playbackRate != null) {
    videoElem.playbackRate = attributes.playbackRate;
  }

  return videoElem;
};

export const inferTypeAttribute = (asset, attributes) => {
  if (attributes.contentType != null) {
    return attributes.contentType;
  }

  let result = `video/${asset.ext}`;
  if (attributes.spherical) {
    result += ';dimension=360;';
  }
  return result;
};

export const srcProtocolAndHost = (src) => {
  if (isBakeryUrl(src)) {
    const srcUrl = new Url(src);
    if (srcUrl.protocol) {
      return `${srcUrl.protocol}//${srcUrl.host}`;
    }
  }
  return `${eV1Protocol()}//${deliveryHost(eV1Protocol())}`;
};

export const tinyMp4Url = (src) => {
  return `${srcProtocolAndHost(src)}/tiny.mp4`;
};

export const sumTimeRanges = (timeRanges) => {
  if (timeRanges == null) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < timeRanges.length; i++) {
    sum += timeRanges.end(i) - timeRanges.start(i);
  }
  return sum;
};

export const bufferedInfo = (buffered, pos, maxHoleDuration) => {
  let buffered2 = [];
  // bufferStart and bufferEnd are buffer boundaries around current video position
  let bufferLen;
  let bufferStart;
  let bufferEnd;
  let bufferStartNext;
  let i;
  // sort on buffer.start/smaller end (IE does not always return sorted buffered range)
  buffered.sort((a, b) => {
    let diff = a.start - b.start;
    if (diff) {
      return diff;
    }
    return b.end - a.end;
  });
  // there might be some small holes between buffer time range
  // consider that holes smaller than maxHoleDuration are irrelevant and build another
  // buffer time range representations that discards those holes
  for (i = 0; i < buffered.length; i++) {
    let buf2len = buffered2.length;
    if (buf2len) {
      let buf2end = buffered2[buf2len - 1].end;
      // if small hole (value between 0 or maxHoleDuration ) or overlapping (negative)
      if (buffered[i].start - buf2end < maxHoleDuration) {
        // merge overlapping time ranges
        // update lastRange.end only if smaller than item.end
        // e.g.  [ 1, 15] with  [ 2,8] => [ 1,15] (no need to modify lastRange.end)
        // whereas [ 1, 8] with  [ 2,15] => [ 1,15] ( lastRange should switch from [1,8] to [1,15])
        if (buffered[i].end > buf2end) {
          buffered2[buf2len - 1].end = buffered[i].end;
        }
      } else {
        // big hole
        buffered2.push(buffered[i]);
      }
    } else {
      // first value
      buffered2.push(buffered[i]);
    }
  }
  for (i = 0, bufferLen = 0, bufferStart = bufferEnd = pos; i < buffered2.length; i++) {
    let start = buffered2[i].start;
    let end = buffered2[i].end;
    // logger.log('buf start/end:' + buffered.start(i) + '/' + buffered.end(i));
    if (pos + maxHoleDuration >= start && pos < end) {
      // play position is inside this buffer TimeRange, retrieve end of buffer position and buffer length
      bufferStart = start;
      bufferEnd = end;
      bufferLen = bufferEnd - pos;
    } else if (pos + maxHoleDuration < start) {
      bufferStartNext = start;
      break;
    }
  }
  return { len: bufferLen, start: bufferStart, end: bufferEnd, nextStart: bufferStartNext };
};

export const properAssetUrl = (src, ext = 'mp4') => {
  if (isBakeryUrl(src)) {
    if (/\.bin$/.test(src)) {
      return `${src.replace(/\.bin$/, '')}/file.${ext}`;
    }
    return src;
  }
  return src;
};

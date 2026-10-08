import { clone, merge, select, except, only, sort } from 'utilities/obj.js';
import { Url } from 'utilities/url.js';
import { cachedDetect } from 'utilities/detect.js';
import * as Hosts from 'utilities/hosts.js';
import { wlog } from 'utilities/wlog.js';
import { appHostname } from '../appHostname.js';
import { isStackedAlphaAsset } from './stackedAlphaAssets.ts';

const aps = Array.prototype.slice;

export const FAILED = -1;
export const QUEUED = 0;
export const PROCESSING = 1;
export const READY = 2;

// Advanced sorting and filtering so we can be expressive and concise when
// choosing assets.
const FILTER_KEYS = ['select', 'sortFn', 'sortBy', 'unique'];
export const filter = (assets, options = {}) => {
  // there was an issues in the uploader + notPlayablePlayer flow where we
  // occasionally asked to filter assets when we didn't have any. If we
  // don't have assets just gtfo
  if (!assets) {
    return [];
  }
  // We started out passing the whole mediaData object here, but we only
  // operate on assets, and that's more convenient for filtering result sets
  // multiple times. This if continues to allow mediaData to be passed in.
  if (assets.assets) {
    assets = assets.assets;
  }

  // Transparent (stacked alpha) renditions only make sense to the alpha video engine, which
  // asks for them by name. Keep them out of every other asset query so they never show up
  // in quality menus, downloads, fallbacks or the public `assets()` API.
  if (!options.includeStackedAlpha) {
    assets = assets.filter((asset) => !isStackedAlphaAsset(asset));
  }
  options = except(options, ['includeStackedAlpha']);

  // If qualityMin/qualityMax are specified, filtered the assets with those
  // before doing anything else. That's because those aren't set directly on
  // the assets; rather, it is a computed value for each asset.
  if (options.qualityMin != null || options.qualityMax != null) {
    assets = withinQualityRange(assets, options.qualityMin, options.qualityMax);
    options = except(options, ['qualityMin', 'qualityMax']);
  }

  const filterOptions = only(options, FILTER_KEYS);
  const selectFn = filterOptions.select || except(options, FILTER_KEYS);

  if (selectFn) {
    filterOptions.select = selectFn;
  }

  let result = filterOptions.select ? select(assets, filterOptions.select) : clone(assets);

  if (filterOptions.sortFn || filterOptions.sortBy) {
    result = sort(result, filterOptions.sortFn || filterOptions.sortBy);
  }

  // If "unique" is given, it means we only want the first asset with that
  // property. We can leverage sortBy and select to meaningfully order the
  // assets, essentially letting us choose which one is unique.
  if (filterOptions.unique) {
    const uniqHash = {};
    for (let i = 0; i < result.length; i++) {
      let asset = result[i];
      let bucket = asset[`${filterOptions.unique}`] || '__undefined__';
      if (!uniqHash[bucket]) {
        uniqHash[bucket] = asset;
      }
    }
    result = [];
    for (let k in uniqHash) {
      result.push(uniqHash[k]);
    }
  }

  return result;
};

export const one = (assets, options) => {
  return filter(assets, options)[0] || null;
};

export const readyPublicMp3s = (assets) => {
  return filter(assets, {
    ext: 'mp3',
    status: READY,
    public: true,
  });
};

export const readyPublicMp4s = (assets) => {
  return filter(assets, {
    container: 'mp4',
    status: READY,
    public: true,
  });
};

export const readyPublicM3u8s = (assets) => {
  return filter(assets, {
    container: 'm3u8',
    status: READY,
    public: true,
  });
};

export const filterOver400 = (assets) => {
  const result = [];
  for (let i = 0; i < assets.length; i++) {
    let a = assets[i];
    let vbitrateInRange =
      a.opt_vbitrate != null && a.opt_vbitrate >= 500 && a.opt_vbitrate <= 100000;
    let widthInRange = a.width != null && a.width > 400;
    if (vbitrateInRange || widthInRange) {
      result.push(a);
    }
  }
  return result;
};

export const readyPublicOver400 = (assets) => {
  return filterOver400(
    filter(assets, {
      container: /mp4/,
      public: true,
      status: READY,
    }),
  );
};

export const nonfailedPublicOver400 = (assets) => {
  return filterOver400(
    filter(assets, {
      container: /mp4/,
      public: true,
      status: (s) => {
        return s !== FAILED;
      },
    }),
  );
};

export const withinQualityRange = (assets, qualityMin = 100, qualityMax = 10000) => {
  return filter(assets, {
    select: (asset) => {
      // quality is based on width * height, and given back in a format like
      // 720, 1080, 3840, etc.
      const quality = numericSizeSnapped(asset.width, asset.height);
      return qualityMin <= quality && quality <= qualityMax;
    },
  });
};

export const numericSizeSnapped = (width, height) => {
  if (height > width) {
    // let's mathematically rotate vertical videos when determining their
    // snapped size.
    const tmpWidth = width;
    width = height;
    height = tmpWidth;
  }

  const aspectRatio = width / height;

  // If given a square video, expand the width so we'll name it as if
  // it's 16:9 with the given height.
  if (aspectRatio < 1.05) {
    width = height * (16 / 9);
  }

  if (width >= 3740) {
    return 2160;
  }
  if (width >= 3100) {
    return 1800;
  }
  if (width >= 2460) {
    return 1440;
  }
  if (width >= 1820) {
    return 1080;
  }
  if (width >= 1180) {
    return 720;
  }
  if (width >= 860) {
    return 540;
  }
  if (width >= 540) {
    return 360;
  }

  return height;
};

// Expect that assets are a subset of assets that we are allowed to select.
// This function does not have any special logic to filter only selectable
// assets.
export const findClosestAssetByQuality = (assets, quality) => {
  let height;
  if (quality === '4k') {
    height = 2160;
  } else {
    // '360p' yields 360, '1080i' yields 1080, etc.
    height = parseInt(quality, 10);
  }

  const exactMatch = withinQualityRange(assets, height, height)[0];
  if (exactMatch) {
    return exactMatch;
  }

  const surroundingAssets = nearestOutsideRange(assets, height, height);
  if (surroundingAssets.length === 1) {
    return surroundingAssets[0];
  }
  const aspect = videoAspect(assets);
  const width = Math.round(aspect * height);
  const [lowerAsset, upperAsset] = surroundingAssets;
  const lowerDiff = Math.abs(lowerAsset.width - width);
  const upperDiff = Math.abs(upperAsset.width - width);
  if (lowerDiff < upperDiff) {
    return lowerAsset;
  }
  return upperAsset;
};

export const still = (assets) => {
  let stillAsset = one(assets, {
    type: /^still_image$/,
    sortBy: 'created_at desc',
  });

  // If no still is associated, check for channel artwork
  if (!stillAsset) {
    stillAsset = channelArtworkStill(assets);
  }

  // If no still or channel art is associated, generate from the first video asset
  // we can find.
  if (!stillAsset) {
    stillAsset = one(assets, { container: /mp4/, sortBy: 'width desc' });
  }

  return stillAsset;
};

export const channelArtworkStill = (assets) => {
  return one(assets, {
    type: /^channel_still_image$/,
    sortBy: 'created_at desc',
  });
};

export const thumbnailAssets = (assets, options) => {
  if (options.stillUrl) {
    return [{ height: null, url: options.stillUrl, width: null }];
  }

  const stillAsset = still(assets);
  if (options.instantHlsStillAsset != null && (!stillAsset || /mp4/.test(stillAsset.container))) {
    return [options.instantHlsStillAsset];
  }

  if (options.originalFileStillAsset != null && (!stillAsset || /mp4/.test(stillAsset.container))) {
    return [options.originalFileStillAsset];
  }

  if (!stillAsset) {
    return [];
  }

  const stillAspect = stillAsset.width / stillAsset.height;
  return [320, 640, 960, 1280, 1920, 3840].map((width) => {
    const height = Math.round(width / stillAspect);
    const url = stillUrl(assets, { videoWidth: width, videoHeight: height, playButton: false });
    return { height, url, width };
  });
};

const FAST_HOSTNAME = appHostname('fast');
export const stillUrl = (assets, options = {}) => {
  const stillAsset = still(assets);

  // @TODO should this throw an error instead?
  if (!stillAsset) return;

  if (stillAsset.status !== READY) {
    // occasionally we might get a stillAsset that isn't ready, but its
    // channel art is for an audio! fallback to that first!
    const channelArtwork = channelArtworkStill();
    if (channelArtwork && channelArtwork.status === READY) {
      return channelArtwork.url;
    }

    return `//${FAST_HOSTNAME}/assets/images/blank.gif`;
  }

  options = merge(
    {
      aspect: stillAsset.width / stillAsset.height || 1, // default to square if we can't determine the aspect
      stillUrl: stillAsset.url,
      playButton: false,
      playerColor: options.playerColor || '636155',
      videoWidth: stillAsset.width || 640,
      videoHeight: stillAsset.height || 360,
      stillSnap: true,
    },
    options,
  );

  let stillWidth = options.videoWidth;
  let stillHeight = options.videoHeight;
  const result = new Url(options.stillUrl);

  if (options.retina) {
    result.params.image_play_button_size = '2x';
    stillWidth *= 2;
    stillHeight *= 2;
  }

  // By default, we snap to a pre-generated still size
  if (options.stillSnap) {
    stillWidth = getStillWidth({
      videoWidth: stillWidth,
      stillAssetWidth: stillAsset.width || 640, // there have been times where we fail to have proper width returned
    });

    stillHeight = Math.round(stillWidth / options.aspect);
  }

  // Don't do anything special if this is not a Wistia hosted image.
  if (!isBakeryUrl(options.stillUrl)) {
    return options.stillUrl;
  }

  if (options.protocol === 'https:') {
    result.protocol = 'https:';
    // Under normal circumstances, the host for assets should depend on the
    // environment – but if you're using the embedHost option to use non-prod
    // code with prod embeds, we force using a prod host.
    result.host =
      options.embedHost === Hosts.PROD_FAST_HOSTNAME_COM ||
      options.embedHost === Hosts.PROD_FAST_HOSTNAME_NET
        ? Hosts.PROD_SSL_EMBED_HOST
        : Hosts.SSL_EMBED_HOST;
  }

  result.params.image_crop_resized = `${stillWidth}x${stillHeight}`;

  if (options.playButton == null || options.playButton) {
    result.params.image_play_button_rounded = 1;
    result.params.image_play_button_color = `${`${options.playerColor}`.replace(/^#+/, '')}e0`;
  }

  if (options.ext) {
    result.ext(options.ext);
  }

  // if the extension has not been transformed, default to a jpg
  if (result.ext() === 'bin') {
    result.ext('jpg');
  }

  return result.absolute();
};

// We only make three sizes of a thumbnail for a given video: 1280, 960, and
// 640 wide. We have logic on the server that matches this as well. The idea
// is that since we only use these three, we can generate them beforehand so
// they're always ready and automatic for the people.
export const getStillWidth = (options) => {
  const potentialStillWidths = [640, 960, 1280, 1920, 3840];

  // We also have a still that's the exact width of the one they uploaded
  // or generated (so long as it is less than 3840px across)
  if (options.stillAssetWidth < 3840) {
    potentialStillWidths.push(options.stillAssetWidth);
  }

  // We don't create thumbnails that are larger than the stillAssetWidth,
  // so eliminate anything that's larger than that, because it's wasteful to
  // scale up an image past it's original size!
  const availableStillWidths = [];
  for (let i = 0; i < potentialStillWidths.length; i++) {
    let width = potentialStillWidths[i];
    if (width <= options.stillAssetWidth) {
      availableStillWidths.push(width);
    }
  }

  // sort the widths in place.
  availableStillWidths.sort((a, b) => {
    return a - b;
  });

  // Use the still that's equal to or slightly larger than the size of the
  // video embed.
  for (let i = 0; i < availableStillWidths.length; i++) {
    let width = availableStillWidths[i];
    if (options.videoWidth <= width) {
      return width;
    }
  }

  // Can't find one that fits? Let's use the biggest available width.
  return Math.max(...availableStillWidths);
};

export const BAKERY_HOSTS = [
  Hosts.EMBED_HOST,
  Hosts.SSL_EMBED_HOST,
  appHostname('embed'),
  appHostname('prime'),
  appHostname('mixergy-cdn'),
  appHostname('embed-fastly'), // XXX: akamai test
  Hosts.PROD_EMBED_HOST,
  Hosts.PROD_SSL_EMBED_HOST,
  Hosts.PROD_FASTLY_SSL_HOST,
];

// Check if a given url is like embed.wistia.com, embed-ssl.wistia.com,
// prime.wistia.com, etc.
export const isBakeryUrl = (rawUrl) => {
  if (rawUrl == null) {
    return false;
  }
  const url = new Url(rawUrl);
  if (!url.host) {
    return false;
  }
  return BAKERY_HOSTS.join(',').indexOf(url.host) >= 0;
};

// Asset urls in media data end in `.bin`; the same delivery is also served under other
// extensions as siblings, e.g. `deliveries/<id>.m3u8` is the rendition's own HLS manifest
// and `deliveries/<id>.jpg` a still. (Not to be confused with the `/file.<ext>` download
// form the engines' properAssetUrl helpers build.) Urls that don't end in `.bin` are
// returned untouched.
export const assetUrlWithExtension = (assetUrl, extension) => {
  if (assetUrl == null) {
    return assetUrl;
  }
  return assetUrl.replace(/\.bin$/, `.${extension}`);
};

export const onePublicReadyWithContainer = (assets, type, options) => {
  options = merge(
    {
      container: type,
      public: true,
      status: READY,
    },
    options,
  );

  return one(assets, options);
};

export const hasAnyReadyHdrAssets = (assets) => {
  return assets.some(
    (asset) =>
      asset.type === 'hdr_video' &&
      asset.status === READY &&
      asset.public &&
      asset.container === 'mp4',
  );
};

export const mp4 = (assets, options) => {
  return onePublicReadyWithContainer(assets, 'mp4', options);
};

export const webm = (assets, options) => {
  return onePublicReadyWithContainer(assets, 'webm', options);
};

export const m3u8 = (assets, options) => {
  return onePublicReadyWithContainer(assets, 'm3u8', options);
};

export const original = (assets) => {
  return one(assets, { type: 'original' });
};

// If we support webm, prefer webm (since VP9 codec is better), otherwise
// use mp4 (h264)
export const playable = (assets, options, detect = cachedDetect()) => {
  if (detect.video.webm) {
    return webm(assets, options) || mp4(assets, options);
  }
  return mp4(assets, options);
};

export const videoAspect = (assets) => {
  const asset = mp4(assets) || m3u8(assets) || webm(assets) || original(assets);
  if (asset && asset.height) {
    return asset.width / asset.height;
  }
  // no assets available; use default aspect 1.6667
  return 640 / 360;
};

export const originalAspect = (assets) => {
  const derivativeAspect = videoAspect(assets);
  const asset = original(assets);
  if (asset && asset.width && asset.height) {
    const candidateAspect = asset.width / asset.height;
    if (
      (candidateAspect > 1 && derivativeAspect < 1) ||
      (candidateAspect < 1 && derivativeAspect > 1)
    ) {
      // the original is rotated relative to its derivatives
      return 1 / candidateAspect;
    }
    return candidateAspect;
  }
  return derivativeAspect;
};

export const iphone = (assets, options) => {
  const aspect = videoAspect(assets);
  if (aspect > 1) {
    options = merge({ width: 640 }, options);
    return mp4(assets, options) || smallestNormalMp4(assets, options);
  }
  const opt1 = merge({ width: 320 }, options);
  const opt2 = merge({ width: 640 }, options);
  return mp4(assets, opt1) || mp4(assets, opt2) || smallestNormalMp4(assets, options);
};

export const smallestNormalMp4 = (assets, options) => {
  options = merge({ sortBy: 'width asc', width: [640, 1920] }, options);
  return mp4(assets, options);
};

export const urlWithCorrectHost = (assetUrl, proto = Hosts.eV1Protocol()) => {
  const parsedUrl = new Url(assetUrl);
  if (isBakeryUrl(assetUrl)) {
    if (proto === 'https:') {
      parsedUrl.host = Hosts.deliveryHost(location.protocol);
      parsedUrl.protocol = 'https:';
    } else {
      parsedUrl.host = Hosts.deliveryHost(location.protocol);
      parsedUrl.protocol = 'http:';
    }
  }
  return parsedUrl.absolute();
};

// It is possible for our customers to give us quality ranges that are
// impossible to solve for a given video. In these cases, we want to instead
// use the assets that are closest to satisfying their constraints. For
// example, if they specify 4k and we only go up to 1080p, it'll use 1080p.
// Or if they specify a range _between_ two, say 800p to 900p, it'll use the
// two surrounding values: 720p and 1080p.
export const nearestOutsideRange = (assets, lower, upper) => {
  if (assets.length === 0) {
    return [];
  }

  const sortedAssets = aps.call(assets).sort((a, b) => {
    return numericSizeSnapped(a.width, a.height) - numericSizeSnapped(b.width, b.height);
  });

  let lowerAsset;
  let upperAsset;
  for (let i = 0; i < sortedAssets.length; i++) {
    let asset = sortedAssets[i];
    let assetSize = numericSizeSnapped(asset.width, asset.height);
    if (assetSize < lower) {
      lowerAsset = asset;
    }
    if (assetSize >= upper) {
      upperAsset = asset;
      break;
    }
  }

  // get rid of nulls
  const result = [];
  if (lowerAsset) {
    result.push(lowerAsset);
  }
  if (upperAsset) {
    result.push(upperAsset);
  }

  // If somehow we didn't end up with any assets, don't fail completely, but
  // let us know.
  if (result.length === 0) {
    wlog.error('nearestOutsideRange: no nearby assets found, using first in list', sortedAssets[0]);
    result.push(sortedAssets[0]);
  }

  return result;
};

// This operates on the array in-place
export const moveToFront = (assets, toFront) => {
  if (!toFront) {
    return assets;
  }

  let index = -1;
  for (let i = 0; i < assets.length; i++) {
    let asset = assets[i];
    if (asset.url === toFront.url) {
      index = i;
      break;
    }
  }

  // If it's -1, it wasn't found. If it's 0, it's already in front.
  if (index > 0) {
    assets.splice(index, 1);
    assets.unshift(toFront);
  }

  return assets;
};

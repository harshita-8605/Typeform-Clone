import { nearestOutsideRange, withinQualityRange, numericSizeSnapped } from 'utilities/assets.js';
import { filter, getDeep } from 'utilities/obj.js';
import { uncacheNamespace, makeNamespace } from 'utilities/cacheable.js';
import * as HlsAssets from './hls_assets.js';

const a2l = makeNamespace('asset_to_level');
const l2a = makeNamespace('level_to_asset');

export const UNOBTAINABLE_BITRATE = 99999999999;

const getDeliveryId = (assetUrl) => {
  if (!assetUrl) {
    return;
  }

  const result = assetUrl.match(/deliveries\/(.*?)(?=\.)/);

  if (result && result[1]) {
    return result[1];
  }
  return undefined;
};

export const assetToLevel = (hlsVideo, asset) => {
  return deliveryUrlToLevel(hlsVideo, asset.url);
};

export const deliveryUrlToLevel = (hlsVideo, url) => {
  const id = getDeliveryId(url);
  let cachedLevel;
  if ((cachedLevel = a2l(hlsVideo)[id]) != null) {
    return cachedLevel;
  }

  if (!hlsVideo.hls || !hlsVideo.hls.levels) {
    return -1;
  }

  // Find the hlsjs representation of the selected
  // asset by url and return it's hlsjs 'level'. The adaptive
  // asset's url won't match anything in @hls.levels, so the
  // indexOf call will result in -1. This happens to also be the
  // level that triggers hlsjs's adaptive mode. Too sneaky?
  const levelObject = filter(hlsVideo.hls.levels, (level) => {
    const levelId = getDeliveryId(level.url[0]);
    return levelId === id;
  })[0];

  const level = hlsVideo.hls.levels.indexOf(levelObject);

  if (levelObject) {
    a2l(hlsVideo)[id] = level;
  }

  return level;
};

export const averageOrMaxBitrate = (hlsAsset) => {
  if (hlsAsset.attrs.AVERAGE_BANDWIDTH) {
    return Number(hlsAsset.attrs.AVERAGE_BANDWIDTH);
  }
  return maxBitrateForAsset(hlsAsset);
};

export const maxBitrateForAsset = (hlsAsset) => {
  if (hlsAsset.attrs.BANDWIDTH) {
    return Number(hlsAsset.attrs.BANDWIDTH);
  }
  return undefined;
};

export const bestStartingLevel = (hlsVideo) => {
  // First, we should try and get he best level based on bandwidth (taking into account
  // things like qualityMin/qualityMax/videoWidth)
  // If we can't get one, then just use hls' autoLevelCapping, which is based on qualityMin/qualityMax/videoWidth
  // lastly, just take the best if nothing else works
  if (startingLevelBasedOnBandwidthEstimate(hlsVideo)) {
    return startingLevelBasedOnBandwidthEstimate(hlsVideo);
  }
  if (hlsVideo.hls.autoLevelCapping !== -1) {
    return hlsVideo.hls.autoLevelCapping;
  }
  return hlsVideo.hls.levels.length - 1;
};

export const canSupportAsset = (hlsVideo, level) => {
  return weightedBwUpEstimate(hlsVideo) > Number(hlsVideo.hls.levels[level].attrs.BANDWIDTH);
};

// Reject assets outside our desired quality range.
export const filteredHlsAssets = (engine, assets) => {
  let filteredAssets = assets;
  const { qualityMin, qualityMax } = engine.attributes;
  if (qualityMin > 0) {
    filteredAssets = HlsAssets.rejectAudioAsset(engine, filteredAssets);
  }

  const assetsWithinRange = withinQualityRange(filteredAssets, qualityMin, qualityMax);
  if (assetsWithinRange.length > 0) {
    filteredAssets = assetsWithinRange;
  } else {
    filteredAssets = nearestOutsideRange(filteredAssets, qualityMin, qualityMax);
  }

  return filteredAssets;
};

export const highestSupportedHlsAssetLevel = (hlsVideo) => {
  const supportedAssets = hlsVideo.hls.levels.filter((asset, index) => {
    return canSupportAsset(hlsVideo, index);
  });

  return supportedAssets.length - 1 || 0;
};

export const levelToAsset = (hlsVideo, levelNumber) => {
  let cachedAsset;

  if ((cachedAsset = l2a(hlsVideo)[levelNumber]) != null) {
    return cachedAsset;
  }

  const url = getDeep(hlsVideo.hls.levels, [levelNumber, 'url', 0]);
  const levelDeliveryId = getDeliveryId(url);
  const asset = filter(hlsVideo.allAssets, (asset) => {
    if (asset.url) {
      const assetId = getDeliveryId(asset.url);
      return levelDeliveryId === assetId;
    }
  })[0];

  l2a(hlsVideo)[levelNumber] = asset;

  return asset;
};

export const startLoadOnce = (engine, startPosition = -1) => {
  if (!engine.attributes.calledStartLoad) {
    engine.onReady().then(() => {
      engine.hls.startLoad(startPosition);
    });
    engine.setAttributes({ calledStartLoad: true });
  }
};

export const startingLevelBasedOnBandwidthEstimate = (hlsVideo) => {
  const { qualityMin = 100, qualityMax = 10000, bwEstimateOnInit } = hlsVideo.attributes;

  if (!bwEstimateOnInit || !hlsVideo.hls.levels) {
    return undefined;
  }

  let startingLevel;
  const maxLevel = hlsVideo.hls.autoLevelCapping || hlsVideo.hls.levels.length - 1;

  for (let index = 0; index <= maxLevel; index++) {
    const element = hlsVideo.hls.levels[index];
    const bitrate = averageOrMaxBitrate(element);
    const quality = numericSizeSnapped(element.width, element.height);

    // qualityMin is checked here because autoLevelCapping only works against the max asset level
    // qualityMax is also checked here just as an insurance policies in case autoLevelCapping is not defined
    if (
      qualityMin <= quality &&
      quality <= qualityMax &&
      bitrate < UNOBTAINABLE_BITRATE &&
      bitrate < bwEstimateOnInit * hlsVideo.abrBandWidthUpFactor()
    ) {
      startingLevel = index;
    }
  }

  return startingLevel;
};

export const stopLoad = (engine) => {
  engine.hls.stopLoad();
  engine.setAttributes({ calledStartLoad: false });
};

export const teardown = (hlsVideo) => {
  uncacheNamespace('level_to_asset', hlsVideo);
  uncacheNamespace('asset_to_level', hlsVideo);
};

export const weightedBwUpEstimate = (hlsVideo) => {
  return hlsVideo.hls.abrController.bwEstimator.getEstimate() * hlsVideo.abrBandWidthUpFactor();
};

import Hls from 'hls.js';
import { findClosestAssetByQuality } from 'utilities/assets.js';

const DefaultAbrController = Hls.DefaultConfig.abrController;

// This CustomAbrController is used for one purpose, to ensure that the
// 'Auto' asset in hls.js playback respects the `qualityMin` and `qualityMax`
// Embed Options. When the `nextAutoLevel` or `autoLevelCapping` value is set
// we will check to ensure it is within the `qualityMin` and `qualityMax` range.
// If not, we will find the closest possible within that range.
export default class CustomAbrController extends DefaultAbrController {
  #autoLevelCapping;

  constructor(hls) {
    super(hls);
    this.hls = hls;
  }

  // Please see https://github.com/video-dev/hls.js/issues/4824
  // on whether this is truly necessary
  get autoLevelCapping() {
    return this.#getClosestLevelWithinRange(this.#autoLevelCapping);
  }

  set autoLevelCapping(level) {
    this.#autoLevelCapping = level;
  }

  get nextAutoLevel() {
    return this.#getClosestLevelWithinRange(super.nextAutoLevel);
  }

  set nextAutoLevel(level) {
    super.nextAutoLevel = level;
  }

  destroy() {
    super.destroy();
  }

  #getClosestLevelWithinRange(level) {
    if (!this.hls.levels || this.hls.levels.length === 0) {
      return level;
    }

    const qualityMin = this.hls.config.qualityMin || 0;
    const qualityMax = this.hls.config.qualityMax || 5000;

    const qualityMinAsset = findClosestAssetByQuality(this.hls.levels, qualityMin);
    const minLevel = this.hls.levels.indexOf(qualityMinAsset);

    const qualityMaxAsset = findClosestAssetByQuality(this.hls.levels, qualityMax);
    const maxLevel = this.hls.levels.indexOf(qualityMaxAsset);

    if (level > maxLevel) {
      return maxLevel;
    }

    if (level < minLevel) {
      return minLevel;
    }

    return level;
  }
}

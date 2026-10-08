import Hls from 'hls.js';
import { findClosestAssetByQuality } from 'utilities/assets.js';

const DefaultCapLevelController = Hls.DefaultConfig.capLevelController;

export default class CustomCapLevelController extends DefaultCapLevelController {
  constructor(hls) {
    super(hls);
    this.hls = hls;
  }

  get autoLevelCapping() {
    return super.autoLevelCapping;
  }

  set autoLevelCapping(level) {
    if (level === Infinity || level === undefined) {
      super.autoLevelCapping = level;
      return;
    }

    super.autoLevelCapping = this.#getClosestLevelWithinRange(level);
  }

  // HLS.js has two properties for managing `autoLevelCapping`.
  // 1. The CapLevelController's internal `autoLevelCapping` property
  // 2. The HLS.js api property `autoLevelCapping`.
  // When using capLevelToPlayerSize (we are), it will update the api value on an interval
  // where it detects player size changes. We want to make sure we do all the other things as the base
  // `detectPlayerSize`, but we need to make sure we limit the api `autoLevelCapping` value
  detectPlayerSize() {
    // By default, in the CapLevelController, hls.js will cache the result of
    // this.getDimensions() in this.clientRect. It recalculates it this when
    // it calls getMaxLevel()... but that's only called if the previously cached
    // values are not 0. https://github.com/video-dev/hls.js/blob/4f017246678c237aec95c17d361a4623761083f0/src/controller/cap-level-controller.ts#L127-L131
    //
    // So if the player starts out hidden, the values would be 0, and we'd be stuck
    // with that for the rest of the session. To get the most up-to-date values all
    // the time, we need to clear the cache.
    this.clientRect = null;

    super.detectPlayerSize();

    if (this.hls && this.media && this.mediaHeight > 0 && this.mediaWidth > 0) {
      const level = this.#getClosestLevelWithinRange(this.hls.autoLevelCapping);

      if (level !== this.hls.autoLevelCapping) {
        this.hls.autoLevelCapping = level;
      }
    }
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

    // If autoLevelCapping is set to "auto", level can be -1. If it's auto, we don't want
    // to cap the level to our lowest quality!
    if (level >= 0 && level < minLevel) {
      return minLevel;
    }

    return level;
  }
}

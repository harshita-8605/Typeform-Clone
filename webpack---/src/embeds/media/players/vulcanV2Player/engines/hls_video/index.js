import Hls from 'hls.js';
import {
  findClosestAssetByQuality,
  numericSizeSnapped,
  withinQualityRange,
  nearestOutsideRange,
} from 'utilities/assets.js';
import { assign } from 'utilities/obj.js';
import { wlog } from 'utilities/wlog.js';
import { seqId } from 'utilities/seqid.js';
import { setOrGet } from 'utilities/legacyLocalstorage.js';
import { count, sample } from 'utilities/metrics.js';
import { cachedDetect } from 'utilities/detect.js';
import * as BandwidthTracking from './bandwidth_tracking.js';
import * as DynamicMaxMaxBufferLength from './dynamic_max_max_buffer_length.js';
import * as ErrorHandling from './error_handling.js';
import * as HlsAssets from './hls_assets.js';
import * as TrackStreamChanges from './track_stream_changes.js';
import SimpleVideo from '../simple_video/index.js';
import defineEngine from '../defineEngine.js';
import { initAfterChangeVideo, teardownBeforeChangeVideo } from '../simple_video/streams.js';
import {
  assetToLevel,
  bestStartingLevel,
  deliveryUrlToLevel,
  filteredHlsAssets,
  levelToAsset,
  startLoadOnce,
  stopLoad,
  teardown as teardownHlsUtils,
} from './hls_utils.js';
import CustomAbrController from './customAbrController.js';
import CustomCapLevelController from './customCapLevelController.js';
import { fetchMediaData } from '../../../../../../utilities/fetchMediaData.ts';
import { PlaybackEngine } from '../PlaybackEngine.ts';

const detect = cachedDetect();

const delegatePublicMethods = SimpleVideo.delegatePublicMethods;
const logger = wlog.getPrefixedFunctions('hls_video');

const ABR_BANDWIDTH_FACTOR = 1.1;
const ABR_BANDWIDTH_UP_FACTOR = 1.4;

class HlsVideo extends PlaybackEngine {
  #firstFragProgramDateTime;

  #liveStreamStartedAt;

  #liveStreamM3u8RenditionProgramTime;

  constructor(root, mediaData, attributes, otherEngine) {
    super(root, mediaData, attributes, otherEngine);
    this.uuid = seqId('wistia_hls_video_');
    this.root = root;
    this.name = 'HlsVideo';

    this.mediaData = mediaData;
    this.allAssets = this.mediaData.assets;
    this.attributes = assign(this.defaultAttributes(), attributes || {});
    this._startPosition = Number(this.attributes.startPosition) || -1;

    this.state = {};

    this.simpleVideo = new SimpleVideo(this.root, this.mediaData, this.attributes, otherEngine);

    this.setupHls();
  }

  abrBandWidthFactor() {
    return ABR_BANDWIDTH_FACTOR;
  }

  abrBandWidthUpFactor() {
    return ABR_BANDWIDTH_UP_FACTOR;
  }

  adaptiveAsset() {
    const asset = HlsAssets.multivariantM3u8Url(this);

    const result = HlsAssets.buildMasterM3u8Asset(asset);
    result.display_name = 'Auto';
    result.slug = 'Auto';
    return result;
  }

  addTextTracks() {
    // Hls does not need to manually add tracks - they are in the manifest
  }

  adjustLevelsForHdr() {
    let numberOfIndexesRemoved = 0;
    this.hls.levels.forEach((level, index) => {
      const nextAsset = this.hls.levels[index + 1];
      const prevAsset = this.hls.levels[index - 1];

      if (this.attributes.allowHdr && detect.hdr) {
        const nextAssetIsHdrAtSameWidth =
          nextAsset?.name.includes('HDR') && nextAsset.width === level.width;
        const prevAssetIsHdrAtSameWidth =
          prevAsset?.name.includes('HDR') && prevAsset.width === level.width;

        if (
          (nextAssetIsHdrAtSameWidth || prevAssetIsHdrAtSameWidth) &&
          !level.name.includes('HDR')
        ) {
          this.hls.removeLevel(index - numberOfIndexesRemoved);
          numberOfIndexesRemoved += 1;
        }
      }
      // additionally, if we don't support HDR, we should filter out any hdr assets we do have
      else if (level.name.includes('HDR')) {
        this.hls.removeLevel(index - numberOfIndexesRemoved);
        numberOfIndexesRemoved += 1;
      }
    });
  }

  assetFromQuality(qualityMin, qualityMax = qualityMin) {
    let assets = withinQualityRange(this.allAssets, qualityMin, qualityMax);

    if (assets.length === 0) {
      assets = nearestOutsideRange(this.allAssets, qualityMin, qualityMax);
    }

    return assets[0];
  }

  canLiveStreamStart(mediaData) {
    return (
      mediaData.liveStreamEventDetails?.startedAt &&
      mediaData.liveStreamEventDetails?.m3u8RenditionProgramTime &&
      mediaData.liveStreamEventDetails?.manifestUrl
    );
  }

  changeAudioTrack(audioTrackId) {
    return new Promise((resolve) => {
      const playbackModeIsBeforePlay = this.getPlaybackMode() === 'beforeplay';
      const currentTrackId = this.getCurrentAudioTrack().id;

      // only add the the hls event binding if we're not in a beforeplay state
      // and if track is not already selected
      if (!playbackModeIsBeforePlay && currentTrackId !== audioTrackId) {
        this.hls.once(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
          resolve();
        });
      }

      if (this.hls.audioTracks[audioTrackId] && currentTrackId !== audioTrackId) {
        this.hls.audioTrack = audioTrackId;
      } else if (this.getPlaybackMode() === 'beforeplay') {
        this.onReady().then(() => {
          this.hls.audioTrack = audioTrackId;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  changeLevel(newLevel) {
    if (this.hls.currentLevel !== newLevel && this.hls.startLevel !== newLevel) {
      this.hls.startLevel = newLevel;
    }

    if (this.getPlaybackMode() === 'playing' && newLevel !== -1) {
      this.hls.once(Hls.Events.LEVEL_SWITCHED, () => {
        this.play();
      });

      this.pause();
    }

    if (this.hls.currentLevel !== newLevel) {
      this.hls.nextLevel = newLevel;
    }
  }

  changeQuality(quality, autoPlay, reload) {
    if (quality.toString().toLowerCase() === 'auto') {
      return this.changeStream(-1, autoPlay, reload);
    }

    // if the quality being asked for is HDR, we need to filter the levels to only include HDR levels
    let hlsLevels = this.hls.levels;
    if (quality.toString().includes('HDR')) {
      hlsLevels = hlsLevels.filter((level) => level.name.includes('HDR'));
    }

    const hlsAsset = findClosestAssetByQuality(hlsLevels, quality);
    const level = deliveryUrlToLevel(this, hlsAsset.url[0]);
    return this.changeStream(level, autoPlay, reload);
  }

  changeStream(level, autoPlay = true, _reload = false) {
    this.changeLevel(level);

    if (autoPlay) {
      return this.play();
    }
    return Promise.resolve();
  }

  changeStreamWithoutLoad(asset) {
    if (assetToLevel(this, asset) === this.hls.currentLevel) {
      return;
    }

    const level = assetToLevel(this, asset);

    this.stopLoad();
    this.changeLevel(level);
  }

  changeVideo(mediaData, attributes) {
    return new Promise((resolve) => {
      // teardown
      this.mediaData = null;
      this.allAssets = [];
      this.attributes = {};
      this.state = {};
      this.state.isChangingVideo = true;
      this._bindings = {};
      this.destroyHls();
      teardownBeforeChangeVideo(this.simpleVideo);

      // setup
      this.mediaData = mediaData;
      this.allAssets = mediaData.assets;
      this.attributes = attributes;
      initAfterChangeVideo(this.simpleVideo, mediaData, attributes);
      this.setAttributes({ bwEstimateOnInit: setOrGet('hls.bandwidth_estimate') });
      this.setupHls();
      this.state.isChangingVideo = false;
      resolve();
    });
  }

  currentLevel() {
    return this.hls.currentLevel;
  }

  currentAsset() {
    if (this.hls.currentLevel >= 0) {
      return levelToAsset(this, this.hls.currentLevel) || this.adaptiveAsset();
    }
    if (this.hls.startLevel != null && this.hls.startLevel >= 0) {
      return levelToAsset(this, this.hls.startLevel) || this.adaptiveAsset();
    }
    return this.adaptiveAsset();
  }

  defaultAttributes() {
    return {
      contentType: 'video/m3u8',
      qualityMin: 360,
      qualityMax: 2160,
      preload: 'metadata',
    };
  }

  destroy() {
    this.destroyHls();

    clearTimeout(this._pollForLiveStreamTimeout);
    super.destroy();
    return this.simpleVideo.destroy();
  }

  destroyHls() {
    const safe = (fn) => {
      try {
        return fn();
      } catch (e) {
        logger.error(e);
      }
    };
    safe(() => {
      ErrorHandling.teardown(this);
    });
    safe(() => {
      BandwidthTracking.teardown(this);
    });
    safe(() => {
      DynamicMaxMaxBufferLength.teardown(this);
    });
    safe(() => {
      TrackStreamChanges.teardown(this);
    });
    safe(() => {
      teardownHlsUtils(this);
    });
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  // We don't ever want to use the low-quality 224 asset in the auto stream.
  // To avoid that, we can set the minimum bitrate allowed for auto. We use the
  // max_bitrate (minus a lil bit) from the 360 asset as out minimum.
  determineMinAutoBitrate() {
    let asset = this.hlsAssetFromQuality(360, 1080);
    if (asset && asset.metadata && asset.metadata.max_bitrate) {
      const bitrate = asset.metadata.max_bitrate;
      // minus one just to make sure we keep
      // the 360p asset as selectable
      return bitrate - 1;
    }
    return 600000;
  }

  diagnosticData() {
    const safe = (fn) => {
      try {
        return fn();
      } catch (e) {
        return `ERROR: ${e.message}`;
      }
    };

    const result = {
      simpleVideo: this.simpleVideo.diagnosticData(),
      attributes: this.attributes,
      currentLevel: safe(() => this.currentLevel()),
      startLevel: safe(() => this.hls.startLevel),
      nextLevel: safe(() => this.hls.nextLevel),
      loadLevel: safe(() => this.hls.loadLevel),
      autoLevel: safe(() => this.hls.autoLevel),
      autoLevelCapping: safe(() => this.hls.autoLevelCapping),
      nextAutoLevel: safe(() => this.hls.nextAutoLevel),
      manualLevel: safe(() => this.hls.manualLevel),
      bandwidthEstimate: safe(() => this.hls.abrController.bwEstimator.getEstimate()),
    };

    if (this.hls?.currentLevel) {
      result.currentAsset = levelToAsset(this, this.hls.currentLevel);
    }

    if (this.hls && this.selectedQuality() !== 'auto' && this.hls.manualLevel > -1) {
      result.selectedAsset = levelToAsset(this, this.hls.manualLevel);
    }

    return result;
  }

  filteredVideoAssets() {
    let assets = HlsAssets.allMp4VideoAssets(this.allAssets);
    return filteredHlsAssets(this, assets);
  }

  // hls and safari have different mechanisms for saying if a audio track is on.
  // we align them both through an `isSelected` field on the track.
  //
  // They also have different mechanisms for returning the name. We align the
  // hls responses here to have the same label as we do with nativeHls
  async getAudioTracks() {
    const mediaDataTracks = this.m3u8AudioAssets();

    if (this.hls?.audioTracks.length > 0) {
      const tracks = this.hls.audioTracks.map((track, index) => {
        const matchingTrack = mediaDataTracks[index - 1];
        track.isSelected = index === this.getHlsAudioTrackId();
        track.label = matchingTrack?.details.languageMetadata.nativeName;

        if (index === 0) {
          track.label = 'Original';
        }
        return track;
      });
      return Promise.resolve(tracks);
    }
    return Promise.resolve(HlsAssets.audioTracksForVideo(mediaDataTracks));
  }

  async getCurrentAudioTrack() {
    this.loadForAudioTracks();
    const audioTrackId = this.getHlsAudioTrackId();
    const audioTrack = this.hls.audioTracks[audioTrackId] || {};

    audioTrack.isSelected = true;
    return Promise.resolve(audioTrack);
  }

  getCurrentQuality() {
    // hls is null after a fatal error tears it down, but the quality poll
    // loop and settings menu can still call this.
    if (!this.hls) {
      return 'auto';
    }
    const level = this.hls.currentLevel >= 0 ? this.hls.currentLevel : this.hls.startLevel;
    const currentAsset = this.hls.levels[level];
    if (!currentAsset) {
      return 'auto';
    }
    if (currentAsset) {
      return this.qualityForLevel(level);
    }
    return '?';
  }

  // In all cases except for Live, we should deferring to the Simple Video's `getCurrentTime` method.
  // For Live, we want the current time to be the time since the Live stream began, not since when a viewer landed on
  // the page; which is the default behavior because we're using a Sliding Window HLS playlist format.
  // In order to calculate the time since the Live Stream began, we do a little math.
  // We have the ProgramDateTime value of the very first fragment in the HLS Playlist, provided to us
  // via mediaData. We then get the ProgramDateTime of the first fragment this viewer received out of HLS.js.
  // We can take the difference between those two times + the video's `currentTime` and get the total time
  // the stream has been active and the viewer's position.
  getCurrentTime() {
    // If we're not a live media or we don't have all this information, we should just use SimpleVideo.getCurrentTime
    if (
      !this.attributes.liveMedia ||
      !this.#firstFragProgramDateTime ||
      !this.mediaData.liveStreamEventDetails?.m3u8RenditionProgramTime
    ) {
      return this.simpleVideo.getCurrentTime();
    }

    const liveStartTime = new Date(
      this.mediaData.liveStreamEventDetails.m3u8RenditionProgramTime,
    ).getTime();

    const diffBetweenFirstTimeAndStartTimeInSeconds =
      (this.#firstFragProgramDateTime - liveStartTime) / 1000;

    return diffBetweenFirstTimeAndStartTimeInSeconds + this.simpleVideo.getCurrentTime();
  }

  // if the video has not yet been played, hlsjs will return -1 for the audio track.
  // But, we also define the first audio track as that of the main audio, so return that
  // instead of undefined
  getHlsAudioTrackId() {
    return this.hls.audioTrack === -1 ? 0 : this.hls.audioTrack;
  }

  // This value is in seconds. We set this value in the config to control the amount
  // of frags loaded for preloading purposes. On play, we then increase this number to allow
  // for a longer buffer.

  // We want to download roughly ~9-10 frags for `preload=true` and our
  // frags are usually 3 seconds each.
  // For `metadata`, we only want 1 or 2 frags to ever load.
  // For `none`, we can actually set this to 60 since it won't matter
  getMaxMaxBufferLengthForConfig() {
    switch (this.attributes.preload) {
      case 'auto':
        return 27;
      case true:
        return 27;
      case 'metadata':
        return 1;
      default:
        return this.getMaxMaxBufferLengthAfterPlay();
    }
  }

  getMaxMaxBufferLengthAfterPlay() {
    if (this.attributes.isInstantHls) {
      return 12;
    }
    return 60;
  }

  hlsAssetFromQuality(qualityMin, qualityMax = qualityMin) {
    let assets = withinQualityRange(this.filteredVideoAssets(), qualityMin, qualityMax);

    if (assets.length === 0) {
      assets = nearestOutsideRange(this.filteredVideoAssets(), qualityMin, qualityMax);
    }

    return assets[0];
  }

  isChangingVideo() {
    return !!this.state.isChangingVideo;
  }

  // if we've asked for audio track information, but there are no audio tracks
  // that means we've asked for them before we've actually done the startLoad
  // hls.js
  loadForAudioTracks() {
    if (this.hls.audioTracks.length === 0) {
      this.startHlsLoadOnce();
    }
  }

  liveConfig() {
    return {
      abrBandWidthFactor: ABR_BANDWIDTH_FACTOR,
      abrBandWidthUpFactor: ABR_BANDWIDTH_UP_FACTOR,
      abrEwmaDefaultEstimate: this.attributes.bwEstimateOnInit,
      testBandwidth: false,
      autoStartLoad: false,
      debug: {
        log: (...args) => {
          wlog.info('hlsjs log >', ...args);
        },
        error: (...args) => {
          wlog.notice('hlsjs error >', ...args);
        },
        warn: (...args) => {
          wlog.notice('hlsjs warn >', ...args);
        },
        info: (...args) => {
          wlog.info('hlsjs info >', ...args);
        },
        debug: (...args) => {
          wlog.debug('hlsjs debug >', ...args);
        },
      },
      maxBufferSize: 60 * 1000 * 1000, // 60 MB
      maxFragLookUpTolerance: 0.2,
      maxMaxBufferLength:
        this.attributes.maxMaxBufferLength || this.getMaxMaxBufferLengthAfterPlay(), // 1 minute
      seekHoleNudgeDuration: 0.1,
    };
  }

  loadSource() {
    const autoAsset = this.adaptiveAsset();

    if (this.attributes.liveMedia) {
      if (this.canLiveStreamStart(this.mediaData)) {
        this.hls.loadSource(autoAsset.url);
      } else {
        console.error('Live stream not ready to start');
      }
    } else {
      this.hls.loadSource(autoAsset.url);
    }
  }

  m3u8AudioAssets() {
    return HlsAssets.allHlsAudioAssets(this.allAssets);
  }

  onEnterFullscreen() {
    this.simpleVideo.onEnterFullscreen();

    // if we're beforeplay we don't actually want to flush the entire
    // buffer and destroy any bitrate test frags that were loaded
    // This solves a buffer stall issue if you were to `this.changeLevel(-1)` beforeplay
    if (this.getPlaybackMode() === 'beforeplay') {
      return;
    }

    // We force set the current level here to ensure
    // we flush the buffer and start getting new frags
    this.changeLevel(-1);
  }

  onHeightChange(height) {
    this.simpleVideo.onHeightChange(height);
    this.setAttributes({ height });
  }

  onMediaDataChanged(mediaData) {
    this.mediaData = mediaData;
  }

  onReady() {
    if (this.readyPromise) {
      return this.readyPromise;
    }
    this.readyPromise = this.simpleVideo.onReady().then(() => {
      return Promise.all([this.mediaAttachedPromise, this.manifestParsedPromise]);
    });
    return this.readyPromise;
  }

  onWidthChange(width) {
    this.simpleVideo.onWidthChange(width);
    this.setAttributes({ width });
  }

  play(options) {
    if (!this.hls) {
      return Promise.resolve();
    }

    // if autoStartLoad is disabled (via preload=none), we will need to
    // start hls loading manually
    if (!this.hls.config.autoStartLoad) {
      this.startHlsLoadOnce();
    }

    // we set this beforeplay to be shorter for preloading. But once we've played
    // it's okay to increase this. And it doesn't matter if we do it more than one here
    this.hls.config.maxMaxBufferLength = this.getMaxMaxBufferLengthAfterPlay();

    // it is important that we do this before issuing the play command for
    // analytics purposes. We want the event sequence to be `seek`, then `unpause`.
    // if we wait until the play is resolved to seek to edge, we get `unpause` then `seek`
    // and the current time of the events is no what analytics would like/expect
    if (this.attributes.liveMedia) {
      count('live_stream/play', 1, { hashed_id: this.attributes.hashedId });
      return this.setCurrentTimeToLiveEdge()
        .then(() => {
          return this.simpleVideo.play(options);
        })
        .then((playType) => {
          count('live_stream/play/success', 1, { hashed_id: this.attributes.hashedId });
          return playType;
        });
    }

    return this.simpleVideo.play(options);
  }

  qualityForLevel(level) {
    if (level === -1) {
      return 'auto';
    }

    const asset = this.hls.levels[level];

    // If the asset name includes HDR, we want to show that in the quality label
    // Live assets don't have names.
    if (asset.name?.toLowerCase().includes('hdr')) {
      return `${numericSizeSnapped(asset.width, asset.height)} (HDR)`;
    }

    return numericSizeSnapped(asset.width, asset.height);
  }

  qualityMax(val) {
    if (this.hls.config) {
      this.hls.config.qualityMax = val;
    }
  }

  qualityMin(val) {
    if (this.hls.config) {
      this.hls.config.qualityMin = val;
    }
  }

  removeTextTracks() {
    // HLS tracks are in the manifest and should not be removed
  }

  reset() {
    this.simpleVideo.reset();
  }

  seek(t, options) {
    this.startHlsLoadOnce(t);
    return this.simpleVideo.seek(t, options);
  }

  selectableQualities() {
    const qualities = this.hls.levels.map((_asset, index) => {
      return this.qualityForLevel(index);
    });
    return [this.qualityForLevel(-1)].concat(qualities);
  }

  selectedQuality() {
    if (this.hls.manualLevel >= 0) {
      return this.qualityForLevel(this.hls.manualLevel);
    }

    return 'auto';
  }

  setAttributes(attrs) {
    assign(this.attributes, attrs);
    return this.simpleVideo.setAttributes(attrs);
  }

  setCurrentTimeToLiveEdge() {
    if (this.getPlaybackMode() !== 'beforeplay') {
      return this.seek(this.hls.liveSyncPosition);
    }

    return Promise.resolve();
  }

  setupEventListeners() {
    this.manifestParsedPromise = new Promise((resolve) => {
      this.hls.on(Hls.Events.MANIFEST_PARSED, resolve);
    });
    this.mediaAttachedPromise = new Promise((resolve) => {
      this.hls.on(Hls.Events.MEDIA_ATTACHED, resolve);
    });

    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      const video = this.hls._media;
      const source = document.createElement('source');
      source.setAttribute('type', 'application/x-mpegURL');
      source.setAttribute('src', HlsAssets.multivariantM3u8Url(this));
      video.appendChild(source);
      video.disableRemotePlayback = false;

      // https://github.com/video-dev/hls.js/issues/6482
      // fix for airplay. Hopefully there is a better solution in the future.
      video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
        if (video.webkitCurrentPlaybackTargetIsWireless) {
          const wasPlaying = this.simpleVideo.getMediaElement().paused;
          this.pause();
          this.hls.stopLoad();
          video.autoplay = true;
          if (wasPlaying) {
            this.play();
          }
        } else {
          this.hls.startLoad();
          video.autoplay = false;
        }
      });
    });

    this.hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
      this.trigger('audiotracksupdated');
    });

    // hls.js 1.7+ exposes the manifest's subtitle renditions as <track>
    // elements (video-dev/hls.js#7515). Browsers run automatic text track
    // selection on those, so a viewer whose system caption preference is on
    // gets one flipped to `showing` on insertion, and hls.js switches to it.
    // When the captions plugin is off nothing else would turn it back off.
    this.hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_e, data) => {
      if (data.id !== -1 && !this.attributes.captionsEnabled?.()) {
        this.hls.subtitleTrack = -1;
      }
    });

    this.hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      const asset = levelToAsset(this, data.level);

      if (this.hls.levels[data.level].name?.includes('HDR')) {
        count('player/hlsjs/using-hdr-asset', 1);
      }

      this.trigger('hlslevelswitched', { asset });
    });

    // this is used in Live, helps us calculate the time since the stream started
    this.hls.once(Hls.Events.LEVEL_LOADED, (_e, data) => {
      this.#firstFragProgramDateTime = data.details?.fragments?.[0]?.programDateTime;
    });
  }

  setupHls() {
    if (this.attributes.liveMedia) {
      this.setupLiveHls();
    } else {
      this.setupVodHls();
    }
  }

  setupLiveHls() {
    const config = this.liveConfig();
    this.hls = new Hls(config);

    TrackStreamChanges.setup(this);

    this.setupEventListeners();

    this.hls.attachMedia(this.simpleVideo.getMediaElement());

    BandwidthTracking.setup(this);
    ErrorHandling.setup(this);

    // if the live stream has already started, we can load the source immediately
    if (
      this.mediaData.liveStreamEventDetails?.startedAt &&
      this.mediaData.liveStreamEventDetails?.m3u8RenditionProgramTime
    ) {
      this.#liveStreamStartedAt = this.mediaData.liveStreamEventDetails.startedAt;
      this.#liveStreamM3u8RenditionProgramTime =
        this.mediaData.liveStreamEventDetails.m3u8RenditionProgramTime;

      this.loadSource();
      this.onReady().then(() => {
        this.trigger('livestreamready');
      });
    }

    const pollForLiveStreamChange = () => {
      fetchMediaData(this.attributes.hashedId, {
        embedHost: this.attributes.embedHost,
        skipCache: true,
        bypassOriginShield: true,
      }).then(async (mediaData) => {
        if (this.canLiveStreamStart(mediaData)) {
          const { startedAt, m3u8RenditionProgramTime } = mediaData.liveStreamEventDetails;
          this.onMediaDataChanged(mediaData);

          // the first time we go live these will be undefined and we need to set them for future comparisons
          if (
            this.#liveStreamStartedAt === undefined &&
            this.#liveStreamM3u8RenditionProgramTime === undefined
          ) {
            this.#liveStreamStartedAt = startedAt;
            this.#liveStreamM3u8RenditionProgramTime = m3u8RenditionProgramTime;

            this.loadSource();
            await this.onReady();
            this.trigger('livestreamready');
          } else if (
            // if the stream has restarted we need to reload the new source
            startedAt !== this.#liveStreamStartedAt &&
            m3u8RenditionProgramTime !== this.#liveStreamM3u8RenditionProgramTime
          ) {
            this.trigger('livestream-mediadata-changed', mediaData);
          }
        }

        this._pollForLiveStreamTimeout = setTimeout(pollForLiveStreamChange, 1000);
      });
    };

    pollForLiveStreamChange();
  }

  setupVodHls() {
    const config = this.vodConfig();
    this.hls = new Hls(config);

    TrackStreamChanges.setup(this);

    this.loadSource();

    this.setupEventListeners();

    this.hls.attachMedia(this.simpleVideo.getMediaElement());

    DynamicMaxMaxBufferLength.setup(this);
    ErrorHandling.setup(this);
    BandwidthTracking.setup(this);

    // set the startLevel of the HLS stream. We do this here instead of in the config
    // because we want to have the levels loaded - which happens after manifest parsed
    this.hls.once(Hls.Events.MANIFEST_PARSED, () => {
      this.adjustLevelsForHdr();
      this.hls.startLevel = bestStartingLevel(this);

      // setting playback rate beforeplay can be troublesome. If we set it as a property on the
      // <video> element before any video data is loaded or connected to HLS.js can cause it
      // get reset
      if (this.attributes.playbackRate != null) {
        this.simpleVideo.setPlaybackRate(this.attributes.playbackRate);
      }

      if (detect.hdr) {
        count('player/hlsjs/hdr-supported', 1);
      }
    });
  }

  selectedAsset() {
    if (this.hls.levels.length !== 0) {
      if (this.hls.currentLevel) {
        return this.hls.levels[this.hls.currentLevel];
      }
      return this.hls.levels[this.hls.startLevel];
    }
    return undefined;
  }

  showFirstFrame() {
    return this.seek(0.01);
  }

  startHlsLoadOnce(t) {
    const time = t || this._startPosition;
    startLoadOnce(this, time);
  }

  stopLoad() {
    stopLoad(this);
  }

  updateStartPosition(t) {
    if (this.hls.config.startPosition === t) {
      return;
    }

    this.attributes.startPosition = t;
    this._startPosition = t;
    this.hls.config.startPosition = t;

    if (this.hls) {
      this.loadSource();
    }
  }

  usingInstantHls() {
    return (
      (this.attributes.forceInstantHls || !this.mediaData.playableWithoutInstantHls) &&
      this.mediaData.instantHlsAssetsReady
    );
  }

  vodConfig() {
    const config = {
      abrBandWidthFactor: ABR_BANDWIDTH_FACTOR,
      abrBandWidthUpFactor: ABR_BANDWIDTH_UP_FACTOR,
      abrController: CustomAbrController,
      abrEwmaFastVoD: 4,
      abrEwmaSlowVoD: 15,
      autoStartLoad: this.attributes.preload !== 'none' && this.attributes.preload !== false,
      capLevelToPlayerSize: true,
      capLevelController: CustomCapLevelController,
      debug: {
        log: (...args) => {
          wlog.info('hlsjs log >', ...args);
        },
        error: (...args) => {
          wlog.notice('hlsjs error >', ...args);
        },
        warn: (...args) => {
          wlog.notice('hlsjs warn >', ...args);
        },
        info: (...args) => {
          wlog.info('hlsjs info >', ...args);
        },
        debug: (...args) => {
          wlog.debug('hlsjs debug >', ...args);
        },
      },
      playlistLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: this.attributes.authorization ? 30000 : 10000,
          maxLoadTimeMs: 20000,
          timeoutRetry: {
            maxNumRetry: 2,
            retryDelayMs: 0,
            maxRetryDelayMs: 0,
          },
          errorRetry: {
            maxNumRetry: 2,
            retryDelayMs: 1000,
            maxRetryDelayMs: 8000,
          },
        },
      },
      fragLoadPolicy: {
        default: {
          maxTimeToFirstByteMs: this.attributes.isInstantHls ? 30000 : 10000,
          maxLoadTimeMs: 120000,
          timeoutRetry: {
            maxNumRetry: this.attributes.isInstantHls ? 2 : 4,
            retryDelayMs: 0,
            maxRetryDelayMs: 0,
          },
          errorRetry: {
            maxNumRetry: this.attributes.isInstantHls ? 2 : 6,
            retryDelayMs: 1000,
            maxRetryDelayMs: 8000,
          },
        },
      },
      maxBufferSize: 60 * 1000 * 1000, // 60 MB
      maxFragLookUpTolerance: 0.2,
      maxMaxBufferLength: this.getMaxMaxBufferLengthForConfig(),
      minAutoBitrate: this.determineMinAutoBitrate(),
      seekHoleNudgeDuration: 0.1,
      startPosition: this._startPosition,
      qualityMin: this.attributes.qualityMin || 360, // custom config value
      qualityMax: this.attributes.qualityMax || 2160, // custom config value
    };

    if (this.attributes.audioPreference) {
      config.audioPreference = this.attributes.audioPreference;
    }

    return config;
  }
}

delegatePublicMethods(HlsVideo.prototype, function () {
  return this.simpleVideo;
});

defineEngine('HlsVideo', HlsVideo);

export default HlsVideo;

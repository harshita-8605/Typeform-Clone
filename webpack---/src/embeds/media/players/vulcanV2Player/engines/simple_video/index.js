import { bindify } from 'utilities/bindify.js';
import { assign, clone } from 'utilities/obj.js';
import { numericSizeSnapped } from 'utilities/assets.js';
import { seqId } from 'utilities/seqid.js';
import * as Helpers from './helpers.js';
import * as Buffering from './buffering.js';
import * as Seeking from './seeking.js';
import * as OnReady from './on_ready.js';
import * as Streams from './streams.js';
import * as SimpleMethods from './simple_methods.js';
import * as Hacks from './hacks.js';
import * as Modes from './playback_modes.js';
import * as ObjectFit from './object_fit.js';
import * as Diagnostics from './diagnostics.js';
import * as Initialization from './initialization.js';
import * as PublicMethods from '../public_methods.js';
import { getTrim, setCuts, setTrim } from './cuts.js';
import defineEngine from '../defineEngine.js';
import { getCuts, getDurationBeforeCuts, getTimeAfterCuts, getTimeBeforeCuts } from './cutsCalc.js';
import { addTextTracks, removeTextTracks } from './textTrackHelper.js';
import { PlaybackEngine } from '../PlaybackEngine.ts';

class SimpleVideo extends PlaybackEngine {
  constructor(root, mediaData, attributes, otherEngine) {
    super(root, mediaData, attributes, otherEngine);
    this.uuid = seqId('wistia_simple_video_');
    this.root = root;
    this.state = {};
    this.name = 'SimpleVideo';

    Initialization.setupProperties(this, mediaData, attributes || {});
    if (otherEngine) {
      Initialization.fromOtherEngine(this, otherEngine);
    } else {
      Initialization.injectVideo(this);
    }
    Hacks.fixWebkitControlsBug(this);
    Initialization.setupBindingsAndLoops(this);
    ObjectFit.fit(this);
  }

  addTextTracks(tracks) {
    addTextTracks(tracks, this.video);
  }

  // Returns the buffer time range which includes the playhead as an array in
  // the format `[startTime, endTime]`.
  activeBufferRange() {
    return Buffering.activeBufferRange(this);
  }

  // Returns true if any playback data has been successfully downloaded. Used for
  // metrics / experiments.
  anyBuffered() {
    return Buffering.anyBuffered(this);
  }

  // Takes the engine element out of fullscreen. Not necessary to use if
  // fullscreen behavior is being implemented outside the engine.
  cancelFullscreen() {
    return SimpleMethods.cancelFullscreen(this);
  }

  // Returns the current frame of the video in data URI format
  captureCurrentFrame(...args) {
    return SimpleMethods.captureCurrentFrame(this, ...args);
  }

  // Changes the stream quality by giving it a slug or quality level.
  changeQuality(slug) {
    return Streams.changeQuality(this, slug);
  }

  // Changes the stream while maintaining the current time and playback mode.
  // Returns a promise that is resolved when the stream change is complete and
  // the previous time/playback mode is restored.
  //
  // "asset" should be an asset hash, like one in mediaData.assets.
  changeStream(asset) {
    return Streams.changeStream(this, asset);
  }

  // Changes the current stream without actually showing/playing it. On the
  // next play, the new stream will be used. This is used when changing video
  // qualities when the video is not playing.
  changeStreamWithoutLoad(asset) {
    return Streams.changeStreamWithoutLoad(this, asset);
  }

  // Changes all mediaData and attributes for the current video, while
  // maintaining the current engine instance.
  //
  // XXX: It would be better to instantiate a totally new engine every time,
  // and allow initializing from the state of another engineer. This makes
  // more sense since there's no guarantee that the new engine can properly
  // handle the mediaData/attributes being sent to it.
  changeVideo(mediaData, attributes) {
    return Streams.changeVideo(this, mediaData, attributes);
  }

  // Returns the current asset being used for display; not necessarily the
  // selected asset. For example, the "Auto" asset might be selected, but this
  // could return the "540p" asset if that's what Auto has chosen.
  currentAsset() {
    return this._currentAsset;
  }

  // XXX: This does not need to be a public method.
  defaultAsset() {
    return this.selectableAssets()[0];
  }

  // Clean up any asynchronous loops/timeouts, bindings, and other allocations,
  // assuming this object will be unlinked and garbage collected later.
  destroy() {
    const oldState = this.state || {};
    this.state = {
      eventContext: oldState.eventContext,
      destroyed: true,
      issuedPlay: oldState.issuedPlay,
    };

    Initialization.killBindingsAndStopLoops(this);

    super.destroy();
  }

  // Returns a hash of diagnostic data for debugging. Used in Problem Reports.
  diagnosticData() {
    return Diagnostics.getDiagnosticData(this);
  }

  eventContext() {
    return this.state.eventContext;
  }

  // Resize the engine so it fits into its root DOM element. This is called on
  // demand, and usually onWidthChange/onHeightChange, to avoid expensive
  // polling.
  fit() {
    return ObjectFit.fit(this);
  }

  hasIssuedPlay() {
    return !!this.state.issuedPlay;
  }

  async getAudioTracks() {
    return Promise.resolve([]);
  }

  // Try to return the actual quality of the current stream. If no current
  // stream is set, use the selected stream. If neither is set, then what the
  // heck is going on?
  getCurrentQuality() {
    const currentAsset = this.currentAsset();
    if (currentAsset) {
      if (currentAsset.type === 'hdr_video') {
        return `${numericSizeSnapped(currentAsset.width, currentAsset.height)} (HDR)`;
      }

      return numericSizeSnapped(currentAsset.width, currentAsset.height);
    }

    const selectedAsset = this.selectedAsset();
    if (selectedAsset) {
      return numericSizeSnapped(selectedAsset.width, selectedAsset.height);
    }

    return '?';
  }

  // Float, returns the current playhead position of the video.
  getCurrentTime() {
    return SimpleMethods.getCurrentTime(this);
  }

  getCuts() {
    return getCuts(this);
  }

  // Float, returns the duration of the video.
  getDuration() {
    return SimpleMethods.getDuration(this);
  }

  // Returns a `<video>` tag, or null if not applicable. This is because sometimes
  // tools we don't have control over require an actual `<video>` element that lives
  // in the DOM. Mux uses this.
  //
  // In the short term, until all our players are powered by engines, this is also
  // helpful for compatibility. (For example, HLSVideo is initialized on a `<video>`
  // element.)
  getMediaElement() {
    return this.video;
  }

  getMediaType() {
    return this.mediaData.mediaType;
  }

  // Maps to our player API `state()` method, but I think this naming is more
  // explicit. Returns a string that may drive UI cues. Possible values:
  // beforeplay, ended, paused, playing, unknown.
  getPlaybackMode() {
    return Modes.getPlaybackMode(this);
  }

  // Float, returns the video's playback rate multiplier. Default is 1.
  getPlaybackRate() {
    return SimpleMethods.getPlaybackRate(this);
  }

  // The player can pass in its preload preference, but the engine does not need to
  // respect it. This should return the real preload value, for metrics and UI
  // reporting.
  getPreload() {
    return SimpleMethods.getPreload(this);
  }

  // Returns the representative state of the video. This does not need to
  // contain absolutely all internal data, but should return anything that
  // could impact UI/UX decisions outside of the engine.
  getState() {
    return SimpleMethods.getState(this);
  }

  getDurationBeforeCuts() {
    return getDurationBeforeCuts(this);
  }

  getTimeAfterCuts(t) {
    return getTimeAfterCuts(this, t);
  }

  getTimeBeforeCuts(t) {
    return getTimeBeforeCuts(this, t);
  }

  getTrim() {
    return getTrim(this);
  }

  // Float, returns the current volume.
  getVolume() {
    return SimpleMethods.getVolume(this);
  }

  // XXX: This returns true while the video is being changed. It is used to
  // guard against things like hls error correction while switching streams.
  // It would be better to just disable things like that temporarily while
  // switching.
  isChangingVideo() {
    return Streams.isChangingVideo(this);
  }

  // Returns true if onEnterFullscreen() has been called.
  isInFullscreen() {
    return SimpleMethods.isInFullscreen(this);
  }

  isInitializingFromUnmuted() {
    return SimpleMethods.isInitializingFromUnmuted(this);
  }

  isMuted() {
    return SimpleMethods.isMuted(this);
  }

  // Returns true if the video is currently seeking. This is meant as a UI clue
  // since we might also set volume to 0 during some kinds of seeks, but we
  // probably don't want to display that in the UI.
  isSeeking() {
    return Seeking.isSeeking(this);
  }

  // Returns true if an element inside the engine is the source of a browser
  // event. This is usually used when you want to know if the <video> element
  // is what was clicked on to toggle play/pause, but that check breaks down
  // when you have multiple <video> elements, or a canvas, or whatever.
  isSourceOfBrowserEvent(event) {
    return SimpleMethods.isSourceOfBrowserEvent(this, event);
  }

  // XXX: Returns the last buffered time. This _should_ be the last time from
  // sequentialBufferedRange(), but it is not currently. Used for reporting.
  lastBufferedTime(maxBufferHole) {
    return Buffering.lastBufferedTime(this, maxBufferHole);
  }

  loadSource() {
    const asset = this.currentAsset();
    if (!asset) {
      return;
    }

    this.changeStream(asset);
  }

  mute() {
    return SimpleMethods.mute(this);
  }

  // Notifies the engine that it has entered fullscreen mode, in case its
  // behavior should change.
  onEnterFullscreen() {
    return SimpleMethods.onEnterFullscreen(this);
  }

  // Notifies the engine of a height change.
  onHeightChange(height) {
    return ObjectFit.onHeightChange(this, height);
  }

  // Notifies the engine that it has left fullscreen mode.
  onLeaveFullscreen() {
    return SimpleMethods.onLeaveFullscreen(this);
  }

  // Returns a promise that resolves when the video is ready to receive
  // commands like play/pause.
  //
  // TODO: Rename this--or the other on* methods--since they are not
  // consistent. This one returns a promise and the others notify of changes.
  onReady() {
    return OnReady.onReady(this);
  }

  // Notifies the engine of a width change.
  onWidthChange(width) {
    return ObjectFit.onWidthChange(this, width);
  }

  // Pause the video.
  pause() {
    return SimpleMethods.pause(this);
  }

  // Plays the video.
  play(options) {
    return SimpleMethods.play(this, options);
  }

  playType() {
    return SimpleMethods.playType(this);
  }

  removeTextTracks(id) {
    removeTextTracks(id, this.video);
  }

  // Puts the engine into fullscreen mode.
  // Useful when the player can't just put the engine root element into
  // fullscreen mode.
  requestFullscreen() {
    return SimpleMethods.requestFullscreen(this);
  }

  // This is used to reset the engine state, so the "ended" state can look like
  // a "beforeplay" state. XXX: This is a weird hack. There's probably a better
  // way.
  reset() {
    this.state = {};
  }

  // Seeks the video to time t. Returns a promise that resolves when the seek
  // is done. This type of seek will try to deal with seek-before-play
  // scenarios too.
  seek(t, options) {
    return Seeking.seek(this, t, options);
  }

  // Seeks the video to t after it is played. Used for "lazy" seeking, like on
  // mobile or with popovers.
  seekOnPlay(t) {
    return Seeking.seekOnPlay(this, t);
  }

  // Returns the currently selected asset. This could be something like "Auto",
  // while currentAsset would return the displayed asset, like "540p".
  selectedAsset() {
    return this._currentAsset;
  }

  // Returns a list of all assets that can be selected, in their preferred
  // order.
  selectableAssets() {
    return this.allAssets;
  }

  selectableQualities() {
    return this.selectableAssets()
      .map((asset) => {
        if (asset.width === 'variable') {
          return asset.slug;
        }

        if (asset.type === 'hdr_video') {
          return `${numericSizeSnapped(asset.width, asset.height)} (HDR)`;
        }

        return numericSizeSnapped(asset.width, asset.height);
      })
      .sort((a, b) => {
        return (a === 'auto' ? -1 : a) - (b === 'auto' ? -1 : b);
      });
  }

  selectedQuality() {
    const asset = this.selectedAsset();
    if (asset) {
      if (asset.type === 'hdr_video') {
        return `${numericSizeSnapped(asset.width, asset.height)} (HDR)`;
      }
      return numericSizeSnapped(asset.width, asset.height);
    }
    return '?';
  }

  // Returns the buffer range which includes the current playhead, while merging
  // very close ranges into one that looks contiguous. Similar to
  // `activeBufferRange()`, but more useful for UI. This is what we used to display
  // the buffered region in the playbar. Result looks like `[startTime, endTime]`.
  sequentialBufferedRange() {
    return Buffering.sequentialBufferedRange(this);
  }

  // Assigns the given attributes to the attrs hash. It's not required, but
  // acceptable for parent engines to also call this on their child engines,
  // with the same arguments, or a subset of them. This allows certain
  // changes--for example, bandwidth samples taken outside of the engine--to
  // propagate where they need to go.
  setAttributes(attrs) {
    assign(this.attributes, attrs);
  }

  // this will get overridden in engines that need to apply
  // additional engine-specific media data transforms
  onMediaDataChanged() {}

  onPlayed() {
    const state = this.state;
    if (state && state.hasPlayed) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const onPlay = () => {
        this.unbind('playing', onPlay);
        resolve();
      };
      this.bind('playing', onPlay);
    });
  }

  // Seeks the video to `t` with no guarantees. This has no return value, and
  // exists as an optimization for fast scrubbing.
  setCurrentTime(t) {
    return SimpleMethods.setCurrentTime(this, t);
  }

  setCuts(cuts) {
    return setCuts(this, cuts);
  }

  // Sets the playback rate multiplier. No return value.
  setPlaybackRate(r) {
    return SimpleMethods.setPlaybackRate(this, r);
  }

  setTrim(t) {
    return setTrim(this, t);
  }

  // Sets the volume to `v`. No return value.
  setVolume(v) {
    return SimpleMethods.setVolume(this, v);
  }

  showFirstFrame() {
    return Seeking.seek(this, 0.01);
  }

  canDownloadMedia() {
    return true;
  }

  // Pauses the video (time does not need to be preserved) and stops
  // downloading the video stream, if applicable. We use this when removing or
  // rebuilding the player. For example, this is called when a popover is
  // closed so that the stream does not continue downloading, wasting
  // bandwidth.
  stopStreaming() {
    return Streams.stopStreaming(this);
  }

  // Returns how much time is left before the end of the buffer. For example,
  // if the playhead is at second 6 and the last buffered time is 9 seconds,
  // this would return 3. Used by our "cautiously optimistic streaming" HLS
  // algorithm.
  timeBeforeEndOfBuffer(maxBufferHole) {
    return Buffering.timeBeforeEndOfBuffer(this, maxBufferHole);
  }

  // Returns the total seconds buffered, ignoring any buffer gaps. So if
  // seconds 0-5 and 8-12 are buffered, this would return 9.
  totalBuffered() {
    return Buffering.totalBuffered(this);
  }

  // Returns the total seconds played.
  totalPlayed() {
    return Helpers.sumTimeRanges(this.video.played);
  }

  unmute() {
    return SimpleMethods.unmute(this);
  }

  // should be overridden in engines that need to change the startPosition time
  // for the video
  updateStartPosition() {}
}

// This defines public methods related to binding.
bindify(SimpleVideo.prototype);

SimpleVideo.delegatePublicMethods = PublicMethods.delegatePublicMethods;
SimpleVideo.PUBLIC_METHODS = PublicMethods.PUBLIC_METHODS;
SimpleVideo.mediaDataWithAssets = (mediaData, assets) => {
  const result = clone(mediaData);
  result.assets = clone(assets);
  return result;
};

defineEngine('SimpleVideo', SimpleVideo);

export default SimpleVideo;

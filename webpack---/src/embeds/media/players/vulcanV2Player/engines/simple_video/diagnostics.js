import { PLAYER_VERSION } from '../../../../../../utilities/player-version.js';
import { TAGGED_VERSION } from '../../../../../../utilities/hosts.js';

const safe = (fn) => {
  try {
    return fn();
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
};

export const getDiagnosticData = (simpleVideo) => {
  // Use the tagged version if it's available, otherwise use the fallback player version
  const playerVersion =
    TAGGED_VERSION !== '' && TAGGED_VERSION.length > 0 ? TAGGED_VERSION : PLAYER_VERSION;

  const result = {};
  result.player_version = playerVersion;
  result.state = simpleVideo.state;
  result.attributes = simpleVideo.attributes;
  result.currentAsset = simpleVideo.currentAsset();
  if (result.currentAsset && result.currentAsset.url && result.currentAsset.url.length > 100) {
    result.currentAsset.url = `${result.currentAsset.url.substring(0, 97)}...`;
  }
  result.selectedAsset = simpleVideo.selectedAsset();
  if (result.selectedAsset && result.selectedAsset.url && result.selectedAsset.url.length > 100) {
    result.selectedAsset.url = `${result.selectedAsset.url.substring(0, 97)}...`;
  }
  result.getState = safe(() => simpleVideo.getState());
  result.getDuration = safe(() => simpleVideo.getDuration());
  result.getPlaybackRate = safe(() => simpleVideo.getPlaybackRate());
  result.getPlaybackMode = safe(() => simpleVideo.getPlaybackMode());
  result.isSeeking = safe(() => simpleVideo.isSeeking());
  result.getCurrentTime = safe(() => simpleVideo.getCurrentTime());
  result.activeBufferRange = safe(() => simpleVideo.activeBufferRange());
  result.sequentialBufferedRange = safe(() => simpleVideo.sequentialBufferedRange());
  result.getVolume = safe(() => simpleVideo.getVolume());
  result.timeBeforeEndOfBuffer = safe(() => simpleVideo.timeBeforeEndOfBuffer());
  result.lastBufferedTime = safe(() => simpleVideo.lastBufferedTime());
  result.totalBuffered = safe(() => simpleVideo.totalBuffered());
  result.anyBuffered = safe(() => simpleVideo.anyBuffered());
  result.getPreload = safe(() => simpleVideo.getPreload());
  result.rawVideoProps = safe(() => rawVideoProps(simpleVideo));
  return result;
};

const SERIALIZABLE_VIDEO_PROPS = [
  'autoplay',
  'controls',
  'crossOrigin',
  'currentSrc',
  'currentTime',
  'defaultMuted',
  'defaultPlaybackRate',
  'duration',
  'ended',
  'error',
  'loop',
  'muted',
  'networkState',
  'paused',
  'playbackRate',
  'preload',
  'readyState',
  'seeking',
  'src',
  'startDate',
  'volume',
];
const rawVideoProps = (simpleVideo) => {
  const video = simpleVideo.video;
  const result = {};
  for (let i = 0; i < SERIALIZABLE_VIDEO_PROPS.length; i++) {
    let propName = SERIALIZABLE_VIDEO_PROPS[i];
    let propValue = video[propName];
    result[propName] = propValue;
  }
  return result;
};

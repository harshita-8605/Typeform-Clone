export const PUBLIC_METHODS = [
  'activeBufferRange',
  'addTextTracks',
  'anyBuffered',
  'bind',
  'bindNamed',
  'bufferInfo',
  'canDownloadMedia',
  'cancelFullscreen',
  'captureCurrentFrame',
  'changeQuality',
  'changeStream',
  'changeStreamWithoutLoad',
  'changeVideo',
  'currentAsset',
  'defaultAsset',
  'destroy',
  'diagnosticData',
  'eventContext',
  'fit',
  'getAudioTracks',
  'getCurrentQuality',
  'getCurrentTime',
  'getCuts',
  'getDuration',
  'getDurationBeforeCuts',
  'getMediaElement',
  'getMediaType',
  'getPlaybackMode',
  'getPlaybackRate',
  'getPreload',
  'getState',
  'getTimeAfterCuts',
  'getTimeBeforeCuts',
  'getTrim',
  'getVolume',
  'hasIssuedPlay',
  'isChangingVideo',
  'isInitializingFromUnmuted',
  'isInFullscreen',
  'isMuted',
  'isSeeking',
  'isSourceOfBrowserEvent',
  'lastBufferedTime',
  'mute',
  'onEnterFullscreen',
  'onHeightChange',
  'onLeaveFullscreen',
  'onMediaDataChanged',
  'onPlayed',
  'onReady',
  'onWidthChange',
  'pause',
  'play',
  'playType',
  'removeTextTracks',
  'requestFullscreen',
  'reset',
  'seek',
  'seekOnPlay',
  'selectedAsset',
  'selectableAssets',
  'selectableQualities',
  'selectedQuality',
  'sequentialBufferedRange',
  'setAttributes',
  'setCurrentTime',
  'setPlaybackRate',
  'setCuts',
  'setTrim',
  'setVolume',
  'showFirstFrame',
  'stopStreaming',
  'timeBeforeEndOfBuffer',
  'totalBuffered',
  'totalPlayed',
  'trigger',
  'unbind',
  'unbindNamed',
  'unbindAllInNamespace',
  'unmute',
  'updateStartPosition',
];

export const delegateMethods = (methods, objectPrototype, objectFn) => {
  for (let i = 0; i < methods.length; i++) {
    let methodName = methods[i];
    if (!objectPrototype[methodName]) {
      ((methodName) => {
        objectPrototype[methodName] = function (...args) {
          const theObject = objectFn.call(this);
          if (theObject) {
            return theObject[methodName](...args);
          }
          return null;
        };
      })(methodName);
    }
  }
};

export const delegatePublicMethods = (objectPrototype, objectFn) => {
  delegateMethods(PUBLIC_METHODS, objectPrototype, objectFn);
};

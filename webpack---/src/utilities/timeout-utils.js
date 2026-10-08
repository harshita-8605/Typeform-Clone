import { isArray, isEmpty } from 'utilities/obj.js';
import { Wistia } from '../wistia_namespace.ts';

const W = Wistia;

if (Wistia._timeouts == null) {
  Wistia._timeouts = {};
}

// Improved timeouts!
// allows us to
//   1. auto-debounce if an identical key is replaced
//   2. associate timeouts with a specific context, but access them globally
//   3. Clear all timeouts in a specific context
//   4. Do nextTick by not specifying the time argument
// e.g. Wistia.timeout("video1234", function() { ... });
//
// In our implementation, we treat the first dot-delimited value in the key
// as a namespace. This is an optimization since most of our videos prefix
// their timeouts with a uuid. By keeping them in a namespace, it means
// clearTimeouts doesn't need to iterate through _all_ timeouts globally,
// which makes doTimeout itself faster (since it calls clearTimeouts internally).
//
// Returns the timeoutId.
export const doTimeout = (key, fn, time = 1) => {
  if (isArray(key)) {
    key = key.join('.');
  }
  const namespace = timeoutNamespace(key);
  clearTimeouts(key, namespace);
  if (fn) {
    let timeouts = Wistia._timeouts[namespace];
    if (timeouts == null) {
      timeouts = Wistia._timeouts[namespace] = {};
    }
    let timeoutId = setTimeout(() => {
      delete timeouts[key];
      fn();
    }, time);
    timeouts[key] = timeoutId;
    return timeoutId;
  }
  return Wistia._timeouts[namespace][key];
};

// This will clear timeouts matching the key. Key is dot-delimited list
// like:
//
// mynamespace.more_specific.
// mynamespace.anothernamespace.more_specific
//
// We allow passing in namespace as an optimization for doTimeout.
export const clearTimeouts = (key, namespace = null) => {
  if (isArray(key)) {
    key = key.join('.');
  }
  namespace = namespace || timeoutNamespace(key);

  // If there's no namespacing on the input key, then we should treat the
  // input as both a namespace _and_ a key. This handles the namespace case.
  // We handle the key case with our normal logic.
  let timeouts;
  if (namespace === '__global__') {
    timeouts = Wistia._timeouts[key];
    if (timeouts) {
      for (let k in timeouts) {
        let v = timeouts[k];
        clearTimeout(v);
        delete timeouts[k];
      }
    }
  }

  timeouts = Wistia._timeouts[namespace];
  if (timeouts) {
    for (let k in timeouts) {
      let v = timeouts[k];
      if (
        k.indexOf &&
        k.indexOf(key) === 0 &&
        (k.length === key.length || k.charAt(key.length) === '.')
      ) {
        clearTimeout(v);
        delete timeouts[k];
      }
    }
  }

  // Cleaning out namespaces is not particularly efficient, and isn't
  // particularly helpful, so let's only do it once every 5 seconds.
  if (!Wistia.blockSweepTimeouts) {
    Wistia.blockSweepTimeouts = true;
    setTimeout(sweepTimeouts, 0);
    setTimeout(() => {
      Wistia.blockSweepTimeouts = false;
    }, 5000);
  }
};

// Clear out any namespaces that are no longer active
const sweepTimeouts = () => {
  for (let namespace in Wistia._timeouts) {
    let timeouts = Wistia._timeouts[namespace];
    if (isEmpty(timeouts)) {
      delete Wistia._timeouts[namespace];
    }
  }
};

const timeoutNamespace = (key) => {
  const dotIndex = key.indexOf('.');
  if (dotIndex > 0) {
    return key.substring(0, dotIndex);
  }
  return '__global__';
};

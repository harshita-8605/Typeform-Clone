import {
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
  updateLocalStorage,
} from 'utilities/namespacedLocalStorage.js';
import { Wistia } from '../wistia_namespace.ts';

// This localStorage utility can be used in situations where we don't need to
// do very frequent updates or reads. If frequent updates or reads are
// expected, you should use namespacedLocalStorage.js with its own namespace,
// since the entire namespace is deserialized and serialized on read and write
// respectively.

const WISTIA_NAMESPACE = 'wistia';

export const getWistiaLocalStorage = () => {
  return getLocalStorage(WISTIA_NAMESPACE);
};

export const removeWistiaLocalStorage = () => {
  Wistia._localStorage = removeLocalStorage(WISTIA_NAMESPACE);
  return Wistia._localStorage;
};

export const setWistiaLocalStorage = (obj) => {
  Wistia._localStorage = setLocalStorage(WISTIA_NAMESPACE, obj);
  return Wistia._localStorage;
};

export const updateWistiaLocalStorage = (fn) => {
  Wistia._localStorage = updateLocalStorage(WISTIA_NAMESPACE, fn);
  return Wistia._localStorage;
};

import { isArray, getDeep, setDeep, unsetDeep } from 'utilities/obj.js';
import { Wistia } from '../wistia_namespace.ts';

// A simple key/value store implementation
// stored on the Wistia namespace
//
// To set:
//
//     wData("key.path", "val")
//     wData(["key", "path"], "val")
//
// To get
//
//     wData("key.path")
//     wData(["key", "path"])

export const wData = (key, val) => {
  if (!isArray(key)) {
    key = key.split('.');
  }
  if (val != null) {
    setDeep(Wistia, ['_data'].concat(key), val);
  }
  return getDeep(Wistia, ['_data'].concat(key));
};

export const wRemoveData = (key) => {
  if (!isArray(key)) {
    key = key.split('.');
  }
  return unsetDeep(Wistia, ['_data'].concat(key));
};

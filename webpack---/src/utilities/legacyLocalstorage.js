import {
  getWistiaLocalStorage,
  removeWistiaLocalStorage,
  updateWistiaLocalStorage,
} from 'utilities/wistiaLocalStorage.js';
import { getDeep, setDeep, unsetDeep } from 'utilities/obj.js';
import { Wistia } from '../wistia_namespace.ts';

/*
 * DEPRECATED: Use utilities/wistiaLocalStorage.js directly instead.
 *
 * This module has two failings.
 *
 * First, it must include utilities/obj for its deep setting and getting
 * functionality, which is a core part of its API. However, this convenience
 * does not merit the size of its inclusion; if we want to do deep setting and
 * getting, we can just compose with Obj.setDeep and Obj.getDeep at the import site.
 *
 * Second, in order to avoid lots of JSON.parse calls, it keeps a cache that
 * should mirror the contents of localStorage. However, because localStorage
 * data is shared across tabs with the same domain--and because we are never
 * syncing the actual localStorage values here--changes in multiple open tabs
 * will overwrite each other, causing general strangeness.
 */

if (!Wistia._localStorage) {
  Wistia._localStorage = getWistiaLocalStorage();
}

export const uncache = () => {
  Wistia._localStorage = {};
};

export const setOrGet = (key, val, unset = false) => {
  if (val != null) {
    const fn = unset ? unsetDeep : setDeep;
    Wistia._localStorage = updateWistiaLocalStorage((ls) => fn(ls, key, val));
    return val;
  }
  if (key != null) {
    return getDeep(Wistia._localStorage, key);
  }
  return Wistia._localStorage;
};

export const removeLocalStorage = (key) => {
  return setOrGet(key, 'nada', true);
};

export const dumpLocalStorage = removeWistiaLocalStorage;

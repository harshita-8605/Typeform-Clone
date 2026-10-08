import {
  getLocalStorage,
  removeLocalStorage,
  updateLocalStorage,
} from 'utilities/namespacedLocalStorage.js';
import { Wistia } from '../wistia_namespace.ts';

export const deleteViewerPreferences = () => {
  removeLocalStorage(getLocalStorageKey());
};

const getLocalStorageKey = () => {
  return 'wistia-viewer-preferences';
};

export const getViewerPreferences = () => {
  // if viewer preferences are disabled, return an empty object
  if (Wistia._viewerPreferencesEnabled === false) {
    return {};
  }

  return getLocalStorage(getLocalStorageKey());
};

export const getViewerPreference = (preference) => {
  const preferences = getViewerPreferences();

  if (!preferences) {
    return null;
  }

  return preferences[preference];
};

export const setViewerPreference = (preference, value) => {
  // delete the plugin property. fix for captions setting plugin.captions-v1 - which caused a bug
  // as when captions was getting enabled. This can be removed after a couple
  // of weeks or so
  updateLocalStorage(getLocalStorageKey(), (obj) => {
    if (obj.plugin) {
      delete obj.plugin;
    }

    obj[preference] = value;
  });
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import * as preact from 'preact';
import * as hooks from 'preact/hooks';
import * as compat from 'preact/compat';
import { root } from './utilities/root.js';
import { WistiaGlobal } from './types/player-api-types.ts';

root.Wistia ??= {};

// Set up Preact on the namespace for async entry points to use
// Embeds often asynchronously load additional or conditional Preact components, and if they are hook based, they should all use the same instance of Preact.
// This is because Preact tracks hook state using internal module-level variables. And if they are not shared, they will often not work correctly if trying to use
// them in one tree. https://github.com/wistia/player-modern/pull/5297
root.Wistia.Preact ??= { ...preact, hooks, compat };

root.Wistia._destructors ??= {};

root.Wistia._initializers ??= {};

root.Wistia._remoteData ??= new Map();

root.Wistia.api ??= () => {
  console.error('Accessed Wistia.api() before it was initialized');
  return null;
};

// this will be overwritten in _async.coffee
root.Wistia.defineControl ??= () => {
  console.error('Accessed Wistia.defineControl() before it was initialized');
  return null;
};

root.Wistia.EventShepherdManager ??= {};

root.Wistia.mixin ??= <T>(klass: T, obj: Partial<Record<keyof T, unknown>> = {}) => {
  Object.keys(obj).forEach((key) => {
    if (Object.hasOwn(obj, key)) {
      // eslint-disable-next-line no-param-reassign
      klass[key] = obj[key] as unknown as T[keyof T];
    }
  });
};

root.Wistia.playlistMethods ??= new Map();

// will be overwritten in _public_api.coffee
root.Wistia.PublicApi ??= null;

// will be overwritten in _remote_data.js
root.Wistia.uncacheMedia ??= () => {
  console.error('Accessed Wistia.uncacheMedia() before it was initialized');
  return null;
};

// will be overwritten in _visitor_key.js
root.Wistia.VisitorKey ??= null;

// will be overwritten in _visitor_key.js
root.Wistia.visitorKey ??= null;

// will be overwritten in WistiaPlayer.tsx
root.Wistia.wistia ??= undefined;

root.Wistia._liveStreamEventDataPromises ??= {};

root.Wistia._mediaDataPromises ??= {};

root.Wistia._liveStreamPollingPromises ??= {};

root.Wistia.first ??= () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return root.Wistia.api() ?? document.querySelector('wistia-player');
  // 👆 prefer the E-v1 api first, so for translated embeds, it'll use the TranslationApi, otherwise use the first wistia-player on the page
};

export const Wistia = root.Wistia as WistiaGlobal;

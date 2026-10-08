import { assign } from 'utilities/obj.js';
import { Url } from 'utilities/url.js';
import { cachedDetect } from 'utilities/detect.js';
import { isNotNil } from '@wistia/type-guards';
import { readyPublicOver400 } from './assets.js';

const detect = cachedDetect();

const convertStillImageToWebp = (media) => {
  if (media.assets && detect.webp) {
    media.assets = media.assets.map((asset) => {
      // there was a flow with the uploader + notPlayablePlayer where we have assets
      // but they're not ready and don't have urls, so just double check for that here
      if (asset.type === 'still_image' && Object(asset).url) {
        const url = new Url(asset.url);
        url.ext('webp');
        asset.url = url.absolute();
      }

      return asset;
    });
  }
};

const maybeCloneOriginalAsMp4 = (media, options = {}) => {
  if (options.allowOriginalAsMp4 !== true) {
    // only transform if the embed options ask for it
    return;
  }

  const original = media.assets.filter((a) => a.type === 'original')[0];

  if (readyPublicOver400(media.assets).length > 0) {
    // we have a derivative we can show instead
    return;
  }

  media.assets = [
    ...media.assets,
    assign({}, original, {
      display_name: `${original.display_name} copy`,
      container: 'mp4',
      codec: 'h264',
      type: 'mp4_video',
    }),
  ];
};

const maybeAddChannelIdToEmbedOptions = (media, options = {}) => {
  if (isNotNil(options.channelId) && media.embedOptions) {
    media.embedOptions.channelId = options.channelId;
  }
};

const maybeAddChannelPasswordToEmbedOptions = (media, options = {}) => {
  if (isNotNil(options.channelPassword) && media.embedOptions) {
    media.embedOptions.channelPassword = options.channelPassword;
  }
};

const mergeFormCustomizations = (formCustomizations, embedOptions) => {
  if (!formCustomizations || !embedOptions) return;

  if (!embedOptions.plugin) embedOptions.plugin = {};
  if (!embedOptions.plugin.form) embedOptions.plugin.form = {};

  const form = embedOptions.plugin.form;
  if (formCustomizations.form_button_text)
    form.formButtonText = formCustomizations.form_button_text;
  if (formCustomizations.form_lower_text) form.formLowerText = formCustomizations.form_lower_text;
  if (formCustomizations.title) form.title = formCustomizations.title;
};

// The API returns form customization fields (like button text, lower text, and title)
// in a separate `formCustomizations` object rather than inside `embedOptions`. We merge
// them into `embedOptions.plugin.form` here so the form plugin can consume them
// through the same path it uses for all other configuration.
const mergeFormCustomizationsIntoEmbedOptions = (media) => {
  mergeFormCustomizations(media.formCustomizations, media.embedOptions);

  if (Array.isArray(media.translatedMediaData)) {
    for (const entry of media.translatedMediaData) {
      mergeFormCustomizations(entry.formCustomizations, entry.embedOptions);
    }
  }
};

export const mediaDataTransforms = (media, options = {}) => {
  maybeCloneOriginalAsMp4(media, options);
  convertStillImageToWebp(media);
  maybeAddChannelIdToEmbedOptions(media, options);
  maybeAddChannelPasswordToEmbedOptions(media, options);
  mergeFormCustomizationsIntoEmbedOptions(media);
  return media;
};

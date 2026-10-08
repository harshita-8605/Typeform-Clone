import { isNotNil } from '@wistia/type-guards';
import { Wistia } from '../wistia_namespace.ts';
import { mediaDataHost } from './hosts.js';
import { mediaDataTransforms } from './media-data-transforms.js';
import { cacheMediaData, getMediaDataFromCache } from './remote-data-cache.ts';
import type {
  MediaDataServerResponse,
  MediaDataServerErrorResponse,
  MediaData,
  Localization,
} from '../types/player-api-types.ts';
import { isMediaDataError } from './mediaDataError.ts';
import type { PluginConfigs } from '../types/plugins.ts';
import { getPreferredAvailableLanguageIndex } from '../embeds/wistiaPlayer/utilities/getPreferredLanguageIndex.ts';
import { getViewerPreferences } from './viewerPreferences.js';

export type FetchMediaDataOptions = {
  bypassOriginShield?: boolean;
  channelId?: number | null;
  channelPassword?: string | null;
  defaultMediaLanguage?: string;
  deferFetchingToCarousel?: boolean;
  embedHost?: string;
  overrideMediaLanguage?: string;
  password?: string | null;
  plugin?: PluginConfigs;
  skipCache?: boolean;
};

const fetchUnlocalizedMediaData = async (
  hashedId: string,
  options: FetchMediaDataOptions = {},
): Promise<MediaData | MediaDataServerErrorResponse> => {
  const cacheKey = hashedId;

  const mediaDataFromCache = getMediaDataFromCache(cacheKey);
  if (mediaDataFromCache && options.skipCache !== true) {
    return Promise.resolve(mediaDataFromCache);
  }

  if (isNotNil(Wistia._mediaDataPromises[cacheKey]) && options.skipCache !== true) {
    return Wistia._mediaDataPromises[cacheKey];
  }

  const host = mediaDataHost(options) as string;
  const url = new window.URL(`https://${host}/embed/medias/${hashedId}.json`);

  if (isNotNil(options.channelId)) {
    url.searchParams.set('channelId', options.channelId.toString());
  }

  const channelPasswordParam =
    options.channelPassword ?? options.plugin?.passwordProtectedChannel?.password;
  if (isNotNil(channelPasswordParam)) {
    url.searchParams.set('channelPassword', channelPasswordParam);
  }

  if (isNotNil(options.password)) {
    url.searchParams.set('password', options.password);
  }

  if (options.deferFetchingToCarousel) {
    url.searchParams.set('defer_fetching_to_carousel', 'true');
  }

  // See: https://www.fastly.com/documentation/guides/concepts/edge-state/cache/purging/#shielding
  if (options.bypassOriginShield) {
    url.searchParams.set('bos', '1');
  }

  const promise = fetch(url.href)
    .then((resp) => resp.json() as MediaDataServerResponse)
    .then((response: MediaDataServerResponse): MediaData | MediaDataServerErrorResponse => {
      if (isMediaDataError(response)) {
        return response;
      }
      const { media: mediaData } = response as { media: MediaData };

      mediaDataTransforms(mediaData, options);
      cacheMediaData(mediaData.hashedId ?? '', mediaData);

      return mediaData;
    })
    .finally(() => {
      Reflect.deleteProperty(Wistia._mediaDataPromises, cacheKey);
    });

  Wistia._mediaDataPromises[cacheKey] = promise;

  return promise;
};

export const fetchMediaData = async (
  hashedId: string,
  options: FetchMediaDataOptions = {},
): Promise<MediaData | MediaDataServerErrorResponse> => {
  const mediaDataOrError = await fetchUnlocalizedMediaData(hashedId, options);
  if (isMediaDataError(mediaDataOrError)) {
    return mediaDataOrError as MediaDataServerErrorResponse;
  }

  const mediaData = mediaDataOrError as MediaData;

  if (mediaData.localizations == null || mediaData.localizations.length === 0) {
    return mediaData;
  }

  const typedViewerPreferences = getViewerPreferences() as Record<string, unknown>;
  const localizationViewerPreferences = typedViewerPreferences.localization as
    | Partial<Localization>
    | undefined;

  // The order is meaningful here. Languages earlier in the array take priority
  // over those later in the array.
  const preferredLanguages: string[] = [];
  if (options.overrideMediaLanguage != null) {
    preferredLanguages.push(options.overrideMediaLanguage);
  }
  if (localizationViewerPreferences?.bcp47LanguageTag != null) {
    preferredLanguages.push(localizationViewerPreferences.bcp47LanguageTag);
  }
  if (options.defaultMediaLanguage != null) {
    preferredLanguages.push(options.defaultMediaLanguage);
  }

  // Remove duplicates, keeping the first occurrence
  const uniquePreferredLanguages = preferredLanguages.filter(
    (lang, index) => preferredLanguages.indexOf(lang) === index,
  );

  // First look for exact bcp-47 language code matches
  let preferredLanguageIndex = getPreferredAvailableLanguageIndex(
    mediaData.localizations.map((loc) => loc.bcp47LanguageTag),
    uniquePreferredLanguages,
  );

  // If none found, look for exact wistiaLanguageCode matches
  if (preferredLanguageIndex === -1) {
    preferredLanguageIndex = getPreferredAvailableLanguageIndex(
      mediaData.localizations.map((loc) => loc.wistiaLanguageCode),
      uniquePreferredLanguages,
    );
  }

  // If still no match, default to the browser language preferences
  if (preferredLanguageIndex === -1) {
    preferredLanguageIndex = getPreferredAvailableLanguageIndex(
      mediaData.localizations.map((loc) => loc.bcp47LanguageTag),
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      [...(navigator.languages ?? ['en'])],
    );
  }

  if (preferredLanguageIndex >= 0) {
    const preferredLocalization = mediaData.localizations[preferredLanguageIndex];

    if (mediaData.hashedId === preferredLocalization.hashedId) {
      return mediaData;
    }

    // For alternate audio, always load the source media (not the alternate audio's hashedId)
    // The audio track switching is handled by HLS, not by loading a different media
    if (preferredLocalization.localizationIntent === 'alternate_audio') {
      return mediaData;
    }

    return fetchUnlocalizedMediaData(preferredLocalization.hashedId, {
      ...options,
    });
  }

  return mediaData;
};

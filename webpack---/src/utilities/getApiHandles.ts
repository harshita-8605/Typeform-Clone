import type { PublicApi, WistiaContainerHTMLElement } from '../types/player-api-types.ts';
import { getAllApiEmbedElements } from './getEmbedElements.ts';
import { wlog } from './wlog.js';
import { wData } from './wistiaData.js';
import { ensureString } from './hashedId.ts';

export type MatcherFunction = (
  video?: MatcherFunction | PublicApi | WistiaContainerHTMLElement | 'removed' | null,
) => void;

/**
 * Initialized embeds are API embeds that have a wistiaApi property set on the
 * container. container.wistiaApi is set on legacy embeds in _public_api.js
 * @returns {PublicApi[]}
 */
export const getAllInitializedEmbedApiHandles = (): (PublicApi | 'removed' | undefined)[] => {
  if (wData('video') === undefined) {
    return [];
  }
  return Object.values(wData('video') as PublicApi[]);
};

/**
 * Get all initialized instances of the iframe api
 * @returns {PublicApi[]}
 */
export const getAllIframeApiHandles = (): (PublicApi | 'removed' | undefined)[] => {
  if (wData('iframe_api') === undefined) {
    return [];
  }
  return Object.values(wData('iframe_api') as PublicApi[]);
};

/**
 * Get all initialized instances of the API, inclusive of both
 * iframe API and regular embed public API
 * @returns {PublicApi[]}
 */
export const getAllApiHandles = (): (PublicApi | 'removed' | undefined)[] => {
  return getAllInitializedEmbedApiHandles().concat(getAllIframeApiHandles());
};

/**
 * Get a single API handle by matcher
 * @param {Function | HTMLElement | number | string | undefined} matcher - The matcher
 * @returns {PublicApi | null}
 */
export const getOneApiHandle = (
  matcher?: HTMLElement | MatcherFunction | number | string,
  // fn?: MatcherFunction | undefined, // TODO: Handle the case where functions are provided
): MatcherFunction | PublicApi | WistiaContainerHTMLElement | 'removed' | null => {
  // If no matcher is provided, return the first api handle
  if (matcher === undefined) {
    return getAllApiHandles()[0] ?? null;
  }

  /* TODO: Handle the case where functions are provided to completely replicate
   * the original behavior of the `Wistia.api` function from _async.coffee
   * This will also require us to port over the Wistia.api.onFind function
   *
  // If a callback is provided, return the first api handle that matches
  if (fn !== undefined) {
    return onFindApiHandle(matcher, fn);
  }

  // If the matcher provided is a function, return the first api handle that matches
  if (typeof matcher === 'function') {
    return onFindApiHandle(matcher);
  }
   *
   * END TODO
   */

  // TODO: Consider using the strategy pattern here to isolate the logic for these cases a little more!
  let container: WistiaContainerHTMLElement | null = null;
  if (typeof matcher === 'string') {
    const query = matcher;

    // Find by DOM ID
    // Prefer unique-id attribute over id attribute
    container =
      document.querySelector(`[unique-id='${query}']`) ??
      (document.getElementById(query) as WistiaContainerHTMLElement | null);

    // Or find by fuzzy match on hashed ID or container
    if (container === null) {
      const apiHandles = getAllApiHandles();
      const matchedHandle = apiHandles.find((handle: PublicApi) => {
        // note: eslint flagged the logical OR below but it's intentional and necessary
        // see: https://github.com/wistia/player-modern/pull/2964#discussion_r1274876654

        if (handle.hashedId()?.startsWith(query) || handle.container?.id.startsWith(query)) {
          return handle;
        }

        // not all public api handles will have this method
        if ('mediaLanguages' in handle && 'languageToLocalization' in handle) {
          const queryMatchesLocalization = handle.mediaLanguages().some((language) => {
            const localization = handle.languageToLocalization(language);
            return localization != null && ensureString(localization.hashedId).startsWith(query);
          });

          if (queryMatchesLocalization) {
            return handle;
          }

          const queryMatchesSourceMediaId = ensureString(
            handle._mediaData?.sourceHashedId,
          ).startsWith(query);

          if (queryMatchesSourceMediaId) {
            return handle;
          }
        }

        return null;
      });
      if (matchedHandle !== 'removed') {
        container = (matchedHandle?.container as WistiaContainerHTMLElement | null) ?? null;
      }
    }
  } else if (typeof matcher === 'number') {
    let index = matcher;
    const apiHandles = getAllApiHandles();
    // Allow negative indices to get from the end
    if (index < 0) {
      index = apiHandles.length + index;
    }

    const apiHandle = apiHandles[index];
    if (apiHandle !== undefined && apiHandle !== 'removed') {
      container = apiHandle.container ?? null;
    }
  } else if (matcher instanceof HTMLElement) {
    container = matcher as WistiaContainerHTMLElement;
  } else {
    wlog.error('Unrecognized matcher', matcher);
  }

  // If our container is a wistia-player web component, it handles its own API
  // and we can just return it.
  if (container?.tagName === 'WISTIA-PLAYER') {
    // TODO: We need to call the PublicApi methods for now, but once WistiaPlayer
    // is more built out we should be able to just send that over directly
    return container.deprecatedApiDoNotUse as unknown as PublicApi;
  }

  // If the container has an API handle that isn't 'removed', return it
  // More on 'removed': https://github.com/wistia/player-modern/pull/1280
  if (container?.wistiaApi !== undefined && container.wistiaApi !== 'removed') {
    return container.wistiaApi as unknown as PublicApi;
  }
  return null;
};

/**
 * Get a single API handle by ONLY hashed id, not by container id
 * @param {number | string | undefined} hashedId
 * @returns {PublicApi | null}
 */
export const getOneApiHandleFromHashedId = (
  hashedId: string,
): MatcherFunction | PublicApi | WistiaContainerHTMLElement | 'removed' | null => {
  let container: WistiaContainerHTMLElement | null = null;
  const query = hashedId;

  // Find by fuzzy match on hashed ID
  const apiHandles = getAllApiHandles();
  const matchedHandle = apiHandles.find((handle: PublicApi) => {
    if (handle.hashedId()?.startsWith(query)) {
      return handle;
    }
    return null;
  });

  if (matchedHandle !== 'removed') {
    container = (matchedHandle?.container as WistiaContainerHTMLElement | null) ?? null;
  }

  // If our container is a wistia-player web component, it handles its own API
  // and we can just return it.
  if (container?.tagName === 'WISTIA-PLAYER') {
    // TODO: We need to call the PublicApi methods for now, but once WistiaPlayer
    // is more built out we should be able to just send that over directly
    return container.deprecatedApiDoNotUse as unknown as PublicApi;
  }

  // If the container has an API handle that isn't 'removed', return it
  // More on 'removed': https://github.com/wistia/player-modern/pull/1280
  if (container?.wistiaApi !== undefined && container.wistiaApi !== 'removed') {
    return container.wistiaApi as unknown as PublicApi;
  }
  return null;
};

/**
 * Get all (non-iframe) API handles in the order they appear in the DOM
 * @returns {PublicApi[]}
 */
export const getAllApiHandlesByDomOrder = (): (PublicApi | 'removed' | undefined)[] => {
  // Legacy embeds have a wistia_embed_initialized class added to the container
  // when their public api is initialized and set (container.wistiaApi)
  const legacyHandles = Array.from(
    getAllApiEmbedElements('wistia_embed_initialized') as unknown as WistiaContainerHTMLElement[],
  ).reduce((accumulator: PublicApi[], legacyContainer: WistiaContainerHTMLElement) => {
    // Make sure the api has been initialized, set, and is not marked as 'removed'
    if (
      legacyContainer.wistiaApi !== undefined &&
      legacyContainer.wistiaApi !== 'removed' &&
      legacyContainer.wistiaApi !== null
    ) {
      accumulator.push(legacyContainer.wistiaApi);
    }
    return accumulator;
  }, []);

  const wistiaPlayerHandles = Array.from(document.querySelectorAll('wistia-player')).reduce(
    (accumulator: PublicApi[], container: WistiaContainerHTMLElement) => {
      if (
        container.deprecatedApiDoNotUse !== undefined &&
        container.deprecatedApiDoNotUse !== 'removed' &&
        container.deprecatedApiDoNotUse !== null
      ) {
        accumulator.push(container.deprecatedApiDoNotUse);
      }
      return accumulator;
    },
    [],
  );

  return [...legacyHandles, ...wistiaPlayerHandles];
};

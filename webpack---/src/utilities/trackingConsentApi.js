import { globalTrigger } from 'utilities/globalBindAndTrigger.js';
import { getWistiaLocalStorage, updateWistiaLocalStorage } from 'utilities/wistiaLocalStorage.js';
import { getAllApiHandles } from 'utilities/getApiHandles.ts';
import { Wistia } from '../wistia_namespace.ts';

export const migrateLegacyVisitorTracking = () => {
  const legacyIsEnabled = getWistiaLocalStorage().visitorTrackingEnabled;
  if (legacyIsEnabled != null) {
    // Migrate old structure to new structure
    //
    // old:
    // localStorage
    //   visitorTrackingEnabled: boolean
    //
    // new:
    // localStorage
    //   visitorTracking: {
    //     isEnabled: boolean,
    //     updatedAt: timestamp,
    //   }
    //
    updateWistiaLocalStorage((ls) => delete ls.visitorTrackingEnabled);
    Wistia._visitorTracking = {};
    Wistia._visitorTracking[Wistia._visitorTrackingDomain] = {
      isEnabled: legacyIsEnabled,
      updatedAt: Date.now(),
    };
    updateWistiaLocalStorage((ls) => (ls.visitorTracking = Wistia._visitorTracking));
  }
};

if (!Wistia._visitorTrackingDomain) {
  Wistia._visitorTrackingDomain = location.hostname || '';
}

// Initialize from localStorage, or with an empty hash if not set.
if (!Wistia._visitorTracking) {
  migrateLegacyVisitorTracking();
  Wistia._visitorTracking = getWistiaLocalStorage().visitorTracking || {};
}

export const consent = (val) => {
  if (val == null) {
    return isVisitorTrackingEnabled();
  }
  return setVisitorTrackingEnabled(val);
};
Wistia.consent = consent;

export const setVisitorTrackingEnabled = (val, domain = Wistia._visitorTrackingDomain) => {
  if (val === 'default') {
    delete Wistia._visitorTracking[domain];
  } else {
    Wistia._visitorTracking[domain] = {
      isEnabled: `${val}` === 'true',
      updatedAt: Date.now(),
    };
  }
  updateWistiaLocalStorage((obj) => (obj.visitorTracking = Wistia._visitorTracking));
  globalTrigger('visitortrackingchange', val);

  const allWistiaPlayers = [...document.getElementsByTagName('wistia-player')];
  allWistiaPlayers.forEach((player) => {
    player.dispatchEvent(
      new CustomEvent('visitor-tracking-change', { detail: { isTrackingEnabled: val } }),
    );
  });
};

const isCurrentDomainOrAnyParentDomainsEnabled = () => {
  if (Wistia._visitorTrackingDomain) {
    const domainParts = Wistia._visitorTrackingDomain.split('.');
    while (domainParts.length > 0) {
      const entry = Wistia._visitorTracking[domainParts.join('.')];
      const enabledVal = entry && entry.isEnabled;
      if (enabledVal != null) {
        return enabledVal;
      }
      domainParts.shift();
    }
  }

  // returns undefined instead of false as a result so that we can have
  // different behavior if it has not been set.
};

export const isVisitorTrackingEnabled = () => {
  if (typeof Wistia._visitorTracking === 'boolean') {
    // Legacy. We previously persisted this data as a boolean
    return Wistia._visitorTracking;
  }

  if (Wistia._visitorTracking) {
    // _visitorTracking has been set. Let's check the value for the current
    // domain. And if that's set, we return.
    const isEnabledVal = isCurrentDomainOrAnyParentDomainsEnabled();
    if (isEnabledVal != null) {
      return Boolean(isEnabledVal);
    }
  }

  const apis = getAllApiHandles();

  if (Wistia.channel && Wistia.channel.all) {
    try {
      apis.push(...Wistia.channel.all());
    } catch (e) {
      // If Wistia.api.all() is called before Wistia._data is setup, this will throw
      // an exception. That's okay--it just means there are effectively no
      // channel embeds yet.
    }
  }

  // By default, if any videos have privacy mode enabled, then we disable
  // visitor tracking for all videos on the page. In practice, we would only
  // see this occur if videos from multiple accounts--with different privacy
  // mode settings--appear on the same page.
  const isPrivacyModeEnabled =
    apis.some((api) => {
      const data = api._mediaData || api._galleryData || {};
      return data.privacyMode === true;
    }) || hasRegisteredPrivacyModeSource();

  return !isPrivacyModeEnabled;
};

// Embeds that aren't API handles or channels -- form embeds, and any future
// non-player surface -- register their account's privacy mode here.
//
// Without this, the scan above only sees media handles, so a page with a form
// embed and no video reports privacy mode as OFF no matter what the account is
// set to, and consent() returns true for a privacy-mode account.
export const registerPrivacyModeSource = (key, privacyMode) => {
  Wistia._privacyModeSources ??= {};
  Wistia._privacyModeSources[key] = privacyMode === true;
};

export const unregisterPrivacyModeSource = (key) => {
  if (Wistia._privacyModeSources) {
    delete Wistia._privacyModeSources[key];
  }
};

const hasRegisteredPrivacyModeSource = () =>
  Object.values(Wistia._privacyModeSources || {}).some(Boolean);

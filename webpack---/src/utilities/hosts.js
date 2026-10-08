import { root } from 'utilities/root.js';
import { Url, proto as urlProto } from 'utilities/url.js';
import { appHostname, getSubdomainSuffixHostname } from '../appHostname.js';

const APP_WISTIA_COM = appHostname('app');
const CDN_FAST_PROTECTED_WISTIA_COM = appHostname('fast-protected');
const CDN_FAST_WISTIA_COM = appHostname('fast');
const CDN_FAST_WISTIA_CANARY = process.env.FAST_HOSTNAME_CANARY;

export const EMBED_HOST = process.env.EMBED_HOST;

export const PROD_FAST_HOSTNAME_NET = 'fast.wistia.net';
export const PROD_FAST_HOSTNAME_COM = 'fast.wistia.com';

export const PROD_EMBED_HOST = 'embed.wistia.com';
export const PROD_SSL_EMBED_HOST = 'embed-ssl.wistia.com';

export const PROD_FASTLY_SSL_HOST = 'embed-fastly.wistia.com';

export const SSL_EMBED_HOST = process.env.SSL_EMBED_HOST;

export const TAGGED_VERSION = process.env.TAGGED_VERSION || '';

export const CURRENT_SHA = process.env.CURRENT_SHA || '';

const DEFAULT_PROTOCOL = (() => {
  if (typeof window !== 'undefined' && root === window && root.location) {
    return root.location.protocol;
  }
  return 'https:';
})();

const sslOrNonSsl = (protocol, sslHost, nonSslHost) => {
  return protocol === 'https:' ? sslHost : nonSslHost;
};

export const deliveryHost = (protocol = DEFAULT_PROTOCOL) => {
  return sslOrNonSsl(protocol, SSL_EMBED_HOST, EMBED_HOST);
};

export const appHost = () => {
  return APP_WISTIA_COM;
};
/**
 * Checks if we're running in a cloud dev environment or exposing a public endpoint
 * via a dev metal tunnel and returns the appropriate fast hostname
 * @returns {string|null} The fast hostname for cloud dev environment, or null if not in cloud dev
 */
export const getDevFastHostname = () => {
  const fastDevHostname = getSubdomainSuffixHostname('fast');
  if (fastDevHostname) {
    return fastDevHostname;
  }
  return null;
};

/**
 * @param {string} embedHost
 * @returns {string}
 */
export const cdnFastWistiaComHost = (embedHost = undefined) => {
  if (embedHost) {
    return embedHost;
  }

  const devFastHostname = getDevFastHostname();
  if (devFastHostname) {
    return devFastHostname;
  }

  return CDN_FAST_WISTIA_COM;
};

export const cdnFastProtectedWistiaComHost = (assetHost) => {
  if (assetHost) {
    return assetHost;
  }
  return CDN_FAST_PROTECTED_WISTIA_COM;
};

export const cdnFastWistiaNetHost = () => {
  const devFastHostname = getDevFastHostname();
  if (devFastHostname) {
    return devFastHostname;
  }

  const hostName = process.env.BASE_HOSTNAME || process.env.FAST_HOSTNAME_NET;
  return `fast.${hostName}`;
};

export const cdnFastWistiaCanaryHost = () => {
  return CDN_FAST_WISTIA_CANARY;
};
// We run this immediately because we'll be guaranteed that E-v1 is in the DOM
// when this is executing--unless we're loading a legacy thing like
// playlist-v1.js or embed-shepherd_v1.js. We can use the result to determine
// what host we should load other dynamic assets on.
export const eV1Url = (() => {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (s.src) {
      const url = new Url(s.src);

      // Check that this is definitely our script.
      const pathIsEv1 = /\/assets\/external\/E-v1?\.js$/.test(url.rawPath);
      const hasKnownHost =
        url.host === cdnFastWistiaComHost() ||
        url.host === cdnFastWistiaNetHost() ||
        url.host === cdnFastWistiaCanaryHost();

      // Check that the script's protocol is sensible for the page we're on.
      const usesHttpsIfRequired = location.protocol === 'https:' && url.protocol === 'https:';
      const isProtocolRelative = url.protocol === '' || url.protocol == null;
      const protoIsSane =
        usesHttpsIfRequired || isProtocolRelative || location.protocol === 'http:';

      // It's possible there are multiple versions of the script and one failed
      // to load. Let's use the domain that succeeded.
      const scriptHasLoaded = !s.readyState || /loaded|complete/.test(s.readyState);

      if (pathIsEv1 && hasKnownHost && protoIsSane && scriptHasLoaded) {
        return url;
      }
    }
  }

  // If we can't find an instance of E-v1 matching
  return new Url(`${urlProto()}//${cdnFastWistiaNetHost()}/E-v1.js`);
})();

/**
 * @returns { string } string of the host
 */
export const eV1Host = () => {
  return eV1Url.host;
};

/**
 * @returns { string } string of the host with port
 */
export const eV1HostWithPort = () => {
  if (eV1Url.port) {
    return `${eV1Host()}:${eV1Url.port}`;
  }

  return eV1Host();
};

/**
 * @returns { string } string of the protocol
 */
export const eV1Protocol = () => {
  return eV1Url.protocol;
};

export const mediaDataHost = (options = {}) => {
  // If embedHost is specified, just use that.
  if (options.embedHost) {
    return forceValidFastWistiaHost(options.embedHost);
  }

  // Try to match whatever host E-v1 is set to by default.
  return eV1HostWithPort();
};

export const metricsHost = () => {
  const hostname = process.env.BASE_HOSTNAME ? process.env.BASE_HOSTNAME : process.env.METRICS_HOST;

  return `pipedream.${hostname}`;
};

const VALID_PRODUCTION_HOSTS = ['wistia.net', 'wistia.com'];

// We have some non-production hosts in here to allow connecting to the player via ngrok - which
// is used for testing Live in VMA.
export const VALID_FASTLY_HOSTS = [
  ...VALID_PRODUCTION_HOSTS,
  'wistia.mx', // ngrok hosts
  'wistia.dev',
  'wistia.tech',
  'wistia.am',
  'wistia.se',
  'wistia.io', // development
  'wistia.st', // staging
];

const VALID_FASTLY_HOSTS_R = new RegExp(
  `(${VALID_FASTLY_HOSTS.map((h) => `\\.${h.replace('.', '\\.')}`).join('|')})$`,
);

export const forceValidFastWistiaHost = (host) => {
  if (host && VALID_FASTLY_HOSTS_R.test(host)) {
    return host;
  }

  return eV1HostWithPort();
};

/**
 * Checks to see if the window location is a page that's hosted by wistia,
 * e.g., https://app.wistia.com, http://player.wistia.io, https://customer-name.wistia.com
 *
 * If so, return false.
 *
 * @returns boolean
 */
export const isEmbedOnACustomerPage = () => {
  return window.location.href.match(/^http(s)?:\/\/(\S)*.wistia.(io|test|st|com)/gi) === null;
};

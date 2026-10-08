import { doTimeout } from 'utilities/timeout-utils.js';
import { wlog } from 'utilities/wlog.js';
import { merge } from 'utilities/obj.js';
import { pageLoaded } from 'utilities/elem.js';
import { proto as urlProto } from 'utilities/url.js';
import { metricsHost } from 'utilities/hosts.js';
import { isVisitorTrackingEnabled } from 'utilities/trackingConsentApi.js';
import { Wistia } from '../wistia_namespace.ts';

const W = Wistia;

if (Wistia._metricsCache == null) {
  Wistia._metricsCache = {};
}

const METRICS_CACHE = Wistia._metricsCache;

export const send = (type, key, val, extraData = {}) => {
  try {
    if (METRICS_CACHE.toMput == null) {
      METRICS_CACHE.toMput = [];
    }
    if (METRICS_CACHE.requestId == null) {
      METRICS_CACHE.requestId = 0;
    }

    const messageObj = merge(
      {
        type,
        key,
        value: val != null ? val : null,
        request_id: METRICS_CACHE.requestId,
      },
      extraData,
    );

    const serialized = JSON.stringify(messageObj);
    wlog.debug('send metrics', serialized);
    METRICS_CACHE.toMput.push(serialized);

    doTimeout(
      'metrics.debounce',
      () => {
        pageLoaded(() => {
          msend.apply(this, METRICS_CACHE.toMput);
          METRICS_CACHE.toMput = [];
          METRICS_CACHE.requestId += 1;
        });
      },
      500,
    );
  } catch (e) {
    wlog.error(e);
  }
};

export const msend = (...messages) => {
  if (!isVisitorTrackingEnabled()) {
    return;
  }
  const url = `${urlProto()}//${metricsHost()}/mput?topic=metrics`;
  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: messages.join('\n'),
  })
    .then((response) => {
      if (!response.ok) {
        // If fetch returns a response with an HTTP error code,
        // print an error in the console
        console.error(response);
      }
    })
    .catch((reason) => {
      // If fetch fails (such as when this URL is blocked by an ad blocking extension),
      // print an error in the console
      console.error(reason);
    });
};

export const count = (key, val = 1, extraData = {}) => {
  return send('count', key, val, extraData);
};

export const sample = (key, val, extraData) => {
  return send('sample', key, val, extraData);
};

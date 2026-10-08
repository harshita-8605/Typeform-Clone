const makeCacheable = (namespace) => {
  return (object, cacheKey, fn) => {
    init(namespace, object);
    if (isCached(namespace, object, cacheKey)) {
      return getFromCache(namespace, object, cacheKey);
    }
    const val = fn();
    cache(namespace, object, cacheKey, val);
    return val;
  };
};

const makeNamespace = (namespace) => {
  return (obj) => {
    if (obj[namespace] == null) {
      obj[namespace] = {};
    }
    return obj[namespace];
  };
};

const isCached = (namespace, object, cacheKey) => {
  return getFromCache(namespace, object, cacheKey) != null;
};

const getFromCache = (namespace, object, cacheKey) => {
  init(namespace, object);
  return object[namespace][cacheKey];
};

const init = (namespace, object) => {
  if (object[namespace] == null) {
    object[namespace] = {};
  }
};

const cache = (namespace, object, cacheKey, value) => {
  init(namespace, object);
  object[namespace][cacheKey] = value;
};

const uncache = (namespace, object, cacheKey) => {
  init(namespace, object);
  delete object[namespace][cacheKey];
};

const uncacheNamespace = (namespace, object) => {
  object[namespace] = {};
};

export { makeCacheable, uncacheNamespace, uncache, makeNamespace };

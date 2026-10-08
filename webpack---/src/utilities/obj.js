import { assign } from 'utilities/assign.js';

// Old trick to clone arrays, i.e. `aps.call(array)`.
const aps = Array.prototype.slice;

const merge = (obj1, ...objs) => {
  if (objs.length === 0) {
    return obj1;
  }
  for (let i = 0; i < objs.length; i++) {
    mergeOne(obj1, objs[i]);
  }
  return obj1;
};

// Recursively merge the leaf values of obj2 into obj1. obj1 is modified
// in-place. Accepts objects or arrays. Always returns obj1.
//
// By default, we do not transform any merged values.
//
// We also use a non-ideal legacy strategy when merging null/undefined
// values from obj2: they will _delete_ corresponding keys in obj1. The more
// correct solution seems like it would be to _never_ delete from obj1, or
// at least to only delete `undefined` values, but maybe not null. We _may_
// be able to just make this change, but let's do one thing at a time.
const mergeOne = (
  obj1,
  obj2,
  transformerFn = identityFunc,
  shouldDeleteFn = legacyShouldDeleteFromMerge,
) => {
  if (isArray(obj2)) {
    if (!isArray(obj1)) {
      obj1 = [];
    }
    for (let i = 0; i < obj2.length; i++) {
      let v = obj2[i];
      // note that setting an index of an array will naturally increase the
      // length of the array. Array#push() is not necessary.
      if (obj1[i] == null && v != null) {
        if (isArray(v)) {
          obj1[i] = [];
        } else if (isObject(v)) {
          obj1[i] = {};
        }
      }
      const result = mergeOne(obj1[i], v, transformerFn);
      if (shouldDeleteFn(obj2, i, result)) {
        delete obj1[i];
      } else {
        obj1[i] = result;
      }
    }
    return transformerFn(obj1);
  }
  if (isObject(obj2)) {
    for (let k in obj2) {
      if (Object.hasOwn(obj2, k) && (Object.hasOwn(obj1, k) || obj1[k] == null)) {
        let v = obj2[k];
        if (isArray(v)) {
          if (!isArray(obj1[k])) {
            obj1[k] = [];
          }
          mergeOne(obj1[k], v, transformerFn);
          obj1[k] = transformerFn(obj1[k]);
        } else if (isObject(v)) {
          if (!isObject(obj1[k])) {
            obj1[k] = {};
          }
          mergeOne(obj1[k], v, transformerFn);
          obj1[k] = transformerFn(obj1[k]);
        } else if (obj1 == null) {
          obj1 = {};
          if (!shouldDeleteFn(obj2, k, v)) {
            obj1[k] = transformerFn(v);
          }
        } else if (shouldDeleteFn(obj2, k, v)) {
          delete obj1[k];
        } else {
          obj1[k] = transformerFn(v);
        }
      }
    }
    return transformerFn(obj1);
  }
  // obj2 is not an object that can be cloned. Since we may recurse down
  // to this level, we should just return obj2, since it will overwrite
  // obj1.
  return transformerFn(obj2);
};

const identityFunc = (v) => {
  return v;
};

// When merging, delete key from obj1 if the value from obj2 is null or
// undefined.
const legacyShouldDeleteFromMerge = (obj, k, v) => {
  return v == null;
};

const clone = (obj, transformerFn) => {
  if (isArray(obj)) {
    return mergeOne([], obj, transformerFn);
  }
  return mergeOne({}, obj, transformerFn);
};

const getDeep = (obj, parts, create) => {
  if (typeof parts === 'string') {
    parts = parts.split('.');
  } else {
    parts = aps.call(parts);
  }

  let lastObj = obj;
  let lastP;
  while (obj != null && parts.length) {
    let p = parts.shift();
    if ((obj[p] === undefined || (!isObject(obj[p]) && !isArray(obj[p]))) && create) {
      if (p === 0) {
        obj = lastObj[lastP] = [];
        obj[p] = {};
      } else {
        obj[p] = {};
      }
    }
    lastObj = obj;
    lastP = p;

    // Only descend into properties that the object directly owns. getDeep({}, '__proto__')
    // See for security vulnerability reproduction.
    // https://github.com/wistia/player-modern/issues/1800
    if (Object.hasOwn(obj, p)) {
      obj = obj[p];
    } else {
      obj = undefined;
    }
  }

  return obj;
};

const setDeep = (obj, parts, value) => {
  return setAndMaybeDeleteUndefined(obj, parts, value, true);
};

const setAndPreserveUndefined = (obj, parts, value) => {
  return setAndMaybeDeleteUndefined(obj, parts, value, false);
};

const setAndMaybeDeleteUndefined = (obj, parts, value, shouldDeleteUndefined = true) => {
  if (typeof parts === 'string') {
    parts = parts.split('.');
  } else {
    parts = aps.call(parts);
  }
  const prop = parts.pop();
  obj = getDeep(obj, parts, true);
  if (obj != null && (isObject(obj) || isArray(obj)) && prop != null) {
    if (!shouldDeleteUndefined || value != null) {
      obj[prop] = value;
    } else {
      delete obj[prop];
    }
  } else {
    // nothing to set or delete
    return undefined;
  }
};

const unsetDeep = (obj, parts) => {
  return setDeep(obj, parts);
};

const exists = (obj, name) => {
  return getDeep(obj, name) !== undefined;
};

const cast = (maybeStr) => {
  if (maybeStr == null) {
    return maybeStr;
  }

  if (isObject(maybeStr) || isArray(maybeStr)) {
    return castDeep(maybeStr);
  }

  return castStr(`${maybeStr}`, maybeStr);
};

const castStr = (str, defaultRet = str) => {
  if (/^-?[1-9]\d*?$/.test(str)) {
    return parseInt(str, 10);
  }
  if (str === '0' || str === '-0') {
    return 0;
  }
  if (/^-?\d*\.\d+$/.test(str)) {
    return parseFloat(str);
  }
  if (/^true$/i.test(str)) {
    return true;
  }
  if (/^false$/i.test(str)) {
    return false;
  }
  return defaultRet;
};

// Given an object or array, iterates over each leaf and casts the value.
const castDeep = (obj) => {
  const castTransformer = (val) => {
    if (typeof val === 'string') {
      return castStr(val);
    }
    return val;
  };
  const dontDeleteAnything = () => false;
  return mergeOne(obj, obj, castTransformer, dontDeleteAnything);
};

const only = (hash, keys) => {
  const result = {};
  const keyHash = {};
  for (let i = 0; i < keys.length; i++) {
    keyHash[keys[i]] = true;
  }
  for (let k in hash) {
    if (keyHash[k]) {
      result[k] = hash[k];
    }
  }
  return result;
};

const except = (hash, keys) => {
  const result = {};
  const keyHash = {};
  for (let i = 0; i < keys.length; i++) {
    keyHash[keys[i]] = true;
  }
  for (let k in hash) {
    if (!keyHash[k]) {
      result[k] = hash[k];
    }
  }
  return result;
};

// Advanced sorting and filtering so we can be expressive and concise when
// choosing assets.
//
// Defined at the class level so it's easier to test sorting and filtering.
const select = (arr, keyPairs) => {
  const result = [];

  const isFn = typeof keyPairs === 'function';
  const filterFn = isFn ? keyPairs : null;

  for (let i = 0; i < arr.length; i++) {
    let elem = arr[i];
    if (isFn) {
      // Filter by function. This gives the most freedom.
      if (filterFn(elem)) {
        result.push(elem);
      }
    } else {
      // Select the asset if all keyPairs of the object match. Common.
      let matching = true;
      for (let k in keyPairs) {
        let v = keyPairs[k];
        if (v instanceof Array) {
          // Range check.
          if (!elem[k] || elem[k] < v[0] || elem[k] > v[1]) {
            matching = false;
            break;
          }
        } else if (v instanceof RegExp) {
          // Regular Expression check.
          if (!v.test(elem[k])) {
            matching = false;
            break;
          }
        } else if (v instanceof MultipleValues) {
          let anyMatch = false;
          for (let j = 0; j < v.values.length; j++) {
            let value = v.values[j];
            if (elem[k] === value) {
              anyMatch = true;
              break;
            }
          }
          if (!anyMatch) {
            matching = false;
            break;
          }
        } else if (typeof v === 'function') {
          if (elem[k] == null || !v(elem[k])) {
            matching = false;
            break;
          }
        } else if (elem[k] !== v) {
          // Exact match.
          matching = false;
          break;
        }
      }
      if (matching) {
        result.push(elem);
      }
    }
  }

  return result;
};

// This is just a way to box multiple values in a semantic way, to help us
// differentiate between AND/OR/Range type situations.
const MultipleValues = function (values) {
  const self = this;

  const construct = function () {
    self.values = values;
  };

  construct();

  return self;
};

const values = (...values) => {
  return new MultipleValues(values);
};

const sort = (arr, keys) => {
  const isFn = typeof keys === 'function';
  const filterFn = isFn ? keys : null;
  const result = aps.call(arr);

  // Sort results with this option.
  if (isFn) {
    // Sort via sort functions. This gives the most freedom.
    result.sort(filterFn);
  } else {
    // Convenience for sorting by one or many properties. Can either pass an
    // array or a comma separated list.
    result.sort((a, b) => {
      let sortBys;
      if (keys instanceof Array) {
        sortBys = clone(keys);
      } else {
        sortBys = keys.split(/\s*,\s*/);
      }
      let ret = 0;
      while (ret === 0 && sortBys.length > 0) {
        let pieces = sortBys.shift().split(/\s+/);
        let sortBy = pieces[0];
        let dir = pieces[1];
        dir = dir === 'desc' ? -1 : 1;
        if (a[sortBy] < b[sortBy]) {
          ret = -1 * dir;
          break;
        } else if (a[sortBy] === b[sortBy]) {
          ret = 0;
        } else {
          ret = 1 * dir;
          break;
        }
      }
      return ret;
    });
  }
  return result;
};

const filter = (arr, callback, thisArg) => {
  const ctx = thisArg === undefined ? this : thisArg;
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (callback.call(ctx, arr[i], i, arr)) {
      result.push(arr[i]);
    }
  }
  return result;
};

// returns true if obj is a basic Array, []
// duck type push as optimization; most checks are not arrays and will not
// have push set. this way we avoid the implicit toString() on the
// constructor.
const ARR_REGEXP = /^\s*function Array()/;
const isArray = (obj) => {
  return obj != null && obj.push && ARR_REGEXP.test(obj.constructor);
};

// returns true if obj is a basic Object, {}
const OBJ_REGEXP = /^\s*function Object()/;
const isObject = (obj) => {
  return obj != null && typeof obj === 'object' && OBJ_REGEXP.test(obj.constructor);
};

const isFunction = (obj) => {
  return obj != null && typeof obj === 'function';
};

const REGEXP_REGEXP = /^\s*function RegExp()/;
const isRegExp = (obj) => {
  return obj != null && REGEXP_REGEXP.test(obj.constructor);
};

// returns true if obj is one of javascript's basic types
const BASIC_TYPE_REGEXP = /^string|number|boolean|function$/i;
const isBasicType = (obj) => {
  return obj != null && (BASIC_TYPE_REGEXP.test(typeof obj) || isRegExp(obj));
};

const isEmpty = (obj) => {
  if (obj == null) {
    return true;
  }
  if (isArray(obj) && !obj.length) {
    return true;
  }
  if (isObject(obj)) {
    if (Object.keys(obj).length) {
      return false;
    }
    return true;
  }
  return false;
};

// returns true if obj1 is a subset of obj2
const isSubsetDeep = (obj1, obj2) => {
  if (obj1 === obj2) {
    return true;
  }
  if ((obj1 != null && obj2 == null) || (obj1 == null && obj2 != null)) {
    return false;
  }
  let result = true;
  eachLeaf(obj1, (obj1LeafVal, path) => {
    let obj2LeafVal = getDeep(obj2, path);
    if (obj1LeafVal !== obj2LeafVal) {
      result = false;
    }
  });
  return result;
};

// true if each object is a subset of the other
const equalsDeep = (obj1, obj2) => {
  return isSubsetDeep(obj1, obj2) && isSubsetDeep(obj2, obj1);
};

//
// This is the meat and potatoes for iterating over
// javascript object/array structures.
//
// Call fn(node, path, parent, key) for each node in an object.
//
// We include the parent + key so that the callback can modify the leaf
// value in-place. We pass the path to the root node (the keys from root to
// leaf) so that we can serialize objects.
const eachDeep = (obj, fn, path, parent, key) => {
  if (path == null) {
    path = [];
  }
  if (isBasicType(obj)) {
    fn(obj, path, parent, key);
  } else if (isObject(obj) || isArray(obj)) {
    fn(obj, path, parent, key);
    for (let key in obj) {
      if (Object.hasOwn(obj, key)) {
        const newPath = aps.call(path);
        newPath.push(key);
        eachDeep(obj[key], fn, newPath, obj, key);
      }
    }
  } else {
    fn(obj, path, parent, key);
  }
};

// call fn(node, path, parent, key) for each leaf node in an object
const eachLeaf = (obj, fn) => {
  eachDeep(obj, (obj, path, parent, key) => {
    if (!isArray(obj) && !isObject(obj)) {
      fn(obj, path, parent, key);
    }
  });
};

const pick = (obj, keys) => {
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

const indexOf = (arr, target) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
};

const keys = (obj) => {
  if (Object.keys) {
    return Object.keys(obj);
  }
  const result = [];
  for (let k in obj) {
    if (Object.hasOwn(obj, k)) {
      result.push(k);
    }
  }
  return result;
};

export {
  merge,
  mergeOne,
  identityFunc,
  legacyShouldDeleteFromMerge,
  clone,
  getDeep,
  setDeep,
  setAndPreserveUndefined,
  unsetDeep,
  exists,
  assign,
  cast,
  castDeep,
  only,
  except,
  select,
  filter,
  values,
  sort,
  isArray,
  isObject,
  isFunction,
  isRegExp,
  isBasicType,
  isEmpty,
  isSubsetDeep,
  equalsDeep,
  eachDeep,
  eachLeaf,
  pick,
  indexOf,
  keys,
};

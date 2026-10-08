import { cast, clone, getDeep, isArray, setAndPreserveUndefined, eachLeaf } from 'utilities/obj.js';
import { wlog } from 'utilities/wlog.js';

export const proto = (url = location.href) => {
  if (/^http:\/\//.test(url)) {
    return 'http:';
  }

  return 'https:';
};

// decompose the raw query params into a JSON object
// root[level1][level2][level3] to deep set
// param[a]=1&param[a]=2 to create an array
export const queryParamsToObject = (raw) => {
  // get each key/val pair separated by &
  const result = {};
  if (!raw) {
    return result;
  }

  const parts = raw.split('&');
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];

    // break up key/vals
    let pair = part.split('=');
    let key = pair[0];
    let val = pair[1];
    try {
      key = debrack(decodeURIComponent(key)) || '';
    } catch (e) {
      // log on a timeout so that wlog has a chance to set its level from page
      // url.
      setTimeout(() => {
        wlog.notice(e);
      }, 50);
      key = '';
    }

    // deep cast each piece of the key (e.g. "foo.1" yields ["foo", 1])
    cast(key);

    // if the key already exists in params
    const existing = getDeep(result, key);
    if (existing != null) {
      // make this value an array of same-name params
      if (isArray(existing)) {
        existing.push(urlComponentToObject(val));
      } else {
        const arr = [existing];
        arr.push(urlComponentToObject(val));
        setAndPreserveUndefined(result, key, arr);
      }
    } else {
      // otherwise save key/val
      setAndPreserveUndefined(result, key, urlComponentToObject(val));
    }
  }

  // return the json object
  return result;
};

// Any val that starts with json:slashslash should have its data
// parsed as JSON.
export const urlComponentToObject = (val) => {
  if (val == null) {
    return val;
  }

  let result;
  try {
    result = decodeURIComponent(val);
  } catch (e) {
    // log on a timeout so that wlog has a chance to set its level from page
    // url.
    setTimeout(() => {
      wlog.notice(e);
    }, 50);
    result = val;
  }
  return result;
};

export const objectToQueryParams = (obj) => {
  const result = [];
  eachLeaf(obj, (leafVal, path) => {
    if (leafVal != null) {
      result.push(`${encodeURIComponent(brack(path))}=${encodeURIComponent(leafVal)}`);
    } else {
      result.push(encodeURIComponent(brack(path)));
    }
  });
  return result.join('&');
};

export const splitPath = (str) => {
  const result = [];
  if (str == null) {
    return result;
  }
  const parts = str.split(/\/+/);
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (part != null && part !== '') {
      result.push(part);
    }
  }
  return result;
};

// `path` can be a string or an array of strings.
export const joinPath = (path) => {
  if (typeof path === 'string') {
    path = path.split('/');
  }
  if (path == null) {
    return '';
  }
  return `/${path.join('/')}`;
};

// convert array [abc, def, ghi] to bracketed format "abc[def][ghi]"
export const brack = (path) => {
  let result = path[0];
  for (let i = 1; i < path.length; i++) {
    result += `[${path[i]}]`;
  }
  return result;
};

// convert "abc[def][ghi][jkl]" to array [abc, def, ghi, jkl]
export const debrack = (str) => {
  return str.match(/([\w\-_]+)/g);
};

/// /
// An object to represent an URL, and to make it easy to
// get/set various properties and parameters of the URL.
/// /
const URL_CONSTRUCTOR_KEYS = ['protocol', 'host', 'port', 'params', 'path'];
export const Url = function (url) {
  const self = this;

  // if an url is supplied, parse. if it's an object, explicitly
  // set options. otherwise, just assume we're building an url
  // from scratch.
  const construct = function () {
    self.params = {};
    self.path = [];
    self.host = '';
    self.rawPath = '';
    if (typeof url === 'object') {
      self.fromOptions(url);
    } else if (url) {
      self.fromRaw(url);
    }
  };

  construct();
};

const uproto = Url.prototype;

uproto.fromOptions = function (options) {
  for (let i = 0; i < URL_CONSTRUCTOR_KEYS.length; i++) {
    let opt = URL_CONSTRUCTOR_KEYS[i];
    if (options[opt] != null) {
      this[opt] = options[opt];
    }
  }
  return this;
};

// parse the url and save the info
uproto.fromRaw = function (raw) {
  this.rawUrl = raw;

  let match;

  // protocol
  match = raw.match(/^((?:https?:)|(?:file:)|(?:ftp:))?\/\//);
  if (match) {
    this.protocol = match[1] || undefined;
  }

  // host
  match = raw.match(/\/\/([^:?#/]*)/);
  if (match) {
    this.host = match[1] || undefined;
  }

  // path
  match = raw.match(/\/\/.*?(\/[^?#$]+)/) || raw.match(/(^\/[^/][^?#$]+)/);
  if (match) {
    this.setPath(match[1]);
  }

  // port
  match = raw.match(/:(\d+)/);
  if (match) {
    this.port = parseInt(match[1], 10);
  }

  // url parameters
  match = raw.match(/\?([^#]+)/);
  if (match) {
    this.rawParams = match[1];
    this.params = queryParamsToObject(this.rawParams);
  }

  // anchor
  match = raw.match(/#(.*)$/);
  if (match) {
    this.anchor = match[1];
  }

  return this;
};

uproto.clone = function () {
  return new Url({
    protocol: this.protocol,
    host: this.host,
    port: this.port,
    path: clone(this.path),
    params: clone(this.params),
    anchor: this.anchor,
  });
};

uproto.ext = function (ext) {
  if (ext != null) {
    const current = this.ext();
    const i = this.path.length - 1;
    const regexp = new RegExp(`\\.${current}`, 'g');
    if (current) {
      this.path[i] = `${this.path[i].replace(regexp, '')}`;
    }
    return (this.path[i] = `${this.path[i]}.${ext}`);
  }
  const match = this.path[this.path.length - 1].match(/\.(.*)$/);
  return (match != null && match[1]) || null;
};

// accept loc for testing purposes
uproto.isRelative = function (loc = window.location) {
  const proto = this.protocol;
  const host = this.host;
  return (
    (proto == null || proto === '' || proto === loc.protocol) && (!host || host === loc.hostname)
  );
};

uproto.toString = function () {
  if (this.isRelative()) {
    return this.relative();
  }
  return this.absolute();
};

// print this url object as a simple string
// choose sane defaults if parts aren't specified
uproto.absolute = function () {
  let protocolPart = '';
  if (this.protocol != null) {
    protocolPart = this.protocol;
  }
  let portPart = '';
  if (this.port != null) {
    portPart = `:${this.port}`;
  }
  return `${protocolPart}//${this.host || location.host}${portPart}${this.relative()}`;
};

uproto.relative = function () {
  let pathPart = '';
  if (this.path.length > 0) {
    pathPart = joinPath(this.path);
    if (this._hasTrailingSlash) {
      pathPart += '/';
    }
  }
  let paramPart = `?${objectToQueryParams(this.params)}`;
  if (paramPart.length === 1) {
    paramPart = '';
  }
  return `${pathPart}${paramPart}${this.relativeAnchor()}`;
};

uproto.authority = function () {
  const portPart = this.port != null ? `:${this.port}` : '';
  return `${this.host}${portPart}`;
};

uproto.relativeProtocol = function () {
  let portPart = '';
  if (this.port != null) {
    portPart = `:${this.port}`;
  }
  return `//${this.host}${portPart}${this.relative()}`;
};

uproto.relativeAnchor = function () {
  let anchorPart = '';
  if (this.anchor != null) {
    anchorPart = `#${this.anchor}`;
  }
  return `${anchorPart}`;
};

uproto.setPath = function (rawPath) {
  this.rawPath = rawPath;
  this._hasTrailingSlash = /\/$/.test(this.rawPath);
  this.path = splitPath(this.rawPath);
};

// create some aliases in Url to create/parse URLs
Url.create = (options) => {
  return new Url(options);
};

export const createUrl = Url.create;
Url.parse = (str) => {
  return new Url(str);
};
export const parseUrl = Url.parse;

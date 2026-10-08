import { isObject, isArray, merge } from 'utilities/obj.js';
import { isDocReady, onDocReady } from 'utilities/docReady.js';
import { pageLoaded } from 'utilities/pageLoaded.js';
import { cachedDetect } from 'utilities/detect.js';
import { wlog } from 'utilities/wlog.js';
import { elemOffset, elemZoom, isBoxModel } from 'utilities/elemOffset.js';
import { execScriptTags, getScriptTags, removeScriptTags } from 'utilities/script-tags.js';
import { seqId } from 'utilities/seqid.js';
import { Wistia } from '../wistia_namespace.ts';

const W = Wistia;
const detect = cachedDetect();

export { isDocReady, onDocReady };
export { pageLoaded };
export { execScriptTags, getScriptTags, removeScriptTags };
export { elemOffset, elemZoom, isBoxModel };

export const elemHtml = (elem, content) => {
  const cssTags = getCssTags(content);
  const scriptTags = getScriptTags(content);
  content = removeCssTags(content);
  content = removeScriptTags(content);

  elem.innerHTML = content;
  execCssTags(cssTags, elem);

  // these script tags will be removed in short order as part of the script
  // loader
  return execScriptTags(scriptTags);
};

export const getCssTags = (htmlStr) => {
  return htmlStr.match(/<link.*?rel=['"]stylesheet['"][^>]*>|<style>[\s\S]+?<\/style>/gi) || [];
};

export const execCssTags = (cssTags, parentElem) => {
  if (!cssTags) {
    return null;
  }

  if (!isArray(cssTags)) {
    cssTags = getCssTags(cssTags);
  }
  const inserted = [];
  for (let i = 0; i < cssTags.length; i++) {
    let cssTag = cssTags[i];
    if (/<link.*?rel=['"]stylesheet['"][^>]*>/.test(cssTag)) {
      const matches = cssTag.match(/href=['"](.*?)['"]/i);
      if (matches) {
        let link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('href', matches[1]);
        link.className = 'wistia_injected_style';
        (parentElem || document.body || document.head).appendChild(link);
        inserted.push(link);
      }
    } else if (/<style>[\s\S]+?<\/style>/gi.test(cssTag)) {
      const matches = cssTag.match(/<style>([\s\S]+?)<\/style>/i);
      if (matches) {
        let style = addInlineCss(parentElem || document.body || document.head, matches[1]);
        inserted.push(style);
      }
    }
  }
  return inserted;
};

export const removeCssTags = (htmlStr) => {
  return htmlStr.replace(/<link.*?rel=['"]stylesheet['"][^>]*>|<style>[\s\S]+?<\/style>/gi, '');
};

export const addInlineCss = (domTarget, css) => {
  const target = domTarget || document.body || document.head;

  const styleElem = document.createElement('style');
  styleElem.id = seqId('wistia_', '_style');
  styleElem.setAttribute('type', 'text/css');
  styleElem.className = 'wistia_injected_style';
  target.appendChild(styleElem, target.nextSibling);
  if (styleElem.styleSheet) {
    styleElem.styleSheet.cssText = css;
  } else {
    styleElem.appendChild(document.createTextNode(css));
  }
  return styleElem;
};

export const elemFromObject = (obj) => {
  if (isArray(obj)) {
    let result = [];
    for (let i = 0; i < obj.length; i++) {
      result.push(elemFromObject(obj[i]));
    }
    return result;
  }

  const tagName = obj.tagName || 'div';
  let childNodes = obj.childNodes || [];
  if (!isArray(childNodes)) {
    childNodes = [childNodes];
  }

  const elem = document.createElement(tagName);

  for (let key in obj) {
    if (Object.hasOwn(obj, key)) {
      let val = obj[key];
      if (key !== 'childNodes' && key !== 'tagName' && key !== 'ref') {
        let dashedKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        if (key === 'style') {
          if (isObject(val)) {
            for (let p in val) {
              elem.style[p] = val[p];
            }
          } else {
            // setAttribute('style', ...) only works in IE8+, so parse inline
            // styles if it's passed in as a string.
            let styles = val.split(';');
            for (let i = 0; i < styles.length; i++) {
              let pair = styles[i].split(/\s*:\s*/);
              let p = pair[0];
              let v = pair[1];
              if (p && v) {
                elem.style[p] = v;
              }
            }
          }
        } else if (key === 'events') {
          for (let evt in val) {
            let callback = val[evt];
            elemBind(elem, evt, callback);
          }
        } else if (key === 'className' || key === 'class') {
          elem.className = val;
        } else if (key === 'innerHTML') {
          elem.innerHTML = val;
        } else if (key === 'innerText') {
          elem.innerText = val;
        } else if (val != null && typeof val.toString === 'function') {
          elem.setAttribute(dashedKey, val.toString());
        }
      }
    }
  }

  for (let i = 0; i < childNodes.length; i++) {
    let childObj = childNodes[i];
    if (isObject(childObj)) {
      let child = elemFromObject(childObj);
      elemAppend(elem, child);
    } else {
      let child = document.createTextNode(childObj.toString());
      elemAppend(elem, child);
    }
  }

  if (typeof obj.ref === 'function') {
    obj.ref(elem);
  }

  return elem;
};

export const elemToObject = (elem) => {
  if (isArray(elem)) {
    let result = [];
    for (let i = 0; i < elem.length; i++) {
      result.push(elemToObject(elem[i]));
    }
  }

  const result = {};
  result.tagName = elem.tagName.toLowerCase();

  const elemKeys = Object.keys(elem);
  for (let i = 0; i < elemKeys.length; i++) {
    let attr = elemKeys[i];
    if (
      attr !== 'tagName' &&
      attr !== 'childNodes' &&
      attr !== 'nodeType' &&
      attr !== 'nodeValue'
    ) {
      if (attr === 'style') {
        result.style = {};
        let styleKeys = Object.keys(elem.style);
        for (let j = 0; j < styleKeys.length; j++) {
          let prop = styleKeys[j];
          const val = elem.style[prop];
          if (val && !/^\d/.test(prop) && prop !== 'length') {
            result.style[prop] = val;
          }
        }
      } else {
        const value = elem.getAttribute(attr);
        if (value != null) {
          result[attr] = value;
        }
      }
    }
  }

  let children = [];
  for (let i = 0; i < elem.childNodes.length; i++) {
    let child = elem.childNodes[i];
    if (child.nodeType === 1) {
      children.push(elemToObject(child));
    } else if (child.nodeType === 3) {
      children.push(child.nodeValue);
    }
  }
  if (children.length > 0) {
    result.childNodes = children;
  }
  return result;
};

export const elemClone = (elem) => {
  const obj = elemToObject(elem);
  return elemFromObject(obj);
};

export const elemAppend = (par, elem) => {
  if (isArray(elem)) {
    for (let i = 0; i < elem.length; i++) {
      elemAppend(par, elem[i]);
    }
    return;
  }

  if (par.tagName.includes('-')) {
    par.shadowRoot.appendChild(elem, { wistiaGridCaller: true });
  } else {
    par.appendChild(elem, { wistiaGridCaller: true });
  }
};

export const elemPrepend = (par, elem) => {
  if (isArray(elem)) {
    for (let i = 0; i < elem.length; i++) {
      elemPrepend(par, elem[i]);
    }
    return;
  }

  if (par.childNodes.length === 0) {
    return elemAppend(par, elem);
  }
  return par.insertBefore(elem, par.childNodes[0]);
};

export const elemBefore = (sibling, elem) => {
  if (isArray(elem)) {
    elem = elem.reverse();
    for (let i = 0; i < elem.length; i++) {
      elemBefore(sibling, elem[i]);
    }
    return;
  }

  return sibling.parentNode.insertBefore(elem, sibling);
};

export const elemAfter = (sibling, elem) => {
  if (isArray(elem)) {
    elem = elem.reverse();
    for (let i = 0; i < elem.length; i++) {
      elemAfter(sibling, elem[i]);
    }
    return;
  }

  return sibling.parentNode.insertBefore(elem, sibling.nextSibling);
};

export const elemRemove = (elem) => {
  if (isArray(elem) || (window.NodeList && elem instanceof NodeList)) {
    for (let i = 0; i < elem.length; i++) {
      elemRemove(elem[i]);
    }
    return;
  }

  let par;
  if (elem != null && (elem.nodeType === 1 || elem.nodeType === 3) && (par = elem.parentNode)) {
    par.removeChild(elem);
    elem = null;
  }
};

export const elemRemoveClass = (elem, klass) => {
  if (isArray(elem) || (window.NodeList && elem instanceof NodeList)) {
    for (let i = 0; i < elem.length; i++) {
      elemRemoveClass(elem[i], klass);
    }
    return;
  }

  if (!elemHasClass(elem, klass)) {
    return;
  }

  let className = elem.getAttribute('class');
  if (className) {
    const regexp = new RegExp(`\\b${klass}\\b`, 'g');
    const newClassString = normalizeClassName(className.replace(regexp, ''));
    elem.setAttribute('class', newClassString);
  }
};

export const elemAddClass = (elem, klass) => {
  if (isArray(elem) || (window.NodeList && elem instanceof NodeList)) {
    for (let i = 0; i < elem.length; i++) {
      elemAddClass(elem[i], klass);
    }
    return;
  }

  if (elemHasClass(elem, klass)) {
    return;
  }

  let className = elem.getAttribute('class');
  let newClassString;
  if (className) {
    elemRemoveClass(elem, klass);
    newClassString = normalizeClassName(`${className} ${klass}`);
  } else {
    newClassString = klass;
  }

  elem.setAttribute('class', newClassString);
};

// Longer than ` ${elem.className} `.indexOf(` ${klass} `) >= 0, but doesn't
// cause JIT code deoptimization in Chrome.
export const elemHasClass = (elem, klass) => {
  let className =
    elem != null && typeof elem.getAttribute === 'function' && elem.getAttribute('class');
  if (!className && elem && typeof elem.className === 'string') {
    className = elem.className;
  }

  if (!className) {
    return false;
  }

  let returnValue = false;

  eachIndexOf(className, klass, (index) => {
    let classBeginningFound = index === 0 || className.charAt(index - 1) === ' ';
    let endsWidthClass = index + klass.length === className.length;
    let classInMiddle = className.charAt(index + klass.length) === ' ';

    if (classBeginningFound && (endsWidthClass || classInMiddle)) {
      returnValue = true;
      return BREAK_IDENTIFIER;
    }
  });

  return returnValue;
};

const BREAK_IDENTIFIER = {};
const eachIndexOf = (str, needle, fn) => {
  let i = -1;

  while ((i = str.indexOf(needle, i + 1)) != -1) {
    if (fn(i) === BREAK_IDENTIFIER) {
      break;
    }
  }
};

export const elemClasses = (elem) => {
  if (elem && typeof elem.className !== 'string') {
    // Sometimes, className doesn't return a string. Who knew?!
    // https://wistia.zendesk.com/agent/tickets/196879
    return [''];
  }
  return ((elem && elem.className) || '').split(/\s+/);
};

const normalizeClassName = (className) => {
  return className.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s+/g, ' ');
};

export const elemStyle = (elem, ...args) => {
  if (isArray(elem) || (window.NodeList && elem instanceof NodeList)) {
    let result = [];
    for (let i = 0; i < elem.length; i++) {
      let node = elem[i];
      if (node.nodeType === 1) {
        result.push(elemStyle(node, ...args));
      }
    }
    return result;
  }
  if (args.length === 2) {
    let prop = args[0];
    let val = args[1];
    elem.style[prop] = val;
  } else if (args.length === 1) {
    if (typeof args[0] === 'string') {
      let prop = args[0];
      try {
        if (elem.currentStyle) {
          return elem.currentStyle[prop];
        }
        if (window.getComputedStyle) {
          return window.getComputedStyle(elem, null).getPropertyValue(prop);
        }
        return null;
      } catch (e) {
        wlog.notice(e);
      }
    } else {
      let props = propsWithVendorPrefixes(args[0]);
      for (let prop in props) {
        let val = props[prop];
        elem.style[prop] = val;
      }
    }
  } else {
    wlog('Unexpected args', elem, ...args);
  }
};

const VENDORED_PROPERTIES = {
  borderImage: true,
  mixBlendMode: true,
  transform: true,
  transition: true,
  transitionDuration: true,
};

const VENDOR_PREFIXES = ['webkit', 'moz', 'o', 'ms'];

export const propsWithVendorPrefixes = (props) => {
  if (detect.chrome) {
    return props;
  }

  const result = {};
  for (let prop in props) {
    let val = props[prop];
    result[prop] = val;
    if (VENDORED_PROPERTIES[prop]) {
      let prefixes = VENDOR_PREFIXES;
      for (let i = 0; i < prefixes.length; i++) {
        let prefix = prefixes[i];
        let prefixedProp = prefix + prop.charAt(0).toUpperCase() + prop.slice(1);
        if (!prop[prefixedProp]) {
          result[prefixedProp] = val;
        }
      }
    }
  }
  return result;
};

export const getComputedStyle = (elem, prop) => {
  if (!window.getComputedStyle) {
    return null;
  }
  const computed = window.getComputedStyle(elem, null);
  if (computed == null) {
    return null;
  }
  if (prop != null) {
    return computed[prop];
  }
  return computed;
};

export const elemWidth = (elem) => {
  if (elem === window) {
    if (window.innerWidth) {
      return window.innerWidth;
    }
    if (document.documentElement) {
      return document.documentElement.offsetWidth;
    }
    return document.body.offsetWidth;
  }
  if (elem === document) {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth,
    );
  }
  let val;
  if ((val = getComputedStyle(elem, 'width')) && val != null) {
    return parseFloat(val);
  }
  if (elem.currentStyle) {
    return elem.offsetWidth;
  }
  return -1;
};

export const elemHeight = (elem) => {
  if (elem === window) {
    if (window.innerHeight) {
      return window.innerHeight;
    }
    if (document.documentElement) {
      return document.documentElement.offsetHeight;
    }
    return document.body.offsetHeight;
  }
  if (elem === document) {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight,
    );
  }
  let val;
  if ((val = getComputedStyle(elem, 'height')) && val != null) {
    return parseFloat(val);
  }
  if (elem.currentStyle) {
    return elem.offsetHeight;
  }
  return -1;
};

export const elemContainsOffset = (elem, left, top) => {
  let offset = elemOffset(elem);
  offset.right = offset.left + elemWidth(elem);
  offset.bottom = offset.top + elemHeight(elem);
  return offset.left <= left && left < offset.right && offset.top <= top && top < offset.bottom;
};

export const elemScrollOffset = (elem) => {
  let curLeft = 0;
  let curTop = 0;
  if (elem.parentNode) {
    while (elem && elem.offsetParent) {
      curTop += elem.scrollTop;
      curLeft += elem.scrollLeft;
      elem = elem.parentNode;
    }
  }
  return {
    left: curLeft,
    top: curTop,
  };
};

export const elemIsHidden = (elem) => {
  while (elem && elem.nodeType === 1) {
    if (elemStyle(elem, 'display') === 'none') {
      return true;
    }
    elem = elem.parentNode;
  }

  return false;
};

// Like elemIsHidden but complete: also treats visibility hidden/collapse as
// hidden, reads computed styles rather than inline ones, and follows the walk
// out of shadow roots into the host so an element inside a hidden web
// component reports hidden.
export const elemIsHiddenByStyle = (elem) => {
  const view = elem.ownerDocument.defaultView;
  if (!view) {
    return false;
  }
  let node = elem;
  while (node) {
    const { display, visibility } = view.getComputedStyle(node);
    if (display === 'none' || visibility === 'hidden' || visibility === 'collapse') {
      return true;
    }
    const root = node.getRootNode();
    node = node.parentElement || (root instanceof ShadowRoot ? root.host : null);
  }
  return false;
};

export const elemInDom = (elem) => {
  while (elem) {
    if (elem === document) {
      return true;
    }
    const parent = elem.parentNode;
    if (parent != null) {
      elem = parent;
    } else if (typeof elem.getRootNode === 'function') {
      elem = elem.getRootNode()?.host;
    } else {
      return false;
    }
  }
  return false;
};

// Returns the truly focused element, descending through any number of nested
// shadow roots. document.activeElement only reports the active element within
// its own tree scope; when focus lives inside a (possibly nested) shadow DOM —
// e.g. a <wistia-player> nested inside another web component — it reports the
// outermost host. Walking activeElement through each shadowRoot gives us the
// real leaf element so containment checks work regardless of nesting depth.
export const getDeepActiveElement = (root = document) => {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
};

export const elemIsDescendantOf = (elem, target) => {
  let ancestors = elemAncestors(elem);
  for (let i = 0; i < ancestors.length; i++) {
    if (ancestors[i] === target) {
      return true;
    }
  }
  return false;
};

export const elemAncestorWithClass = (elem, klass) => {
  let ancestors = elemAncestors(elem);
  for (let i = 0; i < ancestors.length; i++) {
    if (elemHasClass(ancestors[i], klass)) {
      return ancestors[i];
    }
  }
  return null;
};

export const elemAncestorHasClass = (elem, klass) => {
  const ancestor = elemAncestorWithClass(elem, klass);
  return !!ancestor;
};

export const elemAncestors = (elem) => {
  let current = elem;
  const result = [];
  while ((current = current.parentNode)) {
    result.push(current);
  }
  return result;
};

export const elemIsInside = (elem, ancestor) => {
  return elem === ancestor || elemIsDescendantOf(elem, ancestor);
};

const getTransitionProp = (props, time, easing) => {
  const result = [];
  for (let prop in props) {
    result.push(`${prop} ${time}ms ${easing}`);
  }
  return result.join(',');
};

export const elemAnimate = (elem, props = {}, options = {}) => {
  options = merge({ time: 400, easing: 'ease' }, options);

  const transitions = getTransitionProp(props, options.time, options.easing);
  elemStyle(elem, { transition: transitions });

  safeRequestAnimationFrame(() => {
    elemStyle(elem, props);
    setTimeout(() => {
      elemStyle(elem, { transition: '' });
      if (typeof options.callback === 'function') {
        options.callback();
      }
    }, options.time);
  });
};

export const elemBind = (elem, event, fn, useCapture = false) => {
  const eventShim = (e, ...args) => {
    e = e || window.event;

    // Normalize pageX, pagey
    if (!e.pageX && !e.pageY && (e.clientX || e.clientY)) {
      e.pageX = e.clientX + docScrollLeft();
      e.pageY = e.clientY + docScrollTop();
    }

    // Normalize preventDefault
    if (!e.preventDefault) {
      e.preventDefault = function () {
        e.returnValue = false;
      };
    }

    // Normalize stopPropagation
    if (!e.stopPropagation) {
      e.stopPropagation = function () {
        e.cancelBubble = true;
      };
    }

    // Normalize `which`
    if (e.which == null) {
      e.which = e.charCode != null ? e.charCode : e.keyCode;
    }
    if (e.which == null && e.button != null) {
      if (e.button & 1) {
        e.which = 1; // left
      } else if (e.button & 2) {
        e.which = 3; // right
      } else if (e.button & 4) {
        e.which = 2; // middle
      } else {
        e.which = 0; // no button pressed
      }
    }

    // Normalize `target`
    if (e.target) {
      // perfect
    } else if (e.srcElement) {
      e.target = e.srcElement;
    }
    if (e.target && e.target.nodeType === 3) {
      e.target = e.target.parentNode;
    }

    // Actually call the function
    const result = fn.apply(e.target, [e].concat(args));

    // Sweet anonymous unbinding logic
    if (result === elemUnbind) {
      elemUnbind(elem, event, fn);
    }

    return result;
  };

  Wistia._elemBind = Wistia._elemBind || {};
  const key = elemBindKey(elem, event, fn);
  Wistia._elemBind[key] = eventShim;

  // Set the elem/event property so we can unbind all for the elem
  eventShim.elem = elem;
  eventShim.event = event;

  elem.addEventListener(event, eventShim, useCapture);
  return function () {
    elemUnbind(elem, event, fn, useCapture);
  };
};

export const elemUnbind = (elem, event, fn, useCapture = false) => {
  if (!(elem != null && elem._wistiaElemId != null && fn != null && fn._wistiaBindId)) {
    return;
  }
  const key = elemBindKey(elem, event, fn);
  const eventShim = Wistia._elemBind[key];
  if (eventShim) {
    elem.removeEventListener(event, eventShim, useCapture);
    eventShim.elem = null;
    eventShim.event = null;
  }
  return delete Wistia._elemBind[key];
};

export const elemUnbindAll = (elem) => {
  for (let key in Wistia._elemBind) {
    let eventShim = Wistia._elemBind[key];
    if (eventShim && elem === eventShim.elem) {
      let event = eventShim.event;
      eventShim.elem.removeEventListener(event, eventShim, false);
      eventShim.elem = null;
      eventShim.event = null;
      delete Wistia._elemBind[key];
    }
  }
};

export const elemUnbindAllInside = (container) => {
  let count = 0;
  for (let key in Wistia._elemBind) {
    let eventShim = Wistia._elemBind[key];
    if (eventShim && elemIsInside(eventShim.elem, container)) {
      let event = eventShim.event;
      eventShim.elem.removeEventListener(event, eventShim, false);
      eventShim.elem = null;
      eventShim.event = null;
      delete Wistia._elemBind[key];
      count += 1;
    }
  }

  return count;
};

export const elemBindKey = (elem, event, fn) => {
  elem._wistiaElemId = elem._wistiaElemId || seqId('wistia_elem_');
  fn._wistiaBindId = fn._wistiaBindId || seqId('wistia_bind_');
  return `${elem._wistiaElemId}.${event}.${fn._wistiaBindId}`;
};

export const elemRebind = (elem, event, fn) => {
  if (fn) {
    elemUnbind(elem, event, fn);
    return elemBind(elem, event, fn);
  }
};

export const elemBindOnce = (elem, event, fn) => {
  const wrap = function (...args) {
    fn.apply(this, args);
    return elemUnbind;
  };
  return elemBind(elem, event, wrap);
};

export const elemTrigger = (elem, event, ...customArguments) => {
  if (elem.dispatchEvent) {
    const eventObj = document.createEvent('Events');
    eventObj.initEvent(event, true, false);
    if (event === 'click' || event === 'doubleclick') {
      eventObj.which = 1;
    } else if (event === 'rightclick') {
      eventObj.which = 2;
    }
    eventObj.customArguments = customArguments;
    return elem.dispatchEvent(eventObj);
  }
  if (elem.fireEvent) {
    const eventObj = { customArguments };
    return elem.fireEvent(`on${event}`, eventObj);
  }
  wlog.error('neither dispatchEvent nor fireEvent is defined for', elem, event);
};

export const fullscreenElement = () => {
  return document.fullscreenElement || document.webkitFullscreenElement;
};

export const elemRequestFullscreen = (elem) => {
  try {
    if (elem.requestFullscreen && document.fullscreenEnabled) {
      return elem.requestFullscreen().catch((error) => {
        wlog.notice('requestFullscreen failed', error);
        return Promise.reject(error);
      });
    }

    if (elem.webkitEnterFullscreen) {
      if (elem.readyState !== undefined && elem.readyState < HTMLMediaElement.HAVE_METADATA) {
        const errorMessage = 'webkitEnterFullscreen requires at least HAVE_METADATA readyState';
        wlog.notice(errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
      // WebKit throws InvalidStateError if fullscreen isn't currently
      // possible (no video track, fullscreen restrictions, expired user
      // gesture), even when metadata has loaded. webkitSupportsFullscreen
      // reflects that exact internal check. It's undefined on non-video
      // elements, so only an explicit false blocks the call.
      if (elem.webkitSupportsFullscreen === false) {
        const errorMessage = 'webkitEnterFullscreen is not currently supported for this element';
        wlog.notice(errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
      elem.webkitEnterFullscreen();
      return Promise.resolve();
    }
  } catch (error) {
    wlog.notice('requestFullscreen failed', error);
    return Promise.reject(error);
  }

  wlog.notice('no requestFullscreen functionality detected');
  return Promise.resolve();
};

export const elemCancelFullscreen = (elem) => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }
  if (elem && elem.webkitExitFullscreen) {
    return new Promise((resolve) => {
      elem.webkitExitFullscreen();
      resolve();
    });
  }
  wlog.notice('no cancelFullscreen functionality detected');
  return Promise.resolve();
};

export const elemStripEventAttributes = (elem) => {
  const attributes = (elem && elem.attributes) || [];
  try {
    for (let i = 0; i < attributes.length; i++) {
      let attr = attributes[i];
      if (/^on.+/i.test(attr.name)) {
        elem[attr.name] = null;
        elem.removeAttribute(attr.name);
      }
    }
  } catch (e) {
    wlog.error(e);
  }

  if (elem.childNodes) {
    for (let i = 0; i < elem.childNodes.length; i++) {
      let child = elem.childNodes[i];
      if (child.nodeType === 1) {
        elemStripEventAttributes(child);
      }
    }
  }
};

export const elemMutationObserver = (fn) => {
  const klass = detect.mutationObserver;
  if (klass) {
    return new window[klass](fn);
  }
  return null;
};

export const docScrollTop = (t) => {
  let docBody = document.body;
  let docElem = document.documentElement;
  if (t != null) {
    if (docBody) {
      docBody.scrollTop = t;
    }
    if (docElem) {
      docElem.scrollTop = t;
    }
  } else {
    return (docElem && docElem.scrollTop) || (docBody && docBody.scrollTop) || 0;
  }
};

export const docScrollLeft = (t) => {
  let docBody = document.body;
  let docElem = document.documentElement;
  if (t != null) {
    if (docBody) {
      docBody.scrollLeft = t;
    }
    if (docElem) {
      docElem.scrollLeft = t;
    }
  } else {
    return (docElem && docElem.scrollLeft) || (docBody && docBody.scrollLeft) || 0;
  }
};

export const safeRequestAnimationFrame = (fn) => {
  const requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    ((callback) => setTimeout(callback, 1000 / 60));
  return requestAnimFrame(fn);
};

const FORM_CONTROL_ROLES = /^(radio|checkbox|switch|option|menuitemradio|menuitemcheckbox)$/i;

export const formInputIsFocused = () => {
  let activeElement = document.activeElement;
  if (document.activeElement.tagName === 'WISTIA-PLAYER') {
    activeElement = document.activeElement.shadowRoot.activeElement;
  }

  if (activeElement.tagName === 'WISTIA-FORM-EMBED') {
    activeElement = activeElement.shadowRoot.activeElement;
  }

  return (
    /^textarea|input|select$/i.test(activeElement.tagName) ||
    FORM_CONTROL_ROLES.test(activeElement.getAttribute('role') || '') ||
    activeElement.isContentEditable
  );
};

export const currentEventSource = () => {
  return inUserEventContext() ? 'user-event' : 'non-user-event';
};

export const inUserEventContext = () => {
  return !!activeDOMEvent;
};

export const getLastActiveEventAt = () => {
  return lastActiveEventAt;
};

let activeDOMEvent;
let lastActiveEventAt = -1;
const userEventsThatShowIntent = [
  'auxclick',
  'click',
  'contextmenu',
  'dblclick',
  'focus',
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseup',
  'reset',
  'submit',
  'touchend',
  'touchstart',
];
userEventsThatShowIntent.forEach((type) => {
  const onEvent = (e) => {
    activeDOMEvent = e;
    lastActiveEventAt = Date.now();
    setTimeout(() => {
      if (activeDOMEvent === e) {
        // if some other event has triggered synchronously, let's not clobber it;
        // the last one to fire will set this to null.
        activeDOMEvent = undefined;
      }
    }, 0);
  };

  // We use capture = true because event.stopPropagation() would cause us to
  // miss this.
  elemBind(
    document,
    type,
    onEvent,
    detect.passiveSupported ? { capture: true, passive: true } : true,
  );
});

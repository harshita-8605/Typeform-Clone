import { wlog } from 'utilities/wlog.js';
import { Wistia } from '../wistia_namespace.ts';

const logger = wlog.getPrefixedFunctions('event_loop');

// The EventLoop class abstracts a particular async pattern. That's the one
// where we set a recursive timeout which we can start/stop at will. The
// problem with that pattern is that doTimeout has a bit of overhead
// associated with it, and we'll be running several event loops for each video
// on the page. As we add more polling functions and more videos, it bogs down
// the execution speed.
//
// EventLoop allows us to setup one global loop with low latency and overhead.
// Then we add functions onto the event loop, and those functions can have
// different intervals, though they will always fire in multiples of the event
// loop's latency (which by default is 100ms). So if you set an interval of 1,
// it would still only fire once every 100ms. Or if you set an interval of
// 250, it would fire at 300, then 600, then 1200, etc. So you might as well
// set multiples of the latency.
//
// Besides efficiency, there is also some value in built-in error handling,
// logging, convenience methods like @resync(), and the predictability of
// execution when everything is in the same loop.

export const EventLoop = function (options = {}) {
  this._timeoutId = null;
  this._latency = options.latency != null ? options.latency : 100;
  this._blurLatency = options.blurLatency != null ? options.blurLatency : 2000;
  this._functions = {};
  this._paused = {};

  window.addEventListener('blur', () => this.blur(), false);
  window.addEventListener('focus', () => this.focus(), false);

  this.start();
};

const EventLoopPrototype = EventLoop.prototype;
EventLoopPrototype.start = function () {
  clearTimeout(this._timeoutId);
  this._loopFn =
    this._loopFn ||
    (() => {
      this.runFunctions();
      this._timeoutId = setTimeout(this._loopFn, this._latency);
    });
  this._loopFn();
};

// Sometimes we want things to respond really super fast after an event.
// Calling "resync" basically restarts the loop at the moment it's called.
EventLoopPrototype.resync = function () {
  this.start();
};

// Same as resync, but sometimes we want to do it in async manner.
EventLoopPrototype.resyncNextTick = function () {
  setTimeout(() => {
    this.resync();
  }, 0);
};

EventLoopPrototype.stop = function () {
  clearTimeout(this._timeoutId);
};

EventLoopPrototype.clear = function () {
  this._functions = {};
};

EventLoopPrototype.runFunctions = function () {
  if (this._pausedDirty) {
    this.updatePaused();
  }
  const toRemove = [];
  for (let k in this._functions) {
    let entry = this._functions[k];
    let now = new Date().getTime();
    let timeSinceLastRun = now - entry.lastRanAt;
    if (!entry.paused && timeSinceLastRun >= entry.interval) {
      entry.lastRanAt = now;
      try {
        let result = entry.fn();
        if (result === this.remove) {
          toRemove.push(k);
        }
      } catch (e) {
        logger.error(e);
      }
    }
  }
  for (let i = 0; i < toRemove.length; i++) {
    this.remove(toRemove[i]);
  }
};

EventLoopPrototype.add = function (key, interval, fn) {
  const now = new Date().getTime();
  this._functions[key] = {
    addedAt: now,
    lastRanAt: -1,
    interval,
    fn,
  };
  const fnResult = fn();
  if (this._functions[key]) {
    this._functions[key].lastRanAt = new Date().getTime();
  }
  if (this._functions[key] && fnResult === this.remove) {
    delete this._functions[key];
  } else {
    this._pausedDirty = true;
  }
};

// NOTE: If an event loop function returns the @remove function, then it is
// equivalent to calling this method after all other functions in that loop
// iteration have completed.
EventLoopPrototype.remove = function (key) {
  this.forEachMatchingKey(key, (k) => {
    delete this._functions[k];
  });
};

EventLoopPrototype.forEachMatchingKey = function (key, fn) {
  for (let k in this._functions) {
    let entry = this._functions[k];
    if (this.key1IncludesKey2(key, k)) {
      fn(k, entry);
    }
  }
};

EventLoopPrototype.latency = function (latency) {
  if (latency != null) {
    this._latency = latency;
  } else {
    return this._latency;
  }
};

EventLoopPrototype.interval = function (key, interval) {
  if (interval != null) {
    if (this._functions[key] == null) {
      logger.notice(
        'setting interval of ',
        key,
        'to',
        interval,
        'failed because',
        key,
        'is not defined',
      );
    } else {
      this._functions[key].interval = interval;
    }
  } else {
    return this._functions[key].interval;
  }
};

EventLoopPrototype.pause = function (key) {
  this._paused[key] = true;
  this._pausedDirty = true;
};

EventLoopPrototype.unpause = function (key) {
  this._paused[key] = false;
  this._pausedDirty = true;
};

EventLoopPrototype.isPaused = function (exactKey) {
  for (let superKey in this.paused) {
    let isPaused = this._paused[superKey];
    if (isPaused && this.key1IncludesKey2(superKey, exactKey)) {
      return true;
    }
  }
  return false;
};

EventLoopPrototype.updatePaused = function () {
  for (let k in this._functions) {
    let entry = this._functions[k];
    entry.paused = this.isPaused(k);
  }
  this._pausedDirty = false;
};

// @key1IncludesKey2('a', 'a.b.c') => true
// @key1IncludesKey2('a.b', 'a.b.c') => true
// @key1IncludesKey2('b.c', 'a.b.c') => false
// @key1IncludesKey2('foo', 'a.b.c') => false
// @key1IncludesKey2('foo', 'foo') => true
EventLoopPrototype.key1IncludesKey2 = function (key1, key2) {
  return (
    typeof key2.indexOf === 'function' &&
    key2.indexOf(key1) === 0 &&
    (key2.length === key1.length || key2.charAt(key1.length) === '.')
  );
};

EventLoopPrototype.blur = function () {
  if (this._blurred) {
    return;
  }
  this._blurred = true;
  this._savedLatency = this._latency;
  this._latency = this._blurLatency;
};

EventLoopPrototype.focus = function () {
  if (!this._blurred) {
    return;
  }
  this._blurred = false;
  this._latency = this._savedLatency;
  this.resync();
};

if (Wistia.eventLoop == null) {
  Wistia.eventLoop = new EventLoop({ latency: 100, blurLatency: 100 });
}
export const globalEventLoop = Wistia.eventLoop;

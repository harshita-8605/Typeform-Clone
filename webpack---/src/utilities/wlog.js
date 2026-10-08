/* eslint no-console: "off" */
/* oxlint-disable no-console */
/*
 * wlog
 *
 * wlog seeks to give us flexibility and power.
 *
 * Basic usage:
 *
 *     import {Logger} from 'utilities/wlog.js';
 *     const logger = new Logger();
 *
 *     logger.error(exception); // this will print the message and stack nicely
 *     logger.error('an error');
 *     logger.info('informational');
 *     logger.warn('a warning');
 *     logger.debug('really high volume stuff');
 *
 * You can change the level:
 *
 *     logger.setLevel(LOG_LEVELS.INFO);
 *
 * You can change grep (include matching) and grepv (exclude matching):
 *
 *     logger.setGrep('include only lines matching this text');
 *     logger.setGrepv('exclude any lines matching this text');
 *
 * If you want loggers to share context--for example, all logs for the player
 * should send to the same first1000LogLines and last1000LogLines caches.
 *
 *     Wistia.wlog = Wistia.wlog || {};
 *     const logger = new Logger(Wistia.wlog);
 *
 * A more advanced case would be to return the context in a function. This is
 * helpful if your logger is initialized/configured in one point, but used in
 * others that don't need to know about that configuration. In fact, this is
 * how the `wlog` constant is setup at the bottom of this file.
 *
 * We often want to have a global logger, but prefix certain portions of it.
 *
 *     const myLogger = logger.getPrefixedFunctions('my prefix');
 *     myLogger.info('aha'); // outputs "my prefix aha"
 *
 * A prefix can be a string or an array of strings. It can also be a function
 * that returns a string or an array of strings.
 *
 * In the above example, `myLogger` is a simple Object with defined logging
 * functions and fixed `this` context:
 *
 *    {
 *      error: (...messages) => { ... },
 *      warn: (...messages) => { ... },
 *      info: (...messages) => { ... },
 *      etc...
 *    }
 *
 * So it can also be used as a mix-in for other objects, e.g.
 *
 *    import {Logger} from 'utilities/wlog.js';
 *    class MyThing {
 *      constructor () {
 *        this.logger = new Logger().getPrefixedFunctions(this.logPrefix);
 *        for (let k in this.logger) {
 *          this[k] = this.logger[k];
 *        }
 *        this.info('my mixed-in logger is setup!');
 *      }
 *
 *      logPrefix = () => {
 *        return [this.id, this.variable];
 *      }
 *    }
 */
import { globalTrigger } from 'utilities/globalBindAndTrigger.js';
import { Wistia } from '../wistia_namespace.ts';

export const ERROR = 0;
export const WARNING = 1;
export const NOTICE = 2;
export const INFO = 3;
export const DEBUG = 4;
export const LOG_LEVELS = {
  ERROR,
  WARNING,
  NOTICE,
  INFO,
  DEBUG,
  error: ERROR,
  warning: WARNING,
  notice: NOTICE,
  info: INFO,
  debug: DEBUG,
};

const NOOP = function () {};

export const Logger = function (ctx) {
  const self = this;

  if (ctx == null) {
    ctx = {};
  }

  const construct = function () {
    self.ctx = ctx;
    if (!self.ctx.initializedAt) {
      self.reset();
    }
  };

  self.error = (...messages) => {
    return self.log(ERROR, messages);
  };
  self.warn = (...messages) => {
    return self.log(WARNING, messages);
  };
  self.notice = (...messages) => {
    return self.log(WARNING, messages);
  };
  self.info = (...messages) => {
    return self.log(INFO, messages);
  };
  self.debug = (...messages) => {
    return self.log(DEBUG, messages);
  };

  construct();

  return self;
};

const lproto = Logger.prototype;

lproto.reset = function () {
  this.ctx.level = ERROR;
  this.ctx.grep = null;
  this.ctx.grepv = null;
  this.ctx.first1000LogLines = [];
  this.ctx.last1000LogLines = [];
  this.ctx.initializedAt = new Date().getTime();
};

lproto.setLevel = function (level) {
  const logFunc = this.logFunc(INFO);
  if (LOG_LEVELS[level] != null) {
    this.ctx.level = LOG_LEVELS[level];
    logFunc(`Log level set to "${level}" (${LOG_LEVELS[level]})`);
  } else {
    logFunc(`Unknown log level "${level}"`);
  }
};

lproto.setGrep = function (grep) {
  this.ctx.grep = grep;
};

lproto.setGrepv = function (grepv) {
  this.ctx.grepv = grepv;
};

lproto.first1000LogLines = function () {
  return this.ctx.first1000LogLines;
};

lproto.last1000LogLines = function () {
  return this.ctx.last1000LogLines;
};

lproto.matchedGrep = function (messages) {
  let matched = false;
  if (this.ctx.grep || this.ctx.grepv) {
    let messageStrings = [];
    for (let i = 0; i < messages.length; i++) {
      try {
        let message = messages[i];
        messageStrings.push(message.toString && message.toString());
      } catch (e) {
        messageStrings.push('');
      }
    }
    let fullLine = messageStrings.join(' ');
    let matchesGrep = !this.ctx.grep || fullLine.match(this.ctx.grep);
    let matchesGrepv = !this.ctx.grepv || !fullLine.match(this.ctx.grepv);
    matched = matchesGrep && matchesGrepv;
  } else {
    matched = true;
  }
  return matched;
};

lproto.now = function () {
  // IE9 has window.performance, but not performance.now
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now().toFixed(3);
  }
  if (Date.now) {
    return Date.now() - this.ctx.initializedAt;
  }
  return new Date().getTime() - this.ctx.initializedAt;
};

lproto.messagesToLogLine = function (level, time, messages) {
  let logLine = [level, time];
  logLine = logLine.concat(messages);
  let cappedLine;
  try {
    cappedLine = logLine.join(' ') || '';
    if (cappedLine.length > 200) {
      cappedLine = cappedLine.slice(0, 200);
    }
  } catch (e1) {
    cappedLine = 'could not serialize';
  }
  return cappedLine;
};

lproto.persistLine = function (logLine) {
  if (this.ctx.first1000LogLines.length < 1000) {
    this.ctx.first1000LogLines.push(logLine);
  } else {
    if (this.ctx.last1000LogLines.length >= 1000) {
      this.ctx.last1000LogLines.shift();
    }
    this.ctx.last1000LogLines.push(logLine);
  }
};

lproto.log = function (level, messages) {
  const withinLevel = level <= this.ctx.level;
  const notDebug = level < DEBUG;
  const matched = (withinLevel || notDebug) && this.matchedGrep(messages);

  if (level === ERROR) {
    globalTrigger('problem', {
      type: 'error-logged',
      data: { messages },
    });
  }

  let now;
  if (matched && (withinLevel || notDebug)) {
    // This is initialized conditionally as a micro-optimization. We call
    // this function _a lot_, and new Date().getTime() (used on older
    // browsers) is expensive.
    now = this.now();
  }

  // Don't store "debug" lines, but keep the first and last 1000 lines so we
  // can send it with problem reports.
  if (notDebug && matched) {
    const logLine = this.messagesToLogLine(level, now, messages);
    this.persistLine(logLine);
  }

  // Output that log to the console! Minus info that is distracting like the
  // timestamp and log level.
  if (withinLevel && matched) {
    const logFunc = this.logFunc(level);
    let e;
    if (messages.length === 1 && (e = messages[0]) instanceof Error) {
      logFunc(e.message);
      if (e.stack) {
        logFunc(e.stack);
      }
    } else {
      logFunc(...messages);
    }
  }
};

const logError = function (...messages) {
  console.error.apply(console, messages);
};

const logWarn = function (...messages) {
  console.warn.apply(console, messages);
};

const logInfo = function (...messages) {
  console.info.apply(console, messages);
};

const logDebug = function (...messages) {
  console.debug.apply(console, messages);
};

const logLog = function (messages) {
  console.log.apply(console, messages);
};

lproto.logFunc = function (level) {
  if (level == null) {
    level = this.level;
  }

  if (!console) {
    return NOOP;
  }

  let func;
  if (level === ERROR) {
    func = logError;
  } else if (level === WARNING) {
    func = logWarn;
  } else if (level === INFO) {
    func = logInfo;
  } else if (level === DEBUG) {
    func = logDebug;
  }

  if (!func) {
    func = logLog;
  }

  if (typeof func !== 'function') {
    // This should pretty much never happen, but if it does, we could only
    // tell by checking the value of logger.noConsoleLog.
    this.noConsoleLog = true;
    func = NOOP;
  }

  return func;
};

lproto.maybePrefix = function (prefix, messages) {
  if (prefix) {
    // prefix can be a fixed value, or a function that returns a value.
    if (typeof prefix === 'function') {
      try {
        prefix = prefix();
      } catch (e) {
        prefix = `prefix err "${e.message}"`;
      }
    }

    if (prefix instanceof Array) {
      return prefix.concat(messages);
    }
    return [prefix].concat(messages);
  }
  return messages;
};

// Return a hash of functions so we can easily setup prefixes and mix in the
// results.
lproto.getPrefixedFunctions = function (prefix) {
  return {
    log: (...messages) => {
      return this.log(ERROR, this.maybePrefix(prefix, messages));
    },
    error: (...messages) => {
      return this.log(ERROR, this.maybePrefix(prefix, messages));
    },
    warn: (...messages) => {
      return this.log(WARNING, this.maybePrefix(prefix, messages));
    },
    notice: (...messages) => {
      return this.log(WARNING, this.maybePrefix(prefix, messages));
    },
    info: (...messages) => {
      return this.log(INFO, this.maybePrefix(prefix, messages));
    },
    debug: (...messages) => {
      return this.log(DEBUG, this.maybePrefix(prefix, messages));
    },
  };
};

// This should work in either the browser or node.
if (Wistia && Wistia.wlogCtx == null) {
  Wistia.wlogCtx = {};
}
export const wlog = new Logger(Wistia.wlogCtx);

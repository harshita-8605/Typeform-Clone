import * as bindify from 'utilities/bindify.js';
import { Wistia } from '../wistia_namespace.ts';
import { convertedEventNames, EventShepherd } from './eventShepherd.ts';

// This is an adaptation on top of bindify that is intended to provide both
// legacy functionality (returning `this` instead of an "unbind" function) and
// and functionality for "crosstime" and "betweentimes", which are
// "composite" bindings that do not have normal event signatures, as they take additional arguments.
//
// If you're setting up on/off/trigger for any new things, you should use
// bindify directly instead.

if (!Wistia.bindable) {
  if (!Wistia.EventShepherdManager) {
    Wistia.EventShepherdManager = {};
  }

  Wistia.bindable = {
    bind(event, callback) {
      if (event === 'crosstime' && this.crossTime) {
        this.crossTime.addBinding(arguments[1], arguments[2]);
        return this;
      }

      if (event === 'betweentimes' && this.betweenTimes) {
        this.betweenTimes.addBinding(arguments[1], arguments[2], arguments[3]);
        return this;
      }

      const embedElement = this.embedElement || this.container;

      if (Object.keys(convertedEventNames).includes(event) && embedElement) {
        const id = identifierFromEmbedElement(embedElement);
        if (Wistia.EventShepherdManager[id] === undefined) {
          Wistia.EventShepherdManager[id] = new EventShepherd();
        }
        Wistia.EventShepherdManager[id].addListener(event, embedElement, callback);
        return this;
      }

      if (callback) {
        bindify.bind.call(this, event, callback);
        return this;
      }

      if (Wistia.warn) {
        Wistia.warn(this.constructor.name, 'bind', 'falsey value passed in as callback:', callback);
      }
    },

    // unbind the matching callback and event for this video
    unbind(event, callback) {
      if (event === 'crosstime' && this.crossTime) {
        if (!callback) {
          this.crossTime.removeAllBindings();
        } else {
          this.crossTime.removeBinding(arguments[1], arguments[2]);
        }

        return this;
      }

      if (event === 'betweentimes' && this.betweenTimes) {
        if (!callback) {
          this.betweenTimes.removeAllBindings();
        } else {
          this.betweenTimes.removeBinding(arguments[1], arguments[2], arguments[3]);
        }
        return this;
      }

      const embedElement = this.embedElement || this.container;
      if (Object.keys(convertedEventNames).includes(event) && embedElement) {
        const id = identifierFromEmbedElement(embedElement);
        // return early if the EventShepherd for the hashedId is not defined
        if (Wistia.EventShepherdManager[id] === undefined) {
          return this;
        }
        Wistia.EventShepherdManager[id].removeListener(event, embedElement, callback);
        return this;
      }

      if (callback) {
        bindify.unbind.call(this, event, callback);
      } else if (this._bindings) {
        // no callback passed in, so clear all callbacks for this event
        this._bindings[event] = [];
      }

      // null/delete the event keys if they have no events
      if (this._bindings && this._bindings[event] && !this._bindings[event].length) {
        this._bindings[event] = null;
        delete this._bindings[event];
      }

      return this;
    },

    on(event, fn) {
      if (event === 'crosstime' && this.crossTime) {
        this.crossTime.addBinding(arguments[1], arguments[2]);

        return () => {
          this.crossTime.removeBinding(arguments[1], arguments[2]);
        };
      }

      if (event === 'betweentimes' && this.betweenTimes) {
        this.betweenTimes.addBinding(arguments[1], arguments[2], arguments[3]);

        return () => {
          this.betweenTimes.removeBinding(arguments[1], arguments[2], arguments[3]);
        };
      }

      const embedElement = this.embedElement || this.container;
      if (Object.keys(convertedEventNames).includes(event) && embedElement) {
        const id = identifierFromEmbedElement(embedElement);
        if (Wistia.EventShepherdManager[id] === undefined) {
          Wistia.EventShepherdManager[id] = new EventShepherd(embedElement);
        }

        Wistia.EventShepherdManager[id].addListener(event, embedElement, fn);

        return () => {
          Wistia.EventShepherdManager[id].removeListener(event, embedElement, fn);
        };
      }

      return bindify.bind.call(this, event, fn);
    },

    off(event, fn) {
      if (event === 'crosstime' && this.crossTime) {
        return this.crossTime.removeBinding(arguments[1], arguments[2]);
      }

      if (event === 'betweentimes' && this.betweenTimes) {
        return this.betweenTimes.removeBinding(arguments[1], arguments[2], arguments[3]);
      }

      const embedElement = this.embedElement || this.container;
      if (Object.keys(convertedEventNames).includes(event) && embedElement) {
        const id = identifierFromEmbedElement(embedElement);
        // return early if the EventShepherd for the hashedId is not defined
        if (Wistia.EventShepherdManager[id] === undefined) {
          return () => {};
        }
        return Wistia.EventShepherdManager[id].removeListener(event, embedElement, fn);
      }

      return bindify.unbind.call(this, event, fn);
    },

    rebind(event, callback) {
      this.unbind(event, callback);
      this.bind(event, callback);
      return this;
    },

    // fire an event trigger on the video. for play/pause/ended callbacks.
    trigger(event, ...args) {
      bindify.trigger.call(this, event, ...args);
      return this;
    },

    bindNamed() {
      return bindify.bindNamed.apply(this, arguments);
    },

    unbindNamed() {
      return bindify.unbindNamed.apply(this, arguments);
    },

    unbindAllInNamespace() {
      return bindify.unbindAllInNamespace.apply(this, arguments);
    },
  };
}

export const makeWbindable = function (obj) {
  for (let k in Wistia.bindable) {
    const v = Wistia.bindable[k];
    if (!obj[k]) {
      obj[k] = v;
    }
  }
};

const identifierFromEmbedElement = function (embedElement) {
  if (embedElement?.mediaId) {
    return embedElement.mediaId;
  }

  if (embedElement?.id) {
    return embedElement.id;
  }
};

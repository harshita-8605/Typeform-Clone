import { Wistia } from '../wistia_namespace.ts';

const aps = Array.prototype.slice;

export const bind = function (event, fn) {
  const self = this;
  if (!self._bindings) {
    self._bindings = {};
  }
  if (!self._bindings[event]) {
    self._bindings[event] = [];
  }
  self._bindings[event].push(fn);
  return function () {
    self.unbind(event, fn);
  };
};

export const unbind = function (event, fn) {
  if (!this._bindings) {
    return this;
  }
  if (!this._bindings[event]) {
    return this;
  }
  const bindings = [];
  for (let i = 0; i < this._bindings[event].length; i++) {
    let boundFn = this._bindings[event][i];
    if (boundFn !== fn) {
      bindings.push(boundFn);
    }
  }
  this._bindings[event] = bindings;
};

export const rebind = function (event, fn) {
  this.unbind(event, fn);
  this.bind(event, fn);
  return { event, fn };
};

export const trigger = function (event, ...args) {
  if (this._bindings && this._bindings.all != null) {
    triggerImpl.apply(this, ['all', event].concat(args));
  }
  return triggerImpl.apply(this, [event].concat(args));
};

const triggerImpl = function (event) {
  if (!this._bindings) {
    return this;
  }
  if (!this._bindings[event]) {
    return this;
  }
  const args = aps.call(arguments, 1);
  let unbinds;
  // memoize necessary to loop over all bindings if one of the bindings
  // unbinds a following binding
  const bindings = [...this._bindings[event]];
  for (let i = 0; i < bindings.length; i++) {
    let fn = bindings[i];
    try {
      let ret = fn.apply(this, args);
      // special return value will unbind when triggered
      if (ret === this.unbind) {
        if (unbinds == null) {
          unbinds = [];
        }
        unbinds.push({ event, fn });
      }
    } catch (e) {
      if (this._throwTriggerErrors) {
        throw e;
      } else if (Wistia.error) {
        Wistia.error(e);
      }
    }
  }

  if (unbinds) {
    for (let i = 0; i < unbinds.length; i++) {
      let unbind = unbinds[i];
      this.unbind(unbind.event, unbind.fn);
    }
  }

  return this;
};

export const once = function (event, fn) {
  const wrappedFn = function () {
    fn.apply(this, aps.call(arguments, 0));
    return unbind;
  };
  return bind(event, wrappedFn);
};

export const initNamespace = function (ctx, namespace) {
  if (ctx._namedBindings == null) {
    ctx._namedBindings = {};
  }

  if (ctx._namedBindings[namespace] == null) {
    ctx._namedBindings[namespace] = {};
  }
};

const getNamedBinding = function (ctx, namespace, fnKey) {
  initNamespace(ctx, namespace);
  return ctx._namedBindings[namespace][fnKey];
};

const setNamedBinding = function (ctx, namespace, fnKey, event, fn) {
  initNamespace(ctx, namespace);
  ctx._namedBindings[namespace][fnKey] = { event, fn };
};

export const bindNamed = function (namespace, fnKey, event, fn) {
  this.unbindNamed(namespace, fnKey);
  setNamedBinding(this, namespace, fnKey, event, fn);
  this.bind(event, fn);
  return function () {
    this.unbindNamed(namespace, fnKey);
  };
};

export const unbindNamed = function (namespace, fnKey) {
  initNamespace(this, namespace);
  const entry = getNamedBinding(this, namespace, fnKey);
  if (entry) {
    const { event, fn } = entry;
    this.unbind(event, fn);
  }
  const namedBindings = this._namedBindings;
  delete namedBindings[namespace][fnKey];
  if (isEmpty(namedBindings[namespace])) {
    delete namedBindings[namespace];
  }
  return this;
};

export const unbindAllInNamespace = function (namespace) {
  const bindings = this._namedBindings && this._namedBindings[namespace];
  if (bindings == null) {
    return this;
  }
  for (let fnKey in bindings) {
    if (Object.hasOwn(bindings, fnKey)) {
      this.unbindNamed(namespace, fnKey);
    }
  }
};

const isEmpty = function (obj) {
  for (let k in obj) {
    if (Object.hasOwn(obj, k)) {
      return false;
    }
  }
  return true;
};

export const bindify = function (prototype) {
  prototype.bind = bind;
  prototype.unbind = unbind;
  prototype.on = bind;
  prototype.off = unbind;
  prototype.rebind = rebind;
  prototype.trigger = trigger;
  prototype.bindNamed = bindNamed;
  prototype.unbindNamed = unbindNamed;
  prototype.unbindAllInNamespace = unbindAllInNamespace;
  return prototype;
};

// If you don't want to mix in state with an existing object, you can use this
// as a proxy, for example:
//
// var bindings = new Bindings();
// bindings.bind('hello', function(name) {
//   console.log('hi', name);
//   return bindings.unbind;
// });
// bindings.trigger('hello', 'Max');
export const Bindings = function () {};
bindify(Bindings.prototype);

import { Wistia } from '../../../../../wistia_namespace.ts';

if (Wistia.engines == null) {
  Wistia.engines = {};
}

const defineEngine = (name, klass) => {
  Wistia.engines[name] = klass;
};

export default defineEngine;

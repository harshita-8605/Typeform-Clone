// You wouldn't believe it, but IE11 does not support Object.assign(), so this
// is our non-polyfill replacement.

export const assign = (obj1, ...objs) => {
  if (Object.assign) {
    return Object.assign(obj1, ...objs);
  }
  for (let i = 0; i < objs.length; i++) {
    assignOne(obj1, objs[i]);
  }
  return obj1;
};

const assignOne = (obj1, obj2) => {
  for (let k in obj2) {
    if (Object.hasOwn(obj2, k)) {
      obj1[k] = obj2[k];
    }
  }
  return obj1;
};

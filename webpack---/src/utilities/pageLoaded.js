export const pageLoaded = (fn, timeout = 4000, doc = document, win = window) => {
  if (/loaded|complete/.test(doc.readyState)) {
    setTimeout(fn, 0);
  } else {
    const unbind = () => {
      win.removeEventListener('load', onPageLoad, false);
    };

    const onPageLoad = () => {
      clearTimeout(onLoadTimeout);
      unbind();
      fn();
    };

    win.addEventListener('load', onPageLoad, false);

    const onLoadTimeout = setTimeout(() => {
      unbind();
      fn();
    }, timeout);
  }
};

// Global debug logging functions
window.debug = (...args) => {
    new URLSearchParams(location.search).get('debug') === 'true' && console.log(...args);
};

window.debugError = (...args) => {
    new URLSearchParams(location.search).get('debug') === 'true' && console.error(...args);
};

window.debugWarn = (...args) => {
    new URLSearchParams(location.search).get('debug') === 'true' && console.warn(...args);
};
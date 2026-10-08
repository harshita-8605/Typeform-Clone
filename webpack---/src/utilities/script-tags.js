import { runScripts } from 'utilities/script-utils.js';

export const getScriptTags = (htmlStr) => {
  return htmlStr.match(/<script.*?src[^>]*>\s*<\/script>|<script.*?>[\s\S]+?<\/script>/gi) || [];
};

export const scriptTagsToRunScriptsInput = (scriptTags) => {
  if (!scriptTags) {
    return [];
  }
  if (!(scriptTags instanceof Array)) {
    scriptTags = getScriptTags(scriptTags);
  }
  const hashes = [];
  for (let i = 0; i < scriptTags.length; i++) {
    let scriptTag = scriptTags[i];
    let hash = {};
    let matches = scriptTag.match(/<script.*?>/i);
    if (matches) {
      matches = matches[0].match(/src="([^"]+)"/i);
      if (matches) {
        hash.src = matches[1];
        hash.async = /async/i.test(scriptTag.replace(hash.src, ''));
      }
    }
    if (!matches) {
      matches = scriptTag.match(/<script>([\s\S]+?)<\/script>/i);
      if (matches) {
        let src = matches[1];
        hash.fn = function () {
          // eslint-disable-next-line no-eval
          return eval(src);
        };
      }
    }
    hashes.push(hash);
  }
  return hashes;
};

export const execScriptTags = (scriptTags, callback) => {
  if (!scriptTags) {
    return null;
  }
  const hashes = scriptTagsToRunScriptsInput(scriptTags);
  return runScripts(hashes).then(callback);
};

export const removeScriptTags = (htmlStr) => {
  return htmlStr.replace(/<script.*?src[^>]*>\s*<\/script>|<script>[\s\S]+?<\/script>/g, '');
};

import { seqId } from 'utilities/seqid.js';
import { elemRemove } from '../../../../../../utilities/elem.js';

export const addTextTracks = (tracks, elem) => {
  const id = seqId('wistia_captions_');

  tracks.forEach((entry) => {
    const track = document.createElement('track');
    track.kind = entry.kind || 'captions';
    track.label = entry.native_name;
    track.srclang = entry.language;
    track.src = entry.src;
    track._wistiaCaptionsId = entry._wistiaCaptionsId || id;

    elem.appendChild(track, { wistiaGridCaller: true });
  });
};

export const removeTextTracks = (id, elem) => {
  const videoChildren = Array.prototype.slice.call(elem.childNodes);
  for (let i = 0; i < videoChildren.length; i++) {
    const child = videoChildren[i];
    if (/^track$/i.test(child.tagName) && child._wistiaCaptionsId === id) {
      elemRemove(child);
    }
  }
};

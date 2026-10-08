import { filter as filterAssets, READY } from 'utilities/assets.js';
import { filter } from 'utilities/obj.js';
import {
  cdnFastWistiaComHost,
  cdnFastProtectedWistiaComHost,
  eV1Protocol,
} from 'utilities/hosts.js';
import { cachedDetect } from 'utilities/detect.js';
import { root } from 'utilities/root.js';

const detect = cachedDetect();

const baseMultivariantHlsUrl = (engine) => {
  const { mediaData, attributes } = engine;
  const host = `${eV1Protocol()}//${cdnFastWistiaComHost(attributes.embedHost)}`;
  const protectedMediaHost = `${eV1Protocol()}//${cdnFastProtectedWistiaComHost(
    attributes.assetHost,
  )}`;
  if (mediaData.protected && attributes.authorization?.jwt) {
    // Protected localizations (dubs) are addressed through their SOURCE media:
    // the `pma` JWT is minted for the source and the edge validates it against
    // the media id in the URL path, so a dub can't be requested at its own
    // path. Instead we request the source's manifest and pass the dub's hashed
    // id as `?localization=`, which the origin (PrivateMediasController#show)
    // resolves against the source's enabled localizations. Alternate-audio
    // localizations don't take this path — they load the source media and
    // switch HLS audio tracks, so `mediaData.hashedId` is already the source.
    const sourceHashedId = mediaData.sourceHashedId ?? mediaData.hashedId;
    const isProtectedDub = sourceHashedId !== mediaData.hashedId;
    const pathHashedId = isProtectedDub ? sourceHashedId : mediaData.hashedId;
    const url = new URL(
      `${protectedMediaHost}/embed/accounts/${mediaData.accountId}/medias/${pathHashedId}.m3u8`,
    );
    if (isProtectedDub) {
      url.searchParams.set('localization', mediaData.hashedId);
    }
    return url;
  }

  return new URL(`${host}/embed/medias/${mediaData.hashedId}.m3u8`);
};

export const multivariantM3u8Url = (engine, options = {}) => {
  if (engine.attributes.liveMedia) {
    return engine.mediaData.liveStreamEventDetails.manifestUrl;
  }

  // A wrapping engine can point us at a specific manifest (e.g. a single transparent
  // rendition that is deliberately kept out of the media's multivariant manifest).
  if (engine.attributes.manifestUrl) {
    return engine.attributes.manifestUrl;
  }

  const {
    allowHdr,
    authorization,
    bitDepth,
    channelId,
    channelPassword,
    clipForPoster,
    clipFrom,
    clipTo,
    codec,
    deliveryCdn,
    disallowOriginalFilePlayback,
    forceInstantHls,
    forceOriginalFilePlayback,
    includeExtendedAudioDescription,
    password,
    qualityMax,
    qualityMin,
    startPosition,
  } = engine.attributes;

  const qMin = options.qualityMin || qualityMin;
  const qMax = options.qualityMax || qualityMax;

  const url = baseMultivariantHlsUrl(engine);

  // For hls.js, qualityMin and qualityMax are applied to the ABR controller such that it will
  // not select assets outside that range. However, we want to allow manual quality selection
  // outside the range, and to do that we need to ensure they are in the manifest for hls.js
  if (engine?.name !== 'HlsVideo') {
    if (qMin) {
      url.searchParams.set('quality_min', qMin);
    }

    if (qMax) {
      url.searchParams.set('quality_max', qMax);
    }
  }

  if (disallowOriginalFilePlayback) {
    url.searchParams.set('disallow_original_file_playback', disallowOriginalFilePlayback);
  }

  if (deliveryCdn) {
    url.searchParams.set('delivery_cdn', deliveryCdn);
  }

  if (startPosition && startPosition !== -1) {
    url.searchParams.set('start_position', startPosition);
  }

  if (clipForPoster && clipFrom != null && clipTo) {
    url.searchParams.set('clip_to', clipTo);
    url.searchParams.set('clip_from', clipFrom);
  }

  if (forceInstantHls) {
    url.searchParams.set('force_instant_hls', true);
  }

  if (forceOriginalFilePlayback) {
    url.searchParams.set('force_original_file_playback', true);
  }

  if (allowHdr && detect.hdr) {
    url.searchParams.set('allow_hdr', true);
  }

  if (bitDepth) {
    if (Array.isArray(bitDepth)) {
      // If it's an array, add each value
      bitDepth.forEach((depth) => {
        url.searchParams.append('bit_depth[]', depth);
      });
    } else {
      // If it's a single value
      url.searchParams.set('bit_depth', bitDepth);
    }
  }

  if (codec) {
    if (Array.isArray(codec)) {
      // If it's an array, add each value
      codec.forEach((format) => {
        url.searchParams.append('codec[]', format);
      });
    } else {
      // If it's a single value
      url.searchParams.set('codec', codec);
    }
  }

  // NOTE: This was removed because iOS doesn't know handle overlapping captions
  // well, and it turns out that's pretty common with extended audio
  // descriptions. If we figure out a way to avoid overlaps in the future, we
  // can re-enable this. If we re-enable this, the captions control may need to reload the HLS source,
  // but that needs to be done in a way that doesn't break HLS from incorrectly removing the source media stream.
  // https://wistia.slack.com/archives/C03A2QAMN8G/p1760634737785529
  // if (includeExtendedAudioDescription) {
  //   url.searchParams.set('include_extended_audio_description', true);
  // }

  if (authorization?.jwt) {
    // `pma` stands for private media auth, and is used by Fastly to validate the request
    url.searchParams.set('pma', authorization.jwt);
  }

  // Password Protected Videos need to pass the correct password in requests to the HLS asset
  // to prevent people circumventing the password by watching the direct HLS asset.
  if (password) {
    url.searchParams.set('password', password);
  }

  // Password Protected Channels can override media password protection when a media is
  // inside a password-protected channel and the correct channel credentials are provided.
  if (channelId && channelPassword) {
    url.searchParams.set('channel_id', channelId);
    url.searchParams.set('channel_password', channelPassword);
  }

  return url.toString();
};

export const adaptiveAsset = (engine, options) => {
  const assetUrl = multivariantM3u8Url(engine, options);
  const assetObj = buildMasterM3u8Asset(assetUrl);

  assetObj.display_name = 'Auto';
  assetObj.slug = 'Auto';
  return assetObj;
};

export const allHlsAudioAssets = (assets) => {
  return filterAssets(assets, {
    type: 'mp4_alternate_audio',
    status: READY,
  });
};

export const allMp4VideoAssets = (assets) => {
  return filterAssets(assets, {
    container: 'mp4',
    status: READY,
    public: true,
    metadata: (metadata) => Object(metadata).max_bitrate,
    type: /\b(?!captioned_video)\S+/, // no burned in captions
  }).sort((a, b) => {
    return (a.metadata.max_bitrate || 0) - (b.metadata.max_bitrate || 0);
  });
};

// It is possible to ask for the audio tracks of a video _before_ they have
// been loaded onto the video. This creates an array of audio tracks that mimics
// what the engine will return when the tracks are officially loaded
export const audioTracksForVideo = (audioAssets) => {
  const audioTracks = [
    {
      audioCodec: undefined,
      autoselect: true,
      default: true,
      forced: false,
      groupId: 'audio',
      id: 0,
      lang: undefined,
      name: 'Off',
      label: 'Original',
      type: 'AUDIO',
      isSelected: true,
    },
  ];

  audioAssets.forEach((asset, index) => {
    const track = {
      audioCodec: undefined,
      autoselect: false,
      default: false,
      forced: false,
      groupId: 'audio',
      id: index + 1, // add one to account for the original being in the 0 spot
      lang: undefined,
      name: asset.details?.languageMetadata.name || 'Alt Audio',
      label: asset.details?.languageMetadata.name || 'Alt Audio',
      type: 'AUDIO',
      isSelected: false,
    };

    if (asset.details?.audioDescription === true) {
      track.characteristics = 'public.accessibility.describes-video';
    }

    audioTracks.push(track);
  });

  return audioTracks;
};

export const buildMasterM3u8Asset = (url) => {
  return {
    bitrate: 'variable',
    ext: 'm3u8',
    height: 'variable',
    public: true,
    size: 'variable',
    type: 'hls_video',
    url,
    width: 'variable',
    slug: 'hls_master_m3u8_seg3s',
  };
};

// If devicePixelRatio=1 and our embedded video is 959 px wide, we probably
// want to be able to use the 960 width asset there. This fudge factor makes it
// so, if the embedded video's width is 959, we allow assets up to
// 959 * 1.2 = 1150px wide.
const MAX_WIDTH_FUDGE_FACTOR = 1.2;

export const maxAssetWidthBasedOnVideoWidth = (
  width,
  devicePixelRatio = root.devicePixelRatio || 1,
) => {
  // Almost all windows comps have devicePixelRatio = 1, which means that a 640
  // width embed will never hit 960. This isn't great because there would still
  // be a visible quality bump in this environment. By setting a min multiplier
  // for devicePixelRatio, we allow 960 in that scenario without impacting the
  // max quality on retina screens.
  const dynamicFudgeFactor = Math.max(1.25, devicePixelRatio) * MAX_WIDTH_FUDGE_FACTOR;
  const scaledWidth = width * dynamicFudgeFactor;
  return scaledWidth;
};

export const rejectAudioAsset = (nativeHlsVideo, assets) => {
  return filter(assets, (item) => {
    return item.display_name != 'Audio';
  });
};

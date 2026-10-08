import { isNil } from '@wistia/type-guards';
import { CarouselData } from '../types/carousel.ts';
import { Wistia } from '../wistia_namespace.ts';
import { MediaData } from '../types/player-api-types.ts';
import { wlog } from './wlog.js';
import { LiveStreamEventData } from '../types/live-stream-event.ts';

export const getMediaDataFromCache = (hashedId: string): MediaData | null | undefined => {
  const mediaData = Wistia._remoteData.get(`media_${hashedId}`);
  if (isNil(mediaData)) return null;

  // It's possible that we're caching a server error response as MediaData.
  // If we find one of those places, log an error.
  if (Object.hasOwn(mediaData, 'error')) {
    wlog.error(
      `Received cached error response instead of MediaData when retrieving cached mediaData for ${hashedId}`,
    );
  }

  return mediaData as MediaData;
};

export const cacheMediaData = (hashedId: string, data: MediaData): void => {
  Wistia._remoteData.set(`media_${hashedId}`, data);
};

export const uncacheMediaData = (hashedId: string): void => {
  Wistia._remoteData.delete(`media_${hashedId}`);
  Reflect.deleteProperty(Wistia._mediaDataPromises, hashedId);
};

export const cacheLiveStreamEventData = (hashedId: string, data: LiveStreamEventData): void => {
  Wistia._remoteData.set(`live_stream_event_${hashedId}`, data);
};

export const uncacheLiveStreamEventData = (hashedId: string): void => {
  Wistia._remoteData.delete(`live_stream_event_${hashedId}`);
};

export const getLiveStreamEventDataFromCache = (
  hashedId: string,
): LiveStreamEventData | null | undefined => {
  const liveStreamEventData = Wistia._remoteData.get(`live_stream_event_${hashedId}`);
  if (isNil(liveStreamEventData)) return null;

  // It's possible that we're caching a server error response as LiveStreamEventData.
  // If we find one of those places, log an error.
  if (Object.hasOwn(liveStreamEventData, 'error')) {
    wlog.error(
      `Received cached error response instead of LiveStreamEventData when retrieving cached liveStreamEventData for ${hashedId}`,
    );
    uncacheLiveStreamEventData(hashedId);
  }

  return liveStreamEventData as LiveStreamEventData;
};

export const getCarouselDataFromCache = (hashedId: string): CarouselData | null | undefined => {
  const carouselData = Wistia._remoteData.get(`carousel_${hashedId}`);
  if (isNil(carouselData)) return null;

  return carouselData as CarouselData;
};

export const cacheCarouselData = (hashedId: string, data: CarouselData): void => {
  Wistia._remoteData.set(`carousel_${hashedId}`, data);
};

export const uncacheCarouselData = (hashedId: string): void => {
  Wistia._remoteData.delete(`carousel_${hashedId}`);
};

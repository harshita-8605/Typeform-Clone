import { isNil } from '@wistia/type-guards';
import { MediaDataServerResponse } from '../types/player-api-types.ts';

export const isMediaDataError = (mediaData: MediaDataServerResponse): boolean => {
  if (!Object.hasOwn(mediaData, 'error') || isNil(mediaData.error)) {
    return false;
  }

  if (mediaData.error === 'true' || mediaData.error === true) {
    return true;
  }

  return false;
};

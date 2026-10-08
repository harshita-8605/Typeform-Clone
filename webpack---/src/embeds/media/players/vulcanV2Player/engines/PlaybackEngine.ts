import type { MediaData } from '../../../../../types/player-api-types.ts';
import type { EngineAttributes } from './types.ts';

export class PlaybackEngine {
  protected _bindings: Record<string, () => void>;

  protected attributes: EngineAttributes;

  protected mediaData: MediaData;

  protected root: HTMLElement;

  protected unbinds: (() => void)[];

  public constructor(root: HTMLElement, mediaData: MediaData, attributes: EngineAttributes) {
    this.root = root;
    this.mediaData = mediaData;
    this.attributes = attributes;
    this.unbinds = [];
  }

  public destroy(): void {
    this.unbinds.forEach((unbind) => {
      if (typeof unbind === 'function') {
        unbind();
      }
    });

    // created by bindify.js
    this._bindings = {};
  }
}

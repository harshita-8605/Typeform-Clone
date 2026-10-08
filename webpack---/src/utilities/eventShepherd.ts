import { MUTE_CHANGE_EVENT } from './eventConstants.ts';
import type { MUTE_CHANGE_EVENT_TYPE } from '../types/events.ts';

type EventCallback = (detail?: unknown) => void;

type StoredCallbacks = {
  eventListenerCallback: EventCallback;
  givenCallback: unknown;
};

// some legacy events are converted to a different name when they are added to the event listener
export const convertedEventNames: Record<string, string> = {
  mutechange: MUTE_CHANGE_EVENT,
};

// some legacy events have a different detail structure than the new ones
// this is a mapping of the old detail structure to the new one
const callbackDetailsConversions: Record<string, ((detail: unknown) => unknown) | undefined> = {
  mutechange: (detail: MUTE_CHANGE_EVENT_TYPE['detail']) => {
    return detail.isMuted;
  },
};

export class EventShepherd {
  private readonly convertedEventsMap: Record<string, StoredCallbacks[] | undefined> = {};

  public addListener(eventName: string, element: HTMLElement, callback: EventCallback): void {
    // if the event name is not in the convertedEventNames map, use the event name as is
    // this accounts for legacy events that do not have kebab-case names
    const normalizedEventName = convertedEventNames[eventName] ?? eventName;

    // if the event name is not in the convertedEventsMap, initialize an empty array
    this.convertedEventsMap[normalizedEventName] ??= [];

    const eventListenerCallback = (customEvent: CustomEvent) => {
      // if the callbackDetailsConversions map has a conversion function for the event name, use it.
      // for example, the mute-change event has a detail of { isMuted: boolean }, but the legacy event just passes a boolean
      if (callbackDetailsConversions[eventName]) {
        const convertedDetail = callbackDetailsConversions[eventName](customEvent.detail);
        callback(convertedDetail);
      } else {
        callback();
      }
    };

    // we have to store the callback and the event listener callback separately because:
    // 1. to properly remove the event listener, we need to have a reference to the event listener callback
    // 2. we need to match against the given callback to remove the correct listener
    this.convertedEventsMap[normalizedEventName].push({
      givenCallback: callback,
      eventListenerCallback,
    });

    // add the event listener to the element
    element.addEventListener(normalizedEventName, eventListenerCallback);
  }

  public removeAllListeners(element: HTMLElement): void {
    Object.keys(this.convertedEventsMap).forEach((eventName) => {
      this.convertedEventsMap[eventName]?.forEach((storedCallbacks: StoredCallbacks) => {
        element.removeEventListener(eventName, storedCallbacks.eventListenerCallback);
      });

      this.convertedEventsMap[eventName] = [];
    });
  }

  public removeListener(eventName: string, element: HTMLElement, callback?: EventCallback): void {
    const normalizedEventName = convertedEventNames[eventName] ?? eventName;
    const indexesToRemove: number[] = [];
    if (callback) {
      element.removeEventListener(normalizedEventName, callback);

      if (this.convertedEventsMap[normalizedEventName]) {
        this.convertedEventsMap[normalizedEventName].forEach((storedCallbacks, index) => {
          if (storedCallbacks.givenCallback === callback) {
            indexesToRemove.push(index);
            element.removeEventListener(normalizedEventName, storedCallbacks.eventListenerCallback);
          }
        });

        // remove the bindings entirely
        indexesToRemove.forEach((index: number) => {
          if (this.convertedEventsMap[normalizedEventName]) {
            this.convertedEventsMap[normalizedEventName].splice(index, 1);
          }
        });
      }
    } else {
      this.convertedEventsMap[normalizedEventName] = [];
    }
  }
}

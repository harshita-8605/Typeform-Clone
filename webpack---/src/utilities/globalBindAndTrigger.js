import { makeWbindable } from 'utilities/wbindable.js';
import { Wistia } from '../wistia_namespace.ts';

makeWbindable(Wistia);

export const globalBind = Wistia.bind.bind(Wistia);
export const globalOn = Wistia.on.bind(Wistia);
export const globalOff = Wistia.off.bind(Wistia);
export const globalRebind = Wistia.rebind.bind(Wistia);
export const globalTrigger = Wistia.trigger.bind(Wistia);
export const globalUnbind = Wistia.unbind.bind(Wistia);

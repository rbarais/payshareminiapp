import { fr } from './fr';
import { en } from './en';
import type { Locale } from '../utils/prefsStorage';

export const messages: Record<Locale, typeof fr> = { fr, en };
export type Dict = typeof fr;

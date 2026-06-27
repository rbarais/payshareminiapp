import type { GroupIcon } from '../types';

// Palette d'icônes de groupe (fond + trait), reprise du design.
export const GROUP_ICON_STYLE: Record<GroupIcon, { bg: string; color: string }> = {
  person: { bg: '#FFF1CF', color: '#B07808' },
  home: { bg: '#E0F5EE', color: '#198060' },
  car: { bg: '#EAEEFF', color: '#3844B0' },
  list: { bg: '#F0EEE9', color: '#6B6860' },
};

// Représentation brute (sans compensation) d'un groupe pour une carte compacte.
// La dette est prioritaire (c'est l'action à mener) ; sinon le crédit ; sinon soldé.
export function grossBalanceView(debt: number, credit: number): { amount: string; color: string; label: string } {
  if (debt > 0.005) return { amount: `−${debt.toFixed(1)} NIM`, color: '#CC3C3C', label: 'tu dois' };
  if (credit > 0.005) return { amount: `+${credit.toFixed(1)} NIM`, color: '#198060', label: 'on te doit' };
  return { amount: 'Soldé ✓', color: '#8B8880', label: '' };
}

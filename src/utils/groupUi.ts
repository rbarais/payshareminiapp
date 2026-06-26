import type { GroupIcon } from '../types';

// Palette d'icônes de groupe (fond + trait), reprise du design.
export const GROUP_ICON_STYLE: Record<GroupIcon, { bg: string; color: string }> = {
  person: { bg: '#FFF1CF', color: '#B07808' },
  home: { bg: '#E0F5EE', color: '#198060' },
  car: { bg: '#EAEEFF', color: '#3844B0' },
  list: { bg: '#F0EEE9', color: '#6B6860' },
};

// Représentation d'un solde net (NIM) : libellé, couleur et sous-texte.
// > 0 : on te doit · < 0 : tu dois · ≈ 0 : soldé.
export function balanceView(nim: number): { amount: string; color: string; label: string } {
  if (Math.abs(nim) < 0.005) return { amount: 'Soldé ✓', color: '#8B8880', label: '' };
  if (nim > 0) return { amount: `+${nim.toFixed(1)} NIM`, color: '#198060', label: 'on te doit' };
  return { amount: `${nim.toFixed(1)} NIM`, color: '#CC3C3C', label: 'tu dois' };
}

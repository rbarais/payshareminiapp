import type { GroupIcon } from '../types';

// Group icon palette (background + stroke), taken from the design.
export const GROUP_ICON_STYLE: Record<GroupIcon, { bg: string; color: string }> = {
  person: { bg: '#FFF1CF', color: '#B07808' },
  home: { bg: '#E0F5EE', color: '#198060' },
  car: { bg: '#EAEEFF', color: '#3844B0' },
  list: { bg: '#F0EEE9', color: '#6B6860' },
};

// Gross representation (no netting) of a group for a compact card.
// Debt takes priority (it's the action to take); otherwise credit; otherwise settled.
export function grossBalanceView(
  debt: number,
  credit: number,
): { amount: string; color: string; label: string } {
  if (debt > 0.005)
    return { amount: `−${debt.toFixed(1)} NIM`, color: '#CC3C3C', label: 'tu dois' };
  if (credit > 0.005)
    return { amount: `+${credit.toFixed(1)} NIM`, color: '#198060', label: 'on te doit' };
  return { amount: 'Soldé ✓', color: '#8B8880', label: '' };
}

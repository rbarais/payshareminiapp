import type { GroupIcon } from '../types';

// Group icon palette (background + stroke), taken from the design.
// Couleurs de trait reprises du proto ; fonds = teinte pâle assortie (même
// convention que les 4 icônes d'origine).
export const GROUP_ICON_STYLE: Record<GroupIcon, { bg: string; color: string }> = {
  person: { bg: '#FFF1CF', color: '#B07808' },
  home: { bg: '#E0F5EE', color: '#198060' },
  car: { bg: '#EAEEFF', color: '#3844B0' },
  list: { bg: '#F0EEE9', color: '#6B6860' },
  food: { bg: '#FCE7D6', color: '#B05000' },
  sport: { bg: '#DBEBFB', color: '#0060B0' },
  shopping: { bg: '#EEE1F6', color: '#6000A0' },
  travel: { bg: '#D8F0DC', color: '#006000' },
  beach: { bg: '#F7EECB', color: '#906000' },
  birthday: { bg: '#FADFEA', color: '#A03060' },
  work: { bg: '#E1E6F0', color: '#203050' },
  cafe: { bg: '#D6EDEE', color: '#005058' },
};

// Gross representation (no netting) of a group for a compact card.
// Debt takes priority (it's the action to take); otherwise credit; otherwise settled.
// `labelKey` and `amountKey` are i18n keys — pass to t() in the component.
export function grossBalanceView(
  debt: number,
  credit: number,
): { amount: string; amountKey: string; color: string; labelKey: string } {
  if (debt > 0.005)
    return { amount: `−${debt.toFixed(1)} NIM`, amountKey: '', color: '#CC3C3C', labelKey: 'group.owed' };
  if (credit > 0.005)
    return { amount: `+${credit.toFixed(1)} NIM`, amountKey: '', color: '#198060', labelKey: 'group.credited' };
  return { amount: '', amountKey: 'group.settled', color: '#8B8880', labelKey: '' };
}

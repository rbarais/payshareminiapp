// Palette d'avatars par initiale, assignée par index (membre, participant…).
// Centralisée ici car réutilisée par plusieurs vues/composants.
export const AVATAR_COLORS = [
  { bg: '#BEE0FF', color: '#0D3A5C' },
  { bg: '#C6F0DC', color: '#0A4028' },
  { bg: '#F0D4E8', color: '#4A1040' },
  { bg: '#FFE3C2', color: '#7A3E00' },
  { bg: '#E0DCF5', color: '#3A2A6B' },
];

export function avatarStyle(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function initial(name: string): string {
  return name.charAt(0).toUpperCase();
}

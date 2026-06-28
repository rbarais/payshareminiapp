import type { fr } from './fr';

export const en: typeof fr = {
  common: {
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add',
    back: 'Back',
    soon: 'Soon',
  },
  nav: {
    home: 'Home',
    groups: 'Groups',
    history: 'History',
    scan: 'Scan',
  },
  home: {
    myGroups: 'My groups',
    new: 'New',
    emptyTitle: 'No group here',
    emptySub: 'Create a group or join one via QR code',
    emptyCta: '+ New group',
    globalBalance: 'Global balance',
    credited: 'You are owed',
    owed: 'You owe',
  },
  group: {
    membersCount: '{count} members',
    expensesCount: '{count} expenses',
    owed: 'you owe',
    credited: 'you are owed',
    settled: 'Settled ✓',
  },
  settings: {
    title: 'Settings',
    walletConnection: 'Wallet connection via Nimiq Pay',
    connected: 'Connected',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
    language: 'Language',
    disconnect: 'Sign out',
  },
  toast: {
    memberAdded: '{name} added',
    historyComingSoon: 'History — coming soon',
  },
  error: {
    syncFailed: 'Sync failed',
  },
};

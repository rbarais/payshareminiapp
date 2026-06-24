// ─────────────────────────────────────────────────────────────────────────
// Modèle de données PayShare (Phase 0 — Option B : groupes synchronisés)
//
// Un Group persistant contient des Member et plusieurs Expense. Les soldes
// nets se déduisent des dépenses (qui a payé quoi, qui doit combien).
// La blockchain reste la source de vérité des paiements réels.
// ─────────────────────────────────────────────────────────────────────────

// Icône/catégorie d'un groupe (cf. design : person / home / car / list)
export type GroupIcon = 'person' | 'home' | 'car' | 'list';

// Membre d'un groupe — identifié par son adresse Nimiq lorsqu'il est connecté.
// Un invité pas encore connecté peut avoir un id temporaire.
export interface Member {
  id: string;        // adresse Nimiq (ou id temporaire)
  name: string;
  joinedAt: Date;
}

// Mode de répartition d'une dépense (cf. Notion : équitable / % / montant fixe)
export type SplitMode = 'equal' | 'percentage' | 'fixed';

// Part d'un membre dans une dépense.
export interface ExpenseShare {
  memberId: string;
  // Interprétation selon le mode de la dépense :
  //  - 'equal'      → ignoré (réparti à parts égales entre les membres listés)
  //  - 'percentage' → pourcentage 0..100
  //  - 'fixed'      → montant fixe dans la devise de la dépense
  weight: number;
  // Montant effectif dû par ce membre, figé à la création (devise de la dépense).
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;          // montant total
  currency: string;        // NIM, ETH, USDT, EUR…
  paidBy: string;          // id du membre payeur
  split: SplitMode;
  shares: ExpenseShare[];  // une entrée par membre concerné
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  icon: GroupIcon;
  creatorId: string;       // adresse Nimiq du créateur
  members: Member[];
  currencies: string[];    // devises de remboursement acceptées (NIM par défaut)
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────
// Données encodées dans le QR / lien de paiement — sous-ensemble partageable
// d'une dépense. Utilisé par PayView / QRScanner pour le règlement on-chain.
// Sera relié au modèle Expense lors du flux d'invitation (Phase 4).
// ─────────────────────────────────────────────────────────────────────────

export interface ShareableRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number;
  currency: string;
  reason: string;
  maxParticipants: number;
}

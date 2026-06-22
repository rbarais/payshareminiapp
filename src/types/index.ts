// Types pour l'application PayShare

export interface Participant {
  id: string;          // Adresse Nimiq du participant
  name: string;        // Nom affiché
  amountPaid: number;  // Montant déjà payé (0 par défaut)
  joinedAt: Date;      // Date de rejoindre
  status: 'pending' | 'paid';
}

export interface Room {
  id: string;               // ID unique de la room
  creatorId: string;        // Adresse Nimiq du créateur
  creatorName: string;      // Nom du créateur
  amount: number;           // Montant total à rembourser
  currency: string;         // Devise (ex: "NIM", "EUR")
  reason: string;           // Raison du remboursement
  maxParticipants: number;  // Nombre total de participants
  participants: Participant[]; // Liste des participants
  createdAt: Date;         // Date de création
  status: 'open' | 'closed';
}

export interface AppState {
  currentUser: {
    id: string;
    name: string;
  } | null;
  currentRoom: Room | null;
  rooms: Room[];
}

export type ViewType = 'create' | 'join' | 'room';

export interface Participant {
  id: string;
  name: string;
  amountPaid: number;
  joinedAt: Date;
  status: 'pending' | 'paid';
}

export interface Room {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number;
  currency: string;
  reason: string;
  maxParticipants: number;
  participants: Participant[];
  createdAt: Date;
  status: 'open' | 'closed';
}

// Données encodées dans le QR code — sous-ensemble partageable de Room
export interface ShareableRoom {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number;
  currency: string;
  reason: string;
  maxParticipants: number;
}

export type ViewType = 'home' | 'create' | 'pay';

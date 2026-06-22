import type { Room } from '../types';

const STORAGE_KEY = 'payshare_rooms';

/**
 * Récupère toutes les rooms depuis localStorage
 */
export function getRooms(): Room[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    const rooms = JSON.parse(stored) as Room[];
    // Convertir les dates depuis des strings
    return rooms.map(room => ({
      ...room,
      createdAt: new Date(room.createdAt),
      participants: room.participants.map(p => ({
        ...p,
        joinedAt: new Date(p.joinedAt)
      }))
    }));
  } catch {
    return [];
  }
}

/**
 * Sauvegarde toutes les rooms dans localStorage
 */
export function saveRooms(rooms: Room[]): void {
  // Convertir les dates en strings pour le stockage
  const serializableRooms = rooms.map(room => ({
    ...room,
    createdAt: room.createdAt.toISOString(),
    participants: room.participants.map(p => ({
      ...p,
      joinedAt: p.joinedAt.toISOString()
    }))
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableRooms));
}

/**
 * Ajoute une nouvelle room
 */
export function addRoom(room: Room): Room {
  const rooms = getRooms();
  rooms.push(room);
  saveRooms(rooms);
  return room;
}

/**
 * Met à jour une room existante
 */
export function updateRoom(updatedRoom: Room): Room | null {
  const rooms = getRooms();
  const index = rooms.findIndex(r => r.id === updatedRoom.id);
  
  if (index === -1) return null;
  
  rooms[index] = updatedRoom;
  saveRooms(rooms);
  return updatedRoom;
}

/**
 * Récupère une room par son ID
 */
export function getRoomById(id: string): Room | null {
  const rooms = getRooms();
  return rooms.find(r => r.id === id) || null;
}

/**
 * Génère un ID unique pour une room
 */
export function generateRoomId(): string {
  return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

import type { Group, Expense, Room } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// Persistance locale (localStorage).
//
// En Option B, localStorage sert de cache offline : la source de vérité du
// métier collaboratif sera le backend (Phase 1bis), et celle des paiements
// la blockchain. Pour la Phase 0, c'est le stockage principal du store.
// ─────────────────────────────────────────────────────────────────────────

const GROUPS_KEY = 'payshare_groups';
const EXPENSES_KEY = 'payshare_expenses';

// Recharge un tableau JSON typé, en re-hydratant les dates depuis leurs strings.
function load<T>(key: string, reviveDates: (raw: any) => T): T[] {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return (JSON.parse(stored) as any[]).map(reviveDates);
  } catch {
    return [];
  }
}

export function loadGroups(): Group[] {
  return load<Group>(GROUPS_KEY, (g) => ({
    ...g,
    createdAt: new Date(g.createdAt),
    members: (g.members ?? []).map((m: any) => ({ ...m, joinedAt: new Date(m.joinedAt) })),
  }));
}

export function saveGroups(groups: Group[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function loadExpenses(): Expense[] {
  return load<Expense>(EXPENSES_KEY, (e) => ({ ...e, createdAt: new Date(e.createdAt) }));
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

// Génère un id unique préfixé (ex. generateId('group') → 'group_…').
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Legacy — stockage des Room, encore utilisé par AddExpenseView.
// À retirer une fois la vue migrée vers Group/Expense (Phase 3).
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'payshare_rooms';

/** @deprecated voir Phase 3. */
export function getRooms(): Room[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const rooms = JSON.parse(stored) as Room[];
    return rooms.map((room) => ({
      ...room,
      createdAt: new Date(room.createdAt),
      participants: room.participants.map((p) => ({ ...p, joinedAt: new Date(p.joinedAt) })),
    }));
  } catch {
    return [];
  }
}

/** @deprecated voir Phase 3. */
export function saveRooms(rooms: Room[]): void {
  const serializableRooms = rooms.map((room) => ({
    ...room,
    createdAt: room.createdAt.toISOString(),
    participants: room.participants.map((p) => ({ ...p, joinedAt: p.joinedAt.toISOString() })),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableRooms));
}

/** @deprecated voir Phase 3. */
export function addRoom(room: Room): Room {
  const rooms = getRooms();
  rooms.push(room);
  saveRooms(rooms);
  return room;
}

/** @deprecated voir Phase 3. */
export function updateRoom(updatedRoom: Room): Room | null {
  const rooms = getRooms();
  const index = rooms.findIndex((r) => r.id === updatedRoom.id);
  if (index === -1) return null;
  rooms[index] = updatedRoom;
  saveRooms(rooms);
  return updatedRoom;
}

/** @deprecated voir Phase 3. */
export function getRoomById(id: string): Room | null {
  return getRooms().find((r) => r.id === id) || null;
}

/** @deprecated utiliser generateId('room'). */
export function generateRoomId(): string {
  return generateId('room');
}

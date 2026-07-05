import type { SettlementAllocation } from '../types';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Split a payment amount over the open expense shares, in order, first items
// first. The last touched share may be partially covered: legacy unallocated
// payments can make the payable total smaller than the sum of open shares.
export function buildAllocations(
  items: { expenseId: string; open: number }[],
  amount: number,
): SettlementAllocation[] {
  const allocations: SettlementAllocation[] = [];
  let left = round2(amount);
  for (const item of items) {
    if (left < 0.005) break;
    if (item.open < 0.005) continue;
    const take = Math.min(item.open, left);
    allocations.push({ expenseId: item.expenseId, amount: round2(take) });
    left = round2(left - take);
  }
  return allocations;
}

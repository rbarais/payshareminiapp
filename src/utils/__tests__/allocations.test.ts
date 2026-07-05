import { describe, it, expect } from 'vitest';
import { buildAllocations } from '../allocations';

describe('buildAllocations', () => {
  it('allocates a single share fully', () => {
    expect(buildAllocations([{ expenseId: 'e1', open: 5 }], 5)).toEqual([
      { expenseId: 'e1', amount: 5 },
    ]);
  });

  it('allocates across several shares when the amount covers them all', () => {
    expect(
      buildAllocations(
        [
          { expenseId: 'e1', open: 5 },
          { expenseId: 'e2', open: 4 },
        ],
        9,
      ),
    ).toEqual([
      { expenseId: 'e1', amount: 5 },
      { expenseId: 'e2', amount: 4 },
    ]);
  });

  it('fills greedily and leaves the last share partial when the amount is smaller', () => {
    // Legacy unallocated payments can make the payable total smaller than
    // the sum of open shares.
    expect(
      buildAllocations(
        [
          { expenseId: 'e1', open: 5 },
          { expenseId: 'e2', open: 4 },
        ],
        7,
      ),
    ).toEqual([
      { expenseId: 'e1', amount: 5 },
      { expenseId: 'e2', amount: 2 },
    ]);
  });

  it('skips already-settled shares (open below epsilon)', () => {
    expect(
      buildAllocations(
        [
          { expenseId: 'e1', open: 0 },
          { expenseId: 'e2', open: 4 },
        ],
        4,
      ),
    ).toEqual([{ expenseId: 'e2', amount: 4 }]);
  });

  it('returns no allocation when the amount is zero', () => {
    expect(buildAllocations([{ expenseId: 'e1', open: 5 }], 0)).toEqual([]);
  });

  it('rounds allocated amounts to 2 decimals', () => {
    expect(
      buildAllocations(
        [
          { expenseId: 'e1', open: 3.33 },
          { expenseId: 'e2', open: 3.33 },
        ],
        6.66,
      ),
    ).toEqual([
      { expenseId: 'e1', amount: 3.33 },
      { expenseId: 'e2', amount: 3.33 },
    ]);
  });
});

import { aggregateStockBalances, findStockSummaryMismatches } from './stock-balance.util';

describe('stock balance invariants', () => {
  it('aggregates store balances without including reservations in on-hand totals', () => {
    expect(
      aggregateStockBalances([
        {
          quantityReceived: 10,
          quantityIssued: 3,
          remainingQuantity: 7,
          reservedQuantity: 2,
        },
        {
          quantityReceived: 5,
          quantityIssued: 1,
          remainingQuantity: 4,
          reservedQuantity: 1,
        },
      ]),
    ).toEqual({
      quantityReceived: 15,
      quantityIssued: 4,
      remainingQuantity: 11,
      reservedQuantity: 3,
    });
  });

  it('detects missing and divergent aggregate summaries', () => {
    expect(
      findStockSummaryMismatches([
        {
          id: 'material-1',
          stockBalances: [
            {
              quantityReceived: 10,
              quantityIssued: 3,
              remainingQuantity: 7,
              reservedQuantity: 2,
            },
          ],
          stockSummary: {
            materialId: 'material-1',
            quantityReceived: 10,
            quantityIssued: 2,
            remainingQuantity: 8,
          },
        },
        {
          id: 'material-2',
          stockBalances: [],
          stockSummary: null,
        },
      ]),
    ).toEqual([
      {
        materialId: 'material-1',
        expected: {
          quantityReceived: 10,
          quantityIssued: 3,
          remainingQuantity: 7,
          reservedQuantity: 2,
        },
        actual: {
          materialId: 'material-1',
          quantityReceived: 10,
          quantityIssued: 2,
          remainingQuantity: 8,
        },
      },
      {
        materialId: 'material-2',
        expected: {
          quantityReceived: 0,
          quantityIssued: 0,
          remainingQuantity: 0,
          reservedQuantity: 0,
        },
        actual: null,
      },
    ]);
  });

  it('does not report a matching aggregate summary as a mismatch', () => {
    expect(
      findStockSummaryMismatches([
        {
          id: 'material-1',
          stockBalances: [
            {
              quantityReceived: 10,
              quantityIssued: 3,
              remainingQuantity: 7,
              reservedQuantity: 2,
            },
          ],
          stockSummary: {
            materialId: 'material-1',
            quantityReceived: 10,
            quantityIssued: 3,
            remainingQuantity: 7,
          },
        },
      ]),
    ).toEqual([]);
  });
});

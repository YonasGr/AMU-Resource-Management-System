export interface StockBalanceSnapshot {
  storeId: string;
  materialId: string;
  quantityReceived: number;
  quantityIssued: number;
  remainingQuantity: number;
  reservedQuantity: number;
}

type StockBalanceQuantities = Pick<
  StockBalanceSnapshot,
  'quantityReceived' | 'quantityIssued' | 'remainingQuantity' | 'reservedQuantity'
>;

export interface StockSummarySnapshot {
  materialId: string;
  quantityReceived: number;
  quantityIssued: number;
  remainingQuantity: number;
}

export interface StockBalanceAggregate {
  quantityReceived: number;
  quantityIssued: number;
  remainingQuantity: number;
  reservedQuantity: number;
}

export interface StockSummaryMismatch {
  materialId: string;
  expected: StockBalanceAggregate;
  actual: StockSummarySnapshot | null;
}

export function aggregateStockBalances(
  balances: StockBalanceQuantities[],
): StockBalanceAggregate {
  return balances.reduce(
    (aggregate, balance) => ({
      quantityReceived: aggregate.quantityReceived + balance.quantityReceived,
      quantityIssued: aggregate.quantityIssued + balance.quantityIssued,
      remainingQuantity: aggregate.remainingQuantity + balance.remainingQuantity,
      reservedQuantity: aggregate.reservedQuantity + balance.reservedQuantity,
    }),
    { quantityReceived: 0, quantityIssued: 0, remainingQuantity: 0, reservedQuantity: 0 },
  );
}

export function findStockSummaryMismatches(
  materials: Array<{
    id: string;
    stockBalances: StockBalanceQuantities[];
    stockSummary: StockSummarySnapshot | null;
  }>,
): StockSummaryMismatch[] {
  return materials.flatMap((material) => {
    const expected = aggregateStockBalances(material.stockBalances);
    const actual = material.stockSummary;
    if (
      actual &&
      expected.quantityReceived === actual.quantityReceived &&
      expected.quantityIssued === actual.quantityIssued &&
      expected.remainingQuantity === actual.remainingQuantity
    ) {
      return [];
    }
    return [{ materialId: material.id, expected, actual }];
  });
}

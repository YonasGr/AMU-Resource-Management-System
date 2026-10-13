import { ConflictException } from '@nestjs/common';

export class StockConflictException extends ConflictException {
  constructor(
    message: string,
    details: {
      operation: string;
      materialId?: string;
      storeId?: string;
    },
  ) {
    super({
      code: 'STOCK_CONFLICT',
      message,
      ...details,
    });
  }
}

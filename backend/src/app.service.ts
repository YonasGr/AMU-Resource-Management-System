import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'university-erp-backend',
      time: new Date().toISOString(),
    };
  }
}

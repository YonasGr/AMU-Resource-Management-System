import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Root status check' })
  getRoot() {
    return {
      status: 'ok',
      service: 'AMU Dedicated Store & Resource Management System API',
      documentation: '/api/docs',
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint used by Docker/monitoring' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health/readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness check for database and Redis dependencies' })
  async getReadiness() {
    return this.appService.getReadiness();
  }
}

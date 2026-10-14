import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser, SafeUser } from '../auth/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get store inventory statistics and low-stock alerts' })
  getStats(@CurrentUser() user: SafeUser) {
    return this.dashboardService.getStats(user);
  }

  @Get('exceptions')
  @ApiOperation({ summary: 'Get actionable inventory exception queues' })
  getExceptions() {
    return this.dashboardService.getExceptions();
  }
}

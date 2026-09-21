import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly audit: AuditService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Get('dashboard/stats')
  getStats() {
    return this.dashboard.getStats();
  }

  @Roles(UserRole.ADMIN)
  @Get('dashboard/recent-activity')
  getRecentActivity() {
    return this.dashboard.getRecentActivity();
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Get('audit-logs')
  getAuditLogs(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.audit.list({
      userId,
      entityType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @Get('audit-logs/:logId')
  async getAuditLog(@Param('logId') logId: string) {
    const log = await this.audit.getById(logId);
    if (!log) throw new NotFoundException('Registro de auditoría no encontrado');
    return log;
  }
}

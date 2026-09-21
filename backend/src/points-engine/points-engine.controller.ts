import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PointsEngineService } from './points-engine.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@ApiTags('admin/points-engine')
@Controller('admin/points-engine')
export class PointsEngineController {
  constructor(private readonly pointsEngine: PointsEngineService) {}

  // Lectura abierta a cualquier usuario autenticado: el dashboard del socio
  // necesita el umbral de puntos vigente para pintar la barra de progreso.
  // Solo la escritura (PUT/recalculate) es exclusiva de ADMIN.
  @Get('config')
  getConfig() {
    return this.pointsEngine.getCurrentConfig();
  }

  @Roles(UserRole.ADMIN)
  @Put('config')
  updateConfig(@Body() dto: UpdateConfigDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pointsEngine.updateConfig(dto, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Post('recalculate')
  recalculate(@CurrentUser() user: AuthenticatedUser) {
    return this.pointsEngine.recalculateAllBalances(user.userId);
  }
}

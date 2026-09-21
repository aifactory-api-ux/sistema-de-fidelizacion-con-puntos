import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { UpsertPromotionDto } from './dto/upsert-promotion.dto';
import { AssignPromotionDto } from './dto/assign-promotion.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@ApiTags('promotions')
@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('promotions')
  catalog() {
    return this.promotionsService.listActiveCatalog();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/promotions')
  listForAdmin() {
    return this.promotionsService.listForAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/promotions')
  create(@Body() dto: UpsertPromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotionsService.create(dto, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Put('admin/promotions/:promotionId')
  update(
    @Param('promotionId') promotionId: string,
    @Body() dto: UpsertPromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promotionsService.update(promotionId, dto, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Delete('admin/promotions/:promotionId')
  remove(@Param('promotionId') promotionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.promotionsService.remove(promotionId, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/promotions/assign')
  assign(@Body() dto: AssignPromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotionsService.assign(dto, user.userId);
  }
}

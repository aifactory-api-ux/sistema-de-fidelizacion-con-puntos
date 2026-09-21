import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChequeStatus, UserRole } from '@prisma/client';
import { ChequesService } from './cheques.service';
import { RedeemChequeDto } from './dto/redeem-cheque.dto';
import { VoidChequeDto } from './dto/void-cheque.dto';
import { GenerateChequeDto } from './dto/generate-cheque.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { assertOwnCustomerOrStaff } from '../common/assert-own-customer';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@ApiTags('cheques')
@Controller()
export class ChequesController {
  constructor(private readonly chequesService: ChequesService) {}

  @Get('cheques/:chequeId')
  async getOne(@Param('chequeId') chequeId: string, @CurrentUser() user: AuthenticatedUser) {
    const cheque = await this.chequesService.getById(chequeId);
    assertOwnCustomerOrStaff(user, cheque.account.customerId);
    return cheque;
  }

  @Post('cheques/:chequeId/redeem')
  async redeem(
    @Param('chequeId') chequeId: string,
    @Body() dto: RedeemChequeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cheque = await this.chequesService.getById(chequeId);
    assertOwnCustomerOrStaff(user, cheque.account.customerId);
    return this.chequesService.redeem(chequeId, dto, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Post('cheques/:chequeId/void')
  void(@Param('chequeId') chequeId: string, @Body() dto: VoidChequeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chequesService.void(chequeId, dto, user.userId);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/cheques/generate')
  generate(@Body() dto: GenerateChequeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chequesService.generate(dto, user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.AUDITOR, UserRole.ATENCION_CLIENTE)
  @Get('admin/cheques')
  listForAdmin(@Query('status') status?: ChequeStatus, @Query('customerId') customerId?: string) {
    return this.chequesService.listForAdmin({ status, customerId });
  }
}

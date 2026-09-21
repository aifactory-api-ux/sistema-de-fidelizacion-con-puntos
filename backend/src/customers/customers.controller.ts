import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ChequesService } from '../cheques/cheques.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { assertOwnCustomerOrStaff } from '../common/assert-own-customer';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@ApiTags('customers')
@Roles(UserRole.SOCIO, UserRole.ADMIN, UserRole.ATENCION_CLIENTE, UserRole.AUDITOR)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly chequesService: ChequesService,
    private readonly promotionsService: PromotionsService,
  ) {}

  @Get(':customerId')
  async getOne(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.customersService.getById(customerId);
  }

  @Roles(UserRole.SOCIO, UserRole.ADMIN)
  @Put(':customerId')
  async update(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.customersService.update(customerId, dto, user.userId);
  }

  @Get(':customerId/accounts')
  async getAccounts(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return [await this.customersService.getAccount(customerId)];
  }

  @Get(':customerId/cheques')
  async getCheques(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.chequesService.listForCustomer(customerId);
  }

  @Get(':customerId/transactions')
  async getTransactions(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.customersService.getTransactions(customerId);
  }

  @Get(':customerId/point-ledger')
  async getPointLedger(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.customersService.getPointLedger(customerId);
  }

  @Get(':customerId/promotions')
  async getPromotions(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.promotionsService.listForCustomer(customerId);
  }

  @Get(':customerId/qr')
  async getQr(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    assertOwnCustomerOrStaff(user, customerId);
    return this.customersService.getQrCode(customerId);
  }
}

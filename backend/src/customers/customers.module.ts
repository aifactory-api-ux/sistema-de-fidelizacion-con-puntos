import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { ChequesModule } from '../cheques/cheques.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [ChequesModule, PromotionsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}

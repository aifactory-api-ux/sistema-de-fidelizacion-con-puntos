import { Module } from '@nestjs/common';
import { ChequesService } from './cheques.service';
import { ChequesController } from './cheques.controller';
import { PointsEngineModule } from '../points-engine/points-engine.module';

@Module({
  imports: [PointsEngineModule],
  controllers: [ChequesController],
  providers: [ChequesService],
  exports: [ChequesService],
})
export class ChequesModule {}

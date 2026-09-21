import { Module } from '@nestjs/common';
import { PointsEngineService } from './points-engine.service';
import { PointsEngineController } from './points-engine.controller';

@Module({
  controllers: [PointsEngineController],
  providers: [PointsEngineService],
  exports: [PointsEngineService],
})
export class PointsEngineModule {}

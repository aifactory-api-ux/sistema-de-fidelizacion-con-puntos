import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PointsEngineModule } from '../points-engine/points-engine.module';

@Module({
  imports: [PointsEngineModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertPromotionDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  // { audience: 'all' } es visible para todos los socios; cualquier otro
  // valor (ej. { audience: 'segment', segmentId: '...' }) requiere
  // asignación explícita vía POST /admin/promotions/assign.
  @IsOptional()
  @IsObject()
  eligibilityCriteria?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GenerateChequeDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number; // si no se especifica, se usa el valor vigente del motor de puntos

  @IsString()
  reason!: string; // ajuste manual — siempre auditado (RF-AYA-006/008)
}

import { IsString, MinLength } from 'class-validator';

export class VoidChequeDto {
  @IsString()
  @MinLength(3, { message: 'El motivo de anulación es obligatorio y debe ser descriptivo' })
  reason!: string;
}

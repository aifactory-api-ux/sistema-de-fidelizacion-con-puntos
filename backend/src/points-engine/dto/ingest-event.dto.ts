import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class IngestEventDto {
  @IsIn(['purchase', 'return'])
  type!: 'purchase' | 'return';

  @IsString()
  customerId!: string;

  @IsString()
  externalEventId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Requerido cuando type = 'return': referencia al externalEventId de la
  // compra original que se está devolviendo, para poder revertir sus puntos.
  @IsOptional()
  @IsString()
  originalExternalEventId?: string;
}

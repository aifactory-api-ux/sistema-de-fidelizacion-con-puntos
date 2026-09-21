import { IsOptional, IsString } from 'class-validator';

export class RedeemChequeDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

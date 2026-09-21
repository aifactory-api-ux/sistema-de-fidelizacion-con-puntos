import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateConfigDto {
  @IsNumber()
  @Min(0)
  earnRatio!: number; // puntos por cada euro elegible

  @IsInt()
  @Min(1)
  chequeThresholdPoints!: number; // puntos necesarios para emitir un cheque

  @IsNumber()
  @Min(0)
  chequeValue!: number; // valor en euros del cheque emitido

  @IsInt()
  @Min(1)
  chequeExpiryDays!: number;

  @IsOptional()
  @IsArray()
  exclusions?: string[];

  @IsOptional()
  @IsString()
  changeReason?: string;
}

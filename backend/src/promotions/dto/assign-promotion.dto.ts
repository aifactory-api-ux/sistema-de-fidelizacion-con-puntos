import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AssignPromotionDto {
  @IsString()
  promotionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  customerIds!: string[];
}

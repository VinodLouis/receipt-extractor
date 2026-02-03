import {
  IsString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsISO8601,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiptItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  cost: number;
}

export class ExtractionResultDto {
  @IsISO8601()
  date: string;

  @IsString()
  @Length(3, 3)
  currency: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];

  @IsNumber()
  @Min(0)
  tax: number;

  @IsNumber()
  @Min(0)
  total: number;
}

export class InvalidReceiptDto {
  @IsString()
  reason: string;
}

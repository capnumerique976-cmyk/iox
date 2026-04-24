import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MinLength,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyType } from '@iox/shared';
import { Type } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Coopérative des pêcheurs de Mayotte' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: CompanyType, isArray: true, example: [CompanyType.SUPPLIER] })
  @IsArray()
  @IsEnum(CompanyType, { each: true })
  types: CompanyType[];

  @ApiPropertyOptional({ example: 'contact@coop-peche-mayotte.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+262 269 000 000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mamoudzou' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'FR' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ example: 'https://coop-peche.yt' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional({ enum: CompanyType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(CompanyType, { each: true })
  types?: CompanyType[];
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class QueryCompaniesDto {
  @IsOptional() @Type(() => Number) page?: number = 1;
  @IsOptional() @Type(() => Number) limit?: number = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(CompanyType) type?: CompanyType;
  @IsOptional() @IsBoolean() @Type(() => Boolean) isActive?: boolean;
}

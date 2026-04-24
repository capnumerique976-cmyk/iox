import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType, DocumentStatus } from '@iox/shared';

export class UploadDocumentDto {
  /** Nom affiché du document */
  @IsString()
  name: string;

  /** Type d'entité parente (polymorphisme) */
  @IsEnum(EntityType)
  linkedEntityType: EntityType;

  /** ID de l'entité parente */
  @IsUUID()
  linkedEntityId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus)
  status: DocumentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryDocumentsDto {
  @IsOptional()
  @IsEnum(EntityType)
  linkedEntityType?: EntityType;

  @IsOptional()
  @IsUUID()
  linkedEntityId?: string;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

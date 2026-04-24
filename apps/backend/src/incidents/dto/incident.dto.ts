import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { IncidentSeverity, IncidentStatus, EntityType } from '@iox/shared';

/* ------------------------------------------------------------------ */
/*  Création                                                            */
/* ------------------------------------------------------------------ */

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsDateString()
  incidentDate: string;

  /* Entité concernée (optionnel) */
  @IsOptional()
  @IsEnum(EntityType)
  linkedEntityType?: EntityType;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

/* ------------------------------------------------------------------ */
/*  Mise à jour partielle                                               */
/* ------------------------------------------------------------------ */

export class UpdateIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  actionsTaken?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(EntityType)
  linkedEntityType?: EntityType;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;
}

/* ------------------------------------------------------------------ */
/*  Changement de statut                                               */
/* ------------------------------------------------------------------ */

export class ChangeIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

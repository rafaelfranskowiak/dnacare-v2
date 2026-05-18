import { IsString, IsOptional, IsIn, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PF', 'PJ'])
  type: 'PF' | 'PJ';

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

class TierConfigDto {
  @IsNumber()
  @Min(1)
  min: number;

  @IsNumber()
  max: number | null;

  @IsNumber()
  @Min(0)
  value: number;
}

export class PublishPlanDto {
  @IsNumber()
  @Min(0)
  baseValue: number;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsIn(['none', 'fixed', 'progressive', 'regressive', 'tiered'])
  dependentRule: string;

  @IsNumber()
  @Min(0)
  includedDependents: number;

  @IsOptional()
  @IsNumber()
  maxDependents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDependents?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dependentValue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierConfigDto)
  tiersConfig?: TierConfigDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  admissionFee?: number;
}

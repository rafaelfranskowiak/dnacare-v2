import { IsString, IsOptional, IsIn, MinLength, IsUUID } from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  name: string;

  @IsString()
  document: string;
}

export class UpdateOpportunityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsUUID() planVersionId?: string;
  @IsOptional() @IsIn(['CREDIT_CARD', 'BOLETO']) paymentMethod?: string;
}

export class CancelOpportunityDto {
  @IsString()
  @MinLength(20)
  reason: string;
}

export class AddDependentDto {
  @IsString()
  name: string;

  @IsString()
  document: string;
}

export class GenerateCheckoutDto {
  @IsUUID()
  planVersionId: string;

  @IsIn(['CREDIT_CARD', 'BOLETO'])
  paymentMethod: string;
}

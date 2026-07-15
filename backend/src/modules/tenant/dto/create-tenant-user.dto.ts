import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateTenantUserDto {
  @IsString()
  @IsUUID()
  tenant_id: string;

  @IsString()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'gerente', 'representante'])
  role?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}

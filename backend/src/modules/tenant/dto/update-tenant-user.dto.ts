import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateTenantUserDto {
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'gerente', 'representante'])
  role?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}

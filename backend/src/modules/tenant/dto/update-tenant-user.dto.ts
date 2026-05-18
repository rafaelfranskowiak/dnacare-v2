import { IsString, IsIn } from 'class-validator';

export class UpdateTenantUserStatusDto {
  @IsString()
  @IsIn(['active', 'inactive'])
  status: string;
}

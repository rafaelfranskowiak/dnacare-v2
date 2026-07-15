import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { TenantUserService } from '../../tenant/tenant-user.service';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  is_platform_admin?: boolean;
  role?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly tenantUsers: TenantUserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }

    if (user.is_platform_admin) {
      return {
        id: user.id,
        email: user.email,
        tenantId: payload.tenantId || user.tenantId,
        role: 'super_admin',
        is_platform_admin: true,
      };
    }

    const tenantId = payload.tenantId || user.tenantId;
    const tenantUser = await this.tenantUsers.findByUserAndTenant(user.id, tenantId);

    if (!tenantUser) {
      throw new UnauthorizedException('Usuário sem vínculo ativo com a unidade');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId,
      role: tenantUser.role,
      is_platform_admin: false,
    };
  }
}

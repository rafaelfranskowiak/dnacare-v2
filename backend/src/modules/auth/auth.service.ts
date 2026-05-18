import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TenantUserService } from '../tenant/tenant-user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tenantUsers: TenantUserService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, tenantId: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    if (user.tenantId !== tenantId) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException();

    const tenantUser = await this.tenantUsers.findByUserAndTenant(user.id, tenantId);
    const role = tenantUser?.role || null;

    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, is_platform_admin: user.is_platform_admin, role };
    const accessToken = this.jwt.sign(payload);

    return { accessToken, tenantId: user.tenantId, user: { id: user.id, email: user.email, name: user.name, is_platform_admin: user.is_platform_admin, role } };
  }

  async adminLogin(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException();

    if (!user.is_platform_admin) throw new UnauthorizedException('Acesso restrito a administradores');

    const payload = { sub: user.id, email: user.email, tenantId: user.tenantId, is_platform_admin: user.is_platform_admin, role: 'super_admin' };
    const accessToken = this.jwt.sign(payload);

    return { accessToken, tenantId: user.tenantId, user: { id: user.id, email: user.email, name: user.name, is_platform_admin: user.is_platform_admin, role: 'super_admin' } };
  }
}

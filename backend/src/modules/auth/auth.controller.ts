import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto.email, dto.password, req.tenantId);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, TenantAccessGuard)
  getProfile(@Req() req: any) {
    return req.user;
  }
}

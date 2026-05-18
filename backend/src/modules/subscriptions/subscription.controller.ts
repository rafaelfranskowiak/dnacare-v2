import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { SubscriptionService } from './subscription.service';
import { AsaasService } from '../asaas/asaas.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class SubscriptionController {
  constructor(
    private readonly subService: SubscriptionService,
    private readonly asaasService: AsaasService,
  ) {}

  @Get()
  async list(@Request() req: any, @Query() query: any) {
    return { data: [] };
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return null;
  }

  @Get(':id/payments')
  async payments(@Param('id') id: string) {
    return { data: [] };
  }
}

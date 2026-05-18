import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccessGuard } from '../tenant/guards/tenant-access.guard';
import { SaleService } from './sale.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get()
  async list(@Request() req: any, @Query() query: any) {
    const result = await this.saleService.findAll(req.tenantId, query);
    return { data: result.data, meta: { page: query.page || 1, limit: query.limit || 20, total: result.total } };
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return this.saleService.findById(id, req.tenantId);
  }
}

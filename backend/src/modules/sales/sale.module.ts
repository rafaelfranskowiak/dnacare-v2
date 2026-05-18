import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './sale.entity';
import { SaleService } from './sale.service';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), AsaasModule],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}

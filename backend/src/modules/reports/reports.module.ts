import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '../opportunities/opportunity.entity';
import { Sale } from '../sales/sale.entity';
import { Client } from '../clients/client.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, Sale, Client])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityDependent } from './opportunity-dependent.entity';
import { DocumentRegistry } from './document-registry.entity';
import { OpportunityService } from './opportunity.service';
import { OpportunityController } from './opportunity.controller';
import { DocumentRegistryService } from './document-registry.service';
import { ViaCepService } from './viacep.service';
import { SaleModule } from '../sales/sale.module';
import { PlanModule } from '../plans/plan.module';
import { TenantModule } from '../tenant/tenant.module';
import { PlanVersion } from '../plans/plan-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, OpportunityDependent, DocumentRegistry, PlanVersion]), SaleModule, PlanModule, TenantModule],
  controllers: [OpportunityController],
  providers: [OpportunityService, DocumentRegistryService, ViaCepService],
  exports: [OpportunityService, DocumentRegistryService],
})
export class OpportunityModule {}

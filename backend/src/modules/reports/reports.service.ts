import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from '../opportunities/opportunity.entity';
import { Sale } from '../sales/sale.entity';
import { Client } from '../clients/client.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Opportunity) private readonly oppRepo: Repository<Opportunity>,
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
  ) {}

  async unitDashboard(tenantId: string) {
    const opps = await this.oppRepo.find({ where: { tenantId } });
    const sales = await this.saleRepo.find({ where: { tenantId } });
    const clients = await this.clientRepo.find({ where: { tenantId } });

    return {
      opportunities: {
        total: opps.length,
        aberta: opps.filter(o => o.status === 'aberta').length,
        checkoutGerado: opps.filter(o => o.status === 'checkout_gerado').length,
        convertida: opps.filter(o => o.status === 'convertida').length,
        cancelada: opps.filter(o => o.status === 'cancelada').length,
        conversionRate: opps.length ? +(opps.filter(o => o.status === 'convertida').length / opps.length * 100).toFixed(1) : 0,
      },
      sales: {
        pending: sales.filter(s => s.status === 'pending_payment').length,
        confirmed: sales.filter(s => s.status === 'confirmed').length,
        cancelledBeforePayment: sales.filter(s => s.status === 'cancelled_before_payment').length,
        totalValue: sales.filter(s => s.status === 'confirmed').reduce((sum, s) => sum + Number(s.totalValue), 0),
      },
      clients: {
        activeHolders: clients.filter(c => c.type === 'holder' && c.status === 'ativo').length,
        activeDependents: clients.filter(c => c.type === 'dependent' && c.status === 'ativo').length,
        totalLives: clients.filter(c => c.status === 'ativo').length,
      },
    };
  }
}

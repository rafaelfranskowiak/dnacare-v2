import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './client.entity';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { SubscriptionModule } from '../subscriptions/subscription.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client]), SubscriptionModule, AsaasModule],
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}

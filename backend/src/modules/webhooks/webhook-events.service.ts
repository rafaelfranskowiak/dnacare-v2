import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookEvent } from './webhook-event.entity';

@Injectable()
export class WebhookEventService {
  constructor(
    @InjectRepository(WebhookEvent)
    private readonly repo: Repository<WebhookEvent>,
  ) {}

  async insertIfNotExists(
    tenantId: string,
    asaasEventId: string,
    eventType: string,
    payload: Record<string, any>,
  ): Promise<{ inserted: boolean; event?: WebhookEvent }> {
    try {
      const event = this.repo.create({
        tenantId,
        asaasEventId,
        eventType,
        payload,
        status: 'received',
      });
      const saved = await this.repo.save(event);
      return { inserted: true, event: saved };
    } catch (err: any) {
      if (err?.code === '23505') {
        return { inserted: false };
      }
      throw err;
    }
  }

  async markProcessing(id: string): Promise<void> {
    await this.repo.update(id, { status: 'processing' });
  }

  async markProcessed(id: string): Promise<void> {
    await this.repo.update(id, { status: 'processed', processedAt: new Date() });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repo.update(id, { status: 'failed', errorMessage: error });
  }
}

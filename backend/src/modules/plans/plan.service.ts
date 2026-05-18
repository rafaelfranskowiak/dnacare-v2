import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { PlanVersion } from './plan-version.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(PlanVersion)
    private readonly versionRepo: Repository<PlanVersion>,
  ) {}

  findAll(): Promise<Plan[]> {
    return this.planRepo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Plan | null> {
    return this.planRepo.findOne({ where: { id } });
  }

  async findWithVersions(id: string): Promise<{ plan: Plan; versions: PlanVersion[] }> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const versions = await this.versionRepo.find({
      where: { planId: id },
      order: { version: 'DESC' },
    });
    return { plan, versions };
  }

  async getAvailable(): Promise<any[]> {
    const plans = await this.planRepo.find({
      where: { status: 'publicado', availableForSale: true },
      order: { createdAt: 'DESC' },
    });

    const result: any[] = [];
    for (const plan of plans) {
      const current = await this.versionRepo.findOne({
        where: { planId: plan.id, status: 'publicado' },
        order: { version: 'DESC' },
      });
      if (current) {
        result.push({
          id: plan.id,
          name: plan.name,
          type: plan.type,
          description: plan.description,
          currentVersion: {
            id: current.id,
            version: current.version,
            baseValue: current.baseValue,
            dependentRule: current.dependentRule,
            includedDependents: current.includedDependents,
            maxDependents: current.maxDependents,
            dependentValue: current.dependentValue,
            admissionFee: current.admissionFee,
          },
        });
      }
    }
    return result;
  }

  async create(data: Partial<Plan>): Promise<Plan> {
    const plan = this.planRepo.create(data);
    return this.planRepo.save(plan);
  }

  async update(id: string, data: Partial<Plan>): Promise<Plan> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (plan.status === 'publicado' && (data.name || data.description)) {
      throw new BadRequestException('Planos publicados não podem ser editados diretamente. Crie uma nova versão.');
    }
    Object.assign(plan, data);
    return this.planRepo.save(plan);
  }

  async publish(id: string, config: any): Promise<PlanVersion> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundException('Plano não encontrado');

    const latest = await this.versionRepo.findOne({
      where: { planId: id },
      order: { version: 'DESC' },
    });

    const nextVersion = latest ? latest.version + 1 : 1;
    const versionEntity = new PlanVersion();
    versionEntity.planId = id;
    versionEntity.version = nextVersion;
    versionEntity.name = `${plan.name} v${nextVersion}`;
    versionEntity.baseValue = config.baseValue;
    versionEntity.billingCycle = config.billingCycle;
    versionEntity.dependentRule = config.dependentRule;
    versionEntity.includedDependents = config.includedDependents ?? 0;
    versionEntity.maxDependents = config.maxDependents ?? null;
    versionEntity.minDependents = config.minDependents ?? 0;
    versionEntity.dependentValue = config.dependentValue ?? null;
    versionEntity.tiersConfig = config.tiersConfig ?? null;
    versionEntity.admissionFee = config.admissionFee ?? null;
    versionEntity.status = 'publicado';
    versionEntity.publishedAt = new Date();
    const saved = await this.versionRepo.save(versionEntity);

    await this.planRepo.update(id, {
      status: 'publicado',
      availableForSale: true,
    });

    return saved;
  }

  async createNewVersion(id: string): Promise<PlanVersion> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundException('Plano não encontrado');

    const latest = await this.versionRepo.findOne({
      where: { planId: id },
      order: { version: 'DESC' },
    });

    if (!latest) throw new BadRequestException('Nenhuma versão publicada para duplicar');

    const nextVersion2 = latest.version + 1;
    const draft = new PlanVersion();
    draft.planId = id;
    draft.version = nextVersion2;
    draft.name = `${plan.name} v${nextVersion2}`;
    draft.baseValue = latest.baseValue;
    draft.billingCycle = latest.billingCycle;
    draft.dependentRule = latest.dependentRule;
    draft.includedDependents = latest.includedDependents;
    draft.maxDependents = latest.maxDependents;
    draft.minDependents = latest.minDependents;
    draft.dependentValue = latest.dependentValue;
    draft.tiersConfig = latest.tiersConfig;
    draft.admissionFee = latest.admissionFee;
    draft.status = 'rascunho';
    return this.versionRepo.save(draft);
  }

  async inactivate(id: string): Promise<Plan> {
    const plan = await this.findById(id);
    if (!plan) throw new NotFoundException('Plano não encontrado');

    await this.planRepo.update(id, {
      status: 'inativo',
      availableForSale: false,
    });

    return this.findById(id) as Promise<Plan>;
  }

  async getClientsByPlan(id: string): Promise<any[]> {
    // Placeholder: returns empty — will be populated when US4 creates clients
    return [];
  }
}

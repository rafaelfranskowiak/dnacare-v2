import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ViaCepService {
  private readonly logger = new Logger(ViaCepService.name);

  async fetchAddress(cep: string): Promise<{ address: string; neighborhood: string; city: string; state: string } | null> {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await response.json();
      if (data.erro) return null;

      return {
        address: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      };
    } catch (err) {
      this.logger.warn(`ViaCEP fetch failed for ${cep}: ${err}`);
      return null;
    }
  }
}

export type DependentRule = 'none' | 'fixed' | 'progressive' | 'regressive' | 'tiered';

export interface TierConfig {
  min: number;
  max: number | null;
  value: number;
}

export interface PricingInput {
  baseValue: number;
  dependentRule: DependentRule;
  includedDependents: number;
  dependentValue: number;
  tiers: TierConfig[] | null;
  admissionFee: number;
  discount: number;
  dependentCount: number;
}

export interface PricingOutput {
  baseValue: number;
  dependentsValue: number;
  admissionFee: number;
  subtotal: number;
  discount: number;
  total: number;
  calculationMemory: string;
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const extraDependents = Math.max(0, input.dependentCount - input.includedDependents);
  let dependentsValue = 0;
  const steps: string[] = [];

  steps.push(`Valor base: R$ ${input.baseValue.toFixed(2)}`);
  steps.push(`Dependentes contratados: ${input.dependentCount}`);
  steps.push(`Dependentes inclusos: ${input.includedDependents}`);
  steps.push(`Dependentes extras: ${extraDependents}`);

  if (extraDependents > 0) {
    steps.push(`Regra de cobrança: ${input.dependentRule}`);

    switch (input.dependentRule) {
      case 'fixed':
        dependentsValue = extraDependents * input.dependentValue;
        steps.push(`${extraDependents} x R$ ${input.dependentValue.toFixed(2)} = R$ ${dependentsValue.toFixed(2)}`);
        break;

      case 'progressive': {
        for (let i = 1; i <= extraDependents; i++) {
          const stepValue = input.dependentValue * i;
          dependentsValue += stepValue;
          steps.push(`  ${i}º dependente extra: R$ ${stepValue.toFixed(2)}`);
        }
        break;
      }

      case 'regressive': {
        for (let i = 1; i <= extraDependents; i++) {
          const stepValue = input.dependentValue * (extraDependents - i + 1);
          dependentsValue += stepValue;
          steps.push(`  ${i}º dependente extra: R$ ${stepValue.toFixed(2)}`);
        }
        break;
      }

      case 'tiered': {
        if (input.tiers) {
          const sortedTiers = [...input.tiers].sort((a, b) => a.min - b.min);
          for (let i = 1; i <= extraDependents; i++) {
            const tier = sortedTiers.find(
              (t) => i >= t.min && (t.max === null || i <= t.max),
            );
            const tierValue = tier ? tier.value : input.dependentValue;
            dependentsValue += tierValue;
            steps.push(`  ${i}º dependente extra (faixa): R$ ${tierValue.toFixed(2)}`);
          }
        }
        break;
      }
    }
  }

  if (extraDependents > 0) {
    steps.push(`Valor dependentes: R$ ${dependentsValue.toFixed(2)}`);
  } else {
    steps.push(`Valor dependentes: R$ 0,00 (sem extras)`);
  }

  if (input.admissionFee > 0) {
    steps.push(`Taxa de adesão: R$ ${input.admissionFee.toFixed(2)}`);
  }

  const subtotal = input.baseValue + dependentsValue + input.admissionFee;
  steps.push(`Subtotal: R$ ${subtotal.toFixed(2)}`);

  if (input.discount > 0) {
    steps.push(`Desconto: R$ ${input.discount.toFixed(2)}`);
  }

  const total = subtotal - input.discount;
  steps.push(`Valor final: R$ ${total.toFixed(2)}`);

  return {
    baseValue: input.baseValue,
    dependentsValue,
    admissionFee: input.admissionFee,
    subtotal,
    discount: input.discount,
    total,
    calculationMemory: JSON.stringify(steps),
  };
}

export function normalizeDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

export function validateCpf(cpf: string): boolean {
  const digits = normalizeDocument(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  for (let j = 9; j <= 10; j++) {
    let sum = 0;
    for (let i = 0; i < j; i++) sum += parseInt(digits[i]) * ((j + 1) - i);
    const remainder = (sum * 10) % 11;
    if (remainder === 10) { if (parseInt(digits[j]) !== 0) return false; }
    else if (parseInt(digits[j]) !== remainder) return false;
  }
  return true;
}

export function validateCnpj(cnpj: string): boolean {
  const digits = normalizeDocument(cnpj);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  for (let round = 0; round < 2; round++) {
    let sum = 0;
    const weights = round === 0 ? weights1 : weights2;
    for (let i = 0; i < weights.length; i++) sum += parseInt(digits[i]) * weights[i];
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(digits[weights.length]) !== checkDigit) return false;
  }
  return true;
}

export function isValidDocument(doc: string): boolean {
  const digits = normalizeDocument(doc);
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return false;
}

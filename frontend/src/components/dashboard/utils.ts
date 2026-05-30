export const PAGE_SIZE = 15;

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCurrencyBR(value: string | number | null | undefined) {
  const numericValue = Number(value || 0);
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBR(value: string | Date | null | undefined) {
  if (!value) return '-';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR');
}

export function buildPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | 'ellipsis'> = [];
  let lastPage = 0;

  for (const page of sorted) {
    if (lastPage && page - lastPage > 1) {
      items.push('ellipsis');
    }

    items.push(page);
    lastPage = page;
  }

  return items;
}

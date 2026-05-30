import { buildPageItems } from './utils';

interface DashboardPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function DashboardPagination({
  currentPage,
  totalPages,
  onPageChange,
}: DashboardPaginationProps) {
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-700/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="text-sm font-medium text-slate-400 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Anterior
      </button>

      <div className="flex items-center justify-center gap-2">
        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                item === currentPage
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-slate-100'
              }`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="text-sm font-medium text-slate-200 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próximo
      </button>
    </div>
  );
}

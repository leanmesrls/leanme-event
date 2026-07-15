export const LEONARDO_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const LEONARDO_DEFAULT_PAGE_SIZE = 25;

export type LeonardoPageSize =
  | (typeof LEONARDO_PAGE_SIZE_OPTIONS)[number]
  | "virtual";

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number
): { pageItems: T[]; totalPages: number; currentPage: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    currentPage,
  };
}

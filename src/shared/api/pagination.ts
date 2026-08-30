/* The API's page envelope, mirrored on the client. Every list endpoint returns
   this shape (`src/common/pagination.ts` on the API side): the rows, the total
   across all pages, and which page these rows are. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** The API caps a page at 100 rows; 25 keeps a list readable without paging
 *  constantly. One place so a screen and its tests cannot pick different sizes. */
export const DEFAULT_PAGE_SIZE = 25;

/** How many pages a total spans — at least one, so an empty list still renders
 *  a single (empty) page rather than zero. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Serialises a list query into a stable, sorted query string. Sorted so the
 *  same query always produces the same URL — which is both the RTK Query cache
 *  key and, in tests, the stub route key. Empty and nullish values are dropped
 *  rather than sent as blanks. */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

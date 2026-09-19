import { api } from './api';
import { MAX_PAGE_SIZE, toQueryString, type Page } from './pagination';

/** A branch of the institute. Reference data; the import targeting form needs it
 *  when an institute-wide head teacher (no branch of their own) must choose one. */
export interface Branch {
  id: number;
  nameAr: string;
  isActive: boolean;
}

/** A governorate — the top level of the student-address lookup. */
export interface Governorate {
  id: number;
  nameAr: string;
}

/** A markaz (district) within a governorate. */
export interface Markaz {
  id: number;
  nameAr: string;
  governorateId: number;
}

const referenceApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Reference lists are few and change rarely, so one full page covers them.
    branches: build.query<Page<Branch>, void>({
      query: () => ({ path: `/branches?${toQueryString({ page: 1, pageSize: MAX_PAGE_SIZE })}` }),
    }),
    governorates: build.query<Page<Governorate>, void>({
      query: () => ({ path: `/governorates?${toQueryString({ page: 1, pageSize: MAX_PAGE_SIZE })}` }),
    }),
    /* Scoped to a governorate; the student form skips the read until one is
       chosen, so the markaz list is only ever fetched for the relevant one.
       This asked for 200 and was refused by the API's 100 ceiling on every
       call — a governorate's مراكز never loaded, however many existed. */
    markazes: build.query<Page<Markaz>, number>({
      query: (governorateId) => ({
        path: `/markazes?${toQueryString({ page: 1, pageSize: MAX_PAGE_SIZE, governorateId })}`,
      }),
    }),
  }),
});

export const { useBranchesQuery, useGovernoratesQuery, useMarkazesQuery } = referenceApi;

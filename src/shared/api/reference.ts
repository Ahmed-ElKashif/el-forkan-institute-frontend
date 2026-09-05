import { api } from './api';
import { toQueryString, type Page } from './pagination';

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
    // Branches are few and change rarely, so one generous page covers the list.
    branches: build.query<Page<Branch>, void>({
      query: () => ({ path: `/branches?${toQueryString({ page: 1, pageSize: 100 })}` }),
    }),
    governorates: build.query<Page<Governorate>, void>({
      query: () => ({ path: `/governorates?${toQueryString({ page: 1, pageSize: 100 })}` }),
    }),
    // Scoped to a governorate; the student form skips the read until one is
    // chosen, so the markaz list is only ever fetched for the relevant one.
    markazes: build.query<Page<Markaz>, number>({
      query: (governorateId) => ({
        path: `/markazes?${toQueryString({ page: 1, pageSize: 200, governorateId })}`,
      }),
    }),
  }),
});

export const { useBranchesQuery, useGovernoratesQuery, useMarkazesQuery } = referenceApi;

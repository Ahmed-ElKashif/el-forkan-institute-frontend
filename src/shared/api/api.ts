import { createApi } from '@reduxjs/toolkit/query/react';
import { httpBaseQuery } from './baseQuery';

/* ---------------------------------------------------------------------------
   The RTK Query cache.

   One `createApi` for the whole app; each feature adds its own endpoints with
   `api.injectEndpoints` in its own folder, so this file never grows a
   feature-by-feature list. `tagTypes` are declared here because they are the
   shared vocabulary a mutation in one feature uses to invalidate a query in
   another; the concrete `providesTags`/`invalidatesTags` live with each
   endpoint. F1 is read-only, so nothing invalidates yet — the tags exist for
   the mutations that arrive with the attendance and score grids.
--------------------------------------------------------------------------- */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: httpBaseQuery,
  tagTypes: ['Student', 'Section', 'Dashboard'],
  endpoints: () => ({}),
});

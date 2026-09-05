import { api } from '../../shared/api/api';
import type { ConfirmParams, ConfirmResult, PreviewParams, PromotionRow } from './promotion.model';

/* Both are POSTs (the preview is a real computation, not a GET), so both are
   mutations: the screen triggers the preview on demand and holds its rows, then
   confirms exactly those. */
const promotionApi = api.injectEndpoints({
  endpoints: (build) => ({
    previewPromotion: build.mutation<PromotionRow[], PreviewParams>({
      query: (body) => ({ method: 'POST', path: '/promotion/preview', body }),
    }),
    confirmPromotion: build.mutation<ConfirmResult, ConfirmParams>({
      query: (body) => ({ method: 'POST', path: '/promotion/confirm', body }),
      // A confirm writes enrolments and carries; anything showing student or
      // section rosters is now stale.
      invalidatesTags: ['Student', 'Section'],
    }),
  }),
});

export const { usePreviewPromotionMutation, useConfirmPromotionMutation } = promotionApi;

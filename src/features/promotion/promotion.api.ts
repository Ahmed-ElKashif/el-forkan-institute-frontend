import { api } from '../../shared/api/api';
import type {
  ConfirmParams,
  ConfirmResult,
  OverrideParams,
  PreviewParams,
  PromotionRow,
} from './promotion.model';

/* Both are POSTs (the preview is a real computation, not a GET), so both are
   mutations: the screen triggers the preview on demand and holds its rows, then
   confirms exactly those. */
const promotionApi = api.injectEndpoints({
  endpoints: (build) => ({
    previewPromotion: build.mutation<PromotionRow[], PreviewParams>({
      query: (body) => ({ method: 'POST', path: '/promotion/preview', body }),
    }),
    /* The override is persisted on its own rather than carried in the confirm:
       the reason is audited when it is given, not buried in a commit payload,
       and the confirm keeps replaying the preview unchanged. The screen re-runs
       the preview afterwards to pick the new verdict up. */
    overridePromotion: build.mutation<
      { decision: string; afterMakeup: boolean },
      OverrideParams
    >({
      query: ({ enrollmentId, ...body }) => ({
        method: 'PUT',
        path: `/promotion/overrides/${enrollmentId}`,
        body,
      }),
    }),
    confirmPromotion: build.mutation<ConfirmResult, ConfirmParams>({
      query: (body) => ({ method: 'POST', path: '/promotion/confirm', body }),
      // A confirm writes enrolments and carries; anything showing student or
      // section rosters is now stale.
      invalidatesTags: ['Student', 'Section'],
    }),
  }),
});

export const {
  usePreviewPromotionMutation,
  useOverridePromotionMutation,
  useConfirmPromotionMutation,
} = promotionApi;

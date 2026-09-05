import { api } from '../../shared/api/api';
import type {
  Campaign,
  MessageTemplate,
  QueueReminderInput,
  SendOutcome,
  UpdateTemplateInput,
} from './whatsapp.model';

/* Templates and campaigns. Templates are few (not paginated); campaigns come
   back newest-first, capped at 100 by the API. A template edit re-reads
   templates; queuing or sending re-reads campaigns so the counts refresh. */
const whatsappApi = api.injectEndpoints({
  endpoints: (build) => ({
    messageTemplates: build.query<MessageTemplate[], void>({
      query: () => ({ path: '/message-templates' }),
      providesTags: ['Template'],
    }),
    updateTemplate: build.mutation<MessageTemplate, { id: number; patch: UpdateTemplateInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/message-templates/${id}`, body: patch }),
      invalidatesTags: ['Template'],
    }),

    campaigns: build.query<Campaign[], void>({
      query: () => ({ path: '/campaigns' }),
      providesTags: ['Campaign'],
    }),
    queueReminder: build.mutation<Campaign, QueueReminderInput>({
      query: (body) => ({ method: 'POST', path: '/campaigns/friday-reminder', body }),
      invalidatesTags: ['Campaign'],
    }),
    sendCampaign: build.mutation<SendOutcome, string>({
      query: (id) => ({ method: 'POST', path: `/campaigns/${id}/send` }),
      invalidatesTags: ['Campaign'],
    }),
  }),
});

export const {
  useMessageTemplatesQuery,
  useUpdateTemplateMutation,
  useCampaignsQuery,
  useQueueReminderMutation,
  useSendCampaignMutation,
} = whatsappApi;

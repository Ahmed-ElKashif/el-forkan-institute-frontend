/* Messaging shapes, mirrored from the API (src/messaging/templates.service.ts and
   campaigns.service.ts). A template is the message body sent to students; a
   campaign is one section's queued send for a target date, dispatched — and
   retried — through WhatsApp. Queue and send are separate steps: the rows exist
   with their rendered bodies before anything leaves the building. */

export interface MessageTemplate {
  id: number;
  /** How the app finds a template (friday_schedule, absence_warning); not editable. */
  code: string;
  channel: string;
  language: string;
  body: string;
  /** The Meta-approved template name the WhatsApp API takes for out-of-window sends. */
  providerTemplateName: string | null;
  variables: unknown;
  isActive: boolean;
}

/** `code`, `channel` and `variables` are identity/config the API does not accept
 *  on update. */
export interface UpdateTemplateInput {
  body?: string;
  providerTemplateName?: string | null;
  language?: string;
  isActive?: boolean;
}

export interface CampaignCounts {
  queued: number;
  sent: number;
  failed: number;
  delivered: number;
}

export interface Campaign {
  id: string;
  templateCode: string;
  sectionId: string | null;
  sectionName: string | null;
  targetDate: string | null;
  status: string;
  sentAt: string | null;
  counts: CampaignCounts;
}

/** The result of dispatching a campaign — a send retries only queued/failed rows. */
export interface SendOutcome {
  campaignId: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface QueueReminderInput {
  sectionId: string;
  targetDate: string;
}

/** Messages still waiting to go out: a send dispatches queued rows and retries
 *  failed ones, so this is what the "send" action will attempt. */
export function pendingCount(counts: CampaignCounts): number {
  return counts.queued + counts.failed;
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  IconButton,
  Tabs,
  Toast,
  formatNumber,
  type BadgeProps,
  type Column,
  type TabItem,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useCampaignsQuery, useMessageTemplatesQuery, useSendCampaignMutation } from './whatsapp.api';
import { TemplateDialog } from './TemplateDialog';
import { ReminderDialog } from './ReminderDialog';
import { pendingCount, type Campaign, type MessageTemplate } from './whatsapp.model';

type TabKey = 'campaigns' | 'templates';
type ToastState = { tone: 'success' | 'danger'; message: string };

const STATUS_TONE: Record<string, BadgeProps['tone']> = {
  queued: 'neutral',
  sending: 'info',
  completed: 'success',
  failed: 'danger',
};

/** The WhatsApp console (head-teacher only, gated): the message templates, and
 *  the campaigns that send them. One tabbed screen; each tab owns its list and
 *  dialogs, the page owns the toast. */
export function WhatsAppPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('campaigns');
  const [toast, setToast] = useState<ToastState | null>(null);

  const tabs: TabItem[] = [
    { key: 'campaigns', label: t('whatsapp.tabs.campaigns') },
    { key: 'templates', label: t('whatsapp.tabs.templates') },
  ];

  return (
    <section className="space-y-4">
      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />
      {tab === 'campaigns' ? <CampaignsTab onToast={setToast} /> : <TemplatesTab onToast={setToast} />}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function CampaignsTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const query = useCampaignsQuery();
  const [send] = useSendCampaignMutation();
  const [confirm, setConfirm] = useState<Campaign | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  async function confirmSend() {
    if (!confirm) return;
    try {
      const outcome = await send(confirm.id).unwrap();
      onToast({ tone: 'success', message: t('whatsapp.campaigns.sent', { sent: formatNumber(outcome.sent), failed: formatNumber(outcome.failed) }) });
    } catch (cause) {
      // The only 409 the send raises is "WhatsApp is not configured yet" (Meta
      // approval has a lead time); everything else is a generic failure.
      const status = (cause as { status?: number | string }).status;
      onToast({ tone: 'danger', message: status === 409 ? t('whatsapp.campaigns.notConfigured') : t('whatsapp.saveError') });
    } finally {
      setConfirm(null);
    }
  }

  const columns: Column<Campaign>[] = [
    { key: 'section', header: t('whatsapp.campaigns.section'), render: (c) => c.sectionName ?? <span className="text-ink-400">—</span> },
    { key: 'template', header: t('whatsapp.campaigns.template'), render: (c) => <span className="ef-num">{c.templateCode}</span> },
    { key: 'date', header: t('whatsapp.campaigns.date'), render: (c) => c.targetDate ? <span className="ef-num" dir="ltr">{c.targetDate}</span> : <span className="text-ink-400">—</span> },
    { key: 'status', header: t('whatsapp.campaigns.status'), render: (c) => <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{t(`whatsapp.statuses.${c.status}`, c.status)}</Badge> },
    { key: 'counts', header: t('whatsapp.campaigns.counts'), render: (c) => <span className="ef-num text-xs text-ink-600">{t('whatsapp.campaigns.countsSummary', { queued: formatNumber(c.counts.queued), sent: formatNumber(c.counts.sent), failed: formatNumber(c.counts.failed) })}</span> },
    {
      key: 'send',
      header: '',
      align: 'end',
      render: (c) => (
        <Button size="sm" variant="secondary" disabled={pendingCount(c.counts) === 0} onClick={() => setConfirm(c)}>
          {t('whatsapp.campaigns.send')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex">
        <Button className="ms-auto" icon="message-circle" onClick={() => setReminderOpen(true)}>{t('whatsapp.reminder.new')}</Button>
      </div>
      {query.isLoading && !query.data ? (
        <ListSkeleton />
      ) : query.isError || !query.data ? (
        <Alert tone="danger" title={t('whatsapp.error')} />
      ) : query.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500">{t('whatsapp.campaigns.empty')}</p>
      ) : (
        <DataTable columns={columns} rows={query.data} getRowKey={(c) => c.id} />
      )}

      {confirm ? (
        <ConfirmDialog
          title={t('whatsapp.campaigns.sendTitle')}
          consequence={t('whatsapp.campaigns.sendConsequence', { count: formatNumber(pendingCount(confirm.counts)) })}
          confirmLabel={t('whatsapp.campaigns.confirmSend')}
          cancelLabel={t('whatsapp.cancel')}
          tone="warning"
          onConfirm={confirmSend}
          onCancel={() => setConfirm(null)}
        />
      ) : null}

      {reminderOpen ? (
        <ReminderDialog onClose={() => setReminderOpen(false)} onQueued={(message) => { setReminderOpen(false); onToast({ tone: 'success', message }); }} />
      ) : null}
    </div>
  );
}

function TemplatesTab({ onToast }: { onToast: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const query = useMessageTemplatesQuery();
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  const columns: Column<MessageTemplate>[] = [
    { key: 'code', header: t('whatsapp.templates.code'), render: (tmpl) => <span className="ef-num">{tmpl.code}</span> },
    { key: 'channel', header: t('whatsapp.templates.channel'), render: (tmpl) => <span className="ef-num">{tmpl.channel}</span> },
    { key: 'language', header: t('whatsapp.templates.language'), render: (tmpl) => <span className="ef-num">{tmpl.language}</span> },
    { key: 'status', header: t('whatsapp.templates.statusColumn'), render: (tmpl) => <Badge tone={tmpl.isActive ? 'success' : 'neutral'}>{t(tmpl.isActive ? 'whatsapp.templates.active' : 'whatsapp.templates.inactive')}</Badge> },
    { key: 'edit', header: '', align: 'end', render: (tmpl) => <IconButton icon="pencil" label={t('whatsapp.edit')} size="sm" onClick={() => setEditing(tmpl)} /> },
  ];

  if (query.isLoading && !query.data) return <ListSkeleton />;
  if (query.isError || !query.data) return <Alert tone="danger" title={t('whatsapp.error')} />;

  return (
    <>
      <DataTable columns={columns} rows={query.data} getRowKey={(tmpl) => tmpl.id} />
      {editing ? (
        <TemplateDialog template={editing} onClose={() => setEditing(null)} onSaved={(message) => { setEditing(null); onToast({ tone: 'success', message }); }} />
      ) : null}
    </>
  );
}

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { WhatsAppPage } from './WhatsAppPage';
import type { Campaign, MessageTemplate } from './whatsapp.model';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the console's two writes: a template body is edited, and a campaign is
   sent — showing the send outcome. Real store and DataTable against a stub. */

const TEMPLATE: MessageTemplate = { id: 1, code: 'friday_schedule', channel: 'whatsapp', language: 'ar', body: 'مرحبا يا طالب', providerTemplateName: null, variables: null, isActive: true };
const CAMPAIGN: Campaign = { id: 'camp1', templateCode: 'friday_schedule', sectionId: 'sec1', sectionName: 'المستوى الأول - بنين', targetDate: '2026-09-04', status: 'queued', sentAt: null, counts: { queued: 3, sent: 0, failed: 0, delivered: 0 } };

function renderConsole(routes: StubRoutes) {
  const http = stubHttpClient({
    'GET /campaigns': [CAMPAIGN],
    'GET /message-templates': [TEMPLATE],
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <WhatsAppPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('WhatsAppPage', () => {
  it('edits a template body', async () => {
    const http = renderConsole({ 'PATCH /message-templates/1': { ...TEMPLATE, body: 'رسالة محدثة' } });
    await userEvent.click(screen.getByRole('tab', { name: 'القوالب' }));
    await screen.findByText('friday_schedule');

    await userEvent.click(screen.getByRole('button', { name: 'تعديل' }));
    const bodyField = screen.getByRole('textbox', { name: 'نص الرسالة' });
    await userEvent.clear(bodyField);
    await userEvent.type(bodyField, 'رسالة محدثة');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PATCH /message-templates/1')).toBe(1));
    const patch = http.calls.find((c) => c.method === 'PATCH' && c.path === '/message-templates/1');
    expect((patch?.body as { body?: string } | undefined)?.body).toBe('رسالة محدثة');
  });

  it('sends a campaign and shows the outcome', async () => {
    const http = renderConsole({ 'POST /campaigns/camp1/send': { campaignId: 'camp1', attempted: 3, sent: 3, failed: 0, skipped: 0 } });
    await screen.findByText('المستوى الأول - بنين'); // campaigns is the default tab

    await userEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد الإرسال' }));

    await waitFor(() => expect(http.countOf('POST /campaigns/camp1/send')).toBe(1));
    await screen.findByText(/تم الإرسال/); // outcome toast
  });
});

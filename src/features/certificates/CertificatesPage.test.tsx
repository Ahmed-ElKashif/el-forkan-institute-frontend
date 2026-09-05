// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CertificatesPage } from './CertificatesPage';
import type { Certificate, CertifiableStudent } from './certificate.model';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the F5 exit criteria: issuing posts the student/level/enrolment,
   revoking demands a reason before it posts, and printing goes through a
   recorded reprint. Real store and DataTable against a stub. */

const CERTIFIABLE: CertifiableStudent[] = [
  { studentId: 's1', studentName: 'أحمد سالم', enrollmentId: 'e1', levelId: 4, levelCode: 'L4', decision: 'promote' },
];
const CERT: Certificate = {
  id: 'c1',
  studentId: 's9',
  studentName: 'محمود إبراهيم',
  levelId: 4,
  levelCode: 'L4',
  serialNo: 'L4-1447-0001',
  issuedAt: '2026-08-01T00:00:00Z',
  revokedAt: null,
  revokeReason: null,
};

function renderPage(routes: StubRoutes) {
  const http = stubHttpClient({
    'GET /certificates/certifiable': CERTIFIABLE,
    'GET /certificates': [CERT],
    ...routes,
  });
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

const lastButton = (name: string) => {
  const buttons = screen.getAllByRole('button', { name });
  return buttons[buttons.length - 1];
};

afterEach(cleanup);

describe('CertificatesPage', () => {
  it('issues a certificate for a certifiable student', async () => {
    const http = renderPage({ 'POST /certificates': { ...CERT, id: 'c2', serialNo: 'L4-1447-0002' } });
    await screen.findByText('أحمد سالم');

    await userEvent.click(screen.getByRole('button', { name: 'إصدار' }));
    await userEvent.click(lastButton('إصدار')); // confirm in the dialog

    await waitFor(() => expect(http.countOf('POST /certificates')).toBe(1));
    const issue = http.calls.find((c) => c.method === 'POST' && c.path === '/certificates');
    expect(issue?.body).toEqual({ studentId: 's1', levelId: 4, enrollmentId: 'e1' });
  });

  it('requires a reason before it revokes, then posts it', async () => {
    const http = renderPage({ 'POST /certificates/c1/revoke': { ...CERT, revokedAt: '2026-08-02T00:00:00Z' } });
    await userEvent.click(screen.getByRole('tab', { name: /الشهادات الصادرة/ }));
    await screen.findByText('محمود إبراهيم');

    await userEvent.click(screen.getByRole('button', { name: 'إبطال' })); // row action
    // Confirm is disabled until a reason of at least three characters is typed.
    expect((lastButton('إبطال') as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByRole('textbox'), 'خطأ في بيانات الطالب');
    await userEvent.click(lastButton('إبطال'));

    await waitFor(() => expect(http.countOf('POST /certificates/c1/revoke')).toBe(1));
    const revoke = http.calls.find((c) => c.method === 'POST' && c.path === '/certificates/c1/revoke');
    const body = revoke?.body as { reason?: string } | undefined;
    expect(body?.reason).toBe('خطأ في بيانات الطالب');
  });

  it('prints through a recorded reprint', async () => {
    const http = renderPage({
      'POST /certificates/c1/reprint': { certificateId: 'c1', serialNo: 'L4-1447-0001', copyNumber: 2 },
    });
    await userEvent.click(screen.getByRole('tab', { name: /الشهادات الصادرة/ }));
    await screen.findByText('محمود إبراهيم');

    await userEvent.click(screen.getByRole('button', { name: 'طباعة' }));

    await waitFor(() => expect(http.countOf('POST /certificates/c1/reprint')).toBe(1));
  });
});

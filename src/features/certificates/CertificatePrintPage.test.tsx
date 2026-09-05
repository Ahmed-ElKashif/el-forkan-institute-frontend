// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CertificatePrintPage } from './CertificatePrintPage';
import type { CertificatePrintPayload } from './certificate.model';
import '../../shared/i18n';

/* Proves the print sheet renders the certificate's serial from the payload it is
   handed through navigation state — no store or network, the page writes
   nothing itself. */

const PAYLOAD: CertificatePrintPayload = {
  certificateId: 'c1',
  serialNo: 'L4-1447-0001',
  studentName: 'أحمد سالم',
  studentCode: '2026-0001',
  levelCode: 'L4',
  levelNameAr: 'المستوى الرابع',
  instituteNameAr: 'معهد الفرقان',
  branchNameAr: null,
  hijriYear: 1447,
  issuedAt: '2026-08-01T00:00:00Z',
  issuedByName: 'محمود عبد الله',
  copyNumber: 1,
  notes: null,
};

afterEach(cleanup);

describe('CertificatePrintPage', () => {
  it('renders the sheet with the serial from navigation state', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/certificates/c1/print', state: PAYLOAD }]}>
        <Routes>
          <Route path="/certificates/:id/print" element={<CertificatePrintPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('أحمد سالم')).toBeDefined();
    // The serial appears on both the seal and the footer line.
    expect(screen.getAllByText(/L4-1447-0001/).length).toBeGreaterThan(0);
  });

  it('falls back when opened without a payload', () => {
    render(
      <MemoryRouter initialEntries={['/certificates/c1/print']}>
        <Routes>
          <Route path="/certificates/:id/print" element={<CertificatePrintPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('لا توجد بيانات للطباعة')).toBeDefined();
  });
});

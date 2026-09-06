// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { SettingsPage } from './SettingsPage';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Absence policies drive the eligibility screen, so this proves they render and
   that an edit PUTs the whole desired state (the upsert is keyed by year+level).
   Real store + RTK Query + DataTable against a stubbed transport. */

const DEFAULT_POLICY = {
  id: 1,
  academicYearId: 1,
  levelId: null,
  maxAbsences: 4,
  warnAtAbsences: 3,
  autoWarnEnabled: true,
  exceedingAction: 'block_exam',
};
const L1_POLICY = { ...DEFAULT_POLICY, id: 2, levelId: 1, maxAbsences: 6, warnAtAbsences: 4, exceedingAction: 'warn_only' };

const LEVELS = [
  { id: 1, code: 'L1', nameAr: 'المستوى الأول', sortOrder: 2, isOptional: false, isTerminal: false, allowsCarry: true, grantsCertificate: true, requiresCleanEntry: false },
];

const BASE: StubRoutes = {
  'GET /academic-years?page=1&pageSize=1': { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
  'GET /levels': LEVELS,
  'GET /academic-years/1/attendance-policies': [DEFAULT_POLICY, L1_POLICY],
};

function renderSettings(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  render(
    <Provider store={makeStore(http)}>
      <SettingsPage />
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('SettingsPage — attendance policies', () => {
  it('lists the year default and per-level policies', async () => {
    renderSettings();

    expect(await screen.findByText('الافتراضي (كل المستويات)')).toBeDefined();
    expect(screen.getByText('المستوى الأول')).toBeDefined();
    // The default here blocks the exam past the limit — the eligibility hook.
    expect(screen.getByText('يمنع من الامتحان')).toBeDefined();
  });

  it('edits a policy and PUTs the new maximum', async () => {
    const http = renderSettings({ 'PUT /academic-years/1/attendance-policies': { ...DEFAULT_POLICY, maxAbsences: 8 } });
    const user = userEvent.setup();
    await screen.findByText('الافتراضي (كل المستويات)');

    // The default policy is the first row; open its 3-dots menu, then edit.
    await user.click(screen.getAllByRole('button', { name: 'إجراءات' })[0]);
    await user.click(screen.getByRole('menuitem', { name: 'تعديل' }));
    const maxInput = await screen.findByLabelText('الحد الأقصى للغياب');
    await user.clear(maxInput);
    await user.type(maxInput, '8');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(http.countOf('PUT /academic-years/1/attendance-policies')).toBe(1));
    const put = http.calls.find((c) => c.method === 'PUT');
    expect((put?.body as { maxAbsences?: number } | undefined)?.maxAbsences).toBe(8);
  });
});

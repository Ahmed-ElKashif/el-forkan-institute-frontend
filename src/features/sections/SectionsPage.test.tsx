// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { SectionsPage } from './SectionsPage';
import type { Section } from './section.model';
import { makeStore } from '../../shared/api/store';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Proves the picker: the current year's sections render with real Arabic names,
   and each row links to that section's attendance grid. Runs the real store, the
   real RTK Query cache and the real DataTable against a stubbed transport. */

const BANIN: Section = {
  id: 's1',
  name: 'المستوى الأول - بنين',
  gender: 'male',
  levelId: 1,
  defaultMode: 'onsite',
  enrolledCount: 24,
  capacity: 30,
  teachers: [{ userId: 'u1', fullName: 'أحمد سالم', isPrimary: true }],
};

const BANAT: Section = {
  id: 's2',
  name: 'المستوى الثاني - بنات',
  gender: 'female',
  levelId: 2,
  defaultMode: 'onsite',
  enrolledCount: 18,
  capacity: null,
  teachers: [],
};

function pageOf(items: Section[]): Page<Section> {
  return { items, total: items.length, page: 1, pageSize: DEFAULT_PAGE_SIZE };
}

const yearKey = `GET /academic-years?${toQueryString({ page: 1, pageSize: 1 })}`;
/* Build the sections route key the same way the component builds the path, so
   the academic-year scoping lines up exactly rather than being hand-written. */
const listKey = (academicYearId: number) =>
  `GET /sections?${toQueryString({ academicYearId, page: 1, pageSize: DEFAULT_PAGE_SIZE })}`;

function renderSections(routes: StubRoutes) {
  const http = stubHttpClient(routes);
  render(
    <Provider store={makeStore(http)}>
      <MemoryRouter>
        <SectionsPage basePath="/attendance" captionKey="sections.pickForAttendance" />
      </MemoryRouter>
    </Provider>,
  );
  return http;
}

afterEach(cleanup);

describe('SectionsPage', () => {
  it('lists the current year sections and links each to its attendance grid', async () => {
    renderSections({
      [yearKey]: { items: [{ id: 1, hijriYear: 1447 }], total: 1, page: 1, pageSize: 1 },
      [listKey(1)]: pageOf([BANIN, BANAT]),
    });

    const link = await screen.findByRole('link', { name: /المستوى الأول - بنين/ });
    expect(link.getAttribute('href')).toBe('/attendance/s1');
    expect(screen.getByText('المستوى الثاني - بنات')).toBeDefined();
    // The primary teacher's name is shown in its row.
    expect(screen.getByText('أحمد سالم')).toBeDefined();
  });

  it('shows an honest empty state when no academic year exists', async () => {
    renderSections({
      [yearKey]: { items: [], total: 0, page: 1, pageSize: 1 },
    });

    expect(await screen.findByText('لا يوجد عام دراسي بعد')).toBeDefined();
  });
});

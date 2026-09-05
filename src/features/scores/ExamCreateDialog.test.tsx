// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ExamCreateDialog } from './ExamCreateDialog';
import { makeStore } from '../../shared/api/store';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';
import '../../shared/i18n';

/* Exam creation binds a section's context to a curriculum row. This proves the
   examinable subjects load into the picker and that saving POSTs the exam with
   the chosen curriculum id and the section's branch/term. */

const TREE = [
  { id: 5, subjectNameAr: 'النحو', isExaminable: true, children: [] },
  { id: 6, subjectNameAr: 'الفقه', isExaminable: true, children: [] },
];

const BASE: StubRoutes = {
  'GET /academic-years/1/curriculum?levelId=1&termNumber=1': TREE,
};

function renderDialog(routes: StubRoutes = {}) {
  const http = stubHttpClient({ ...BASE, ...routes });
  const onSaved = vi.fn();
  render(
    <Provider store={makeStore(http)}>
      <ExamCreateDialog
        branchId={1}
        levelId={1}
        academicYearId={1}
        sectionGender="male"
        termId={10}
        termNumber={1}
        onClose={() => {}}
        onSaved={onSaved}
      />
    </Provider>,
  );
  return { http, onSaved };
}

afterEach(cleanup);

describe('ExamCreateDialog', () => {
  it('creates an exam against the chosen curriculum row for the section', async () => {
    const { http, onSaved } = renderDialog({ 'POST /exams': { id: 'x', subjectNameAr: 'النحو', examType: 'term_1', gender: 'male', isLocked: false, maxScore: 100, passScore: 50 } });
    const user = userEvent.setup();

    // The examinable subjects load into the first select.
    expect(await screen.findByText('النحو')).toBeDefined();
    await user.selectOptions(screen.getAllByRole('combobox')[0], '6');
    await user.click(screen.getByRole('button', { name: 'حفظ الامتحان' }));

    await waitFor(() => expect(http.countOf('POST /exams')).toBe(1));
    const post = http.calls.find((c) => c.method === 'POST' && c.path === '/exams');
    expect(post?.body).toMatchObject({ curriculumId: 6, branchId: 1, termId: 10, examType: 'term_1', gender: 'male' });
    expect(onSaved).toHaveBeenCalled();
  });
});

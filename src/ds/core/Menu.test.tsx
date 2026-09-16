// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from '../data/DataTable';
import { Menu } from './Menu';

/* The kebab is exercised by many page tests; the right-click context menu is
   not, so it is proved here: a right-click on a row opens the same actions, and
   choosing one fires its handler. */

interface Row {
  id: string;
  name: string;
}
const COLUMNS: Column<Row>[] = [{ key: 'name', header: 'الاسم', render: (r) => r.name }];
const ROWS: Row[] = [{ id: '1', name: 'أحمد' }];

afterEach(cleanup);

describe('DataTable row context menu', () => {
  it('opens the row actions on right-click and runs the chosen one', async () => {
    const onEdit = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(r) => r.id}
        rowActions={(r) => [{ key: 'edit', label: 'تعديل', icon: 'pencil', onSelect: () => onEdit(r.id) }]}
      />,
    );

    fireEvent.contextMenu(screen.getByText('أحمد'));
    await userEvent.click(screen.getByRole('menuitem', { name: 'تعديل' }));

    expect(onEdit).toHaveBeenCalledWith('1');
  });
});

describe('Menu (custom trigger)', () => {
  it('opens from its trigger and runs the chosen item', async () => {
    const onProfile = vi.fn();
    render(
      <Menu
        items={[{ key: 'profile', label: 'الملف الشخصي', onSelect: onProfile }]}
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle}>
            الحساب
          </button>
        )}
      />,
    );

    // Closed until the trigger is pressed.
    expect(screen.queryByRole('menuitem', { name: 'الملف الشخصي' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'الحساب' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'الملف الشخصي' }));

    expect(onProfile).toHaveBeenCalledTimes(1);
  });
});

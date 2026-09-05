// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PagedList } from './PagedList';
import type { Page } from '../api/pagination';
import type { Column } from '../../ds';

/* The shared list shell four features render through. Its own contract — rows
   when present, the caller's empty node when not — is asserted here so a
   regression is caught in one place rather than four. */

interface Row {
  id: string;
  name: string;
}
const columns: Column<Row>[] = [{ key: 'name', header: 'Name', render: (r) => r.name }];
const base = { isLoading: false, isError: false, isFetching: false, columns, getRowKey: (r: Row) => r.id, errorTitle: 'err', page: 1, onPage: () => {} };

function pageOf(items: Row[]): Page<Row> {
  return { items, total: items.length, page: 1, pageSize: 25 };
}

afterEach(cleanup);

describe('PagedList', () => {
  it('renders the rows when the page has items', () => {
    render(<PagedList {...base} data={pageOf([{ id: 'a', name: 'أحمد' }])} empty={<div>لا شيء</div>} />);
    expect(screen.getByText('أحمد')).toBeDefined();
    expect(screen.queryByText('لا شيء')).toBeNull();
  });

  it('renders the caller-provided empty node when the page is empty', () => {
    render(<PagedList {...base} data={pageOf([])} empty={<div>لا شيء</div>} />);
    expect(screen.getByText('لا شيء')).toBeDefined();
  });
});

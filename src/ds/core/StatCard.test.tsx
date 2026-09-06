// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatCard } from './StatCard';

/* Page tests cover clicking an interactive tile; this proves the parts they
   don't: it exposes a button role with aria-pressed, and it activates from the
   keyboard (Enter/Space) — the affordance a mouse test would miss. */

afterEach(cleanup);

describe('StatCard interactive', () => {
  it('is a pressed-state button that activates from the keyboard', async () => {
    const onClick = vi.fn();
    render(<StatCard label="مؤهل" value="12" interactive active onClick={onClick} />);

    const tile = screen.getByRole('button', { name: /مؤهل/ });
    expect(tile.getAttribute('aria-pressed')).toBe('true');

    tile.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is inert (no button role) when not interactive', () => {
    render(<StatCard label="الإجمالي" value="30" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

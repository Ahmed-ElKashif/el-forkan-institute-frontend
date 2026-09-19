// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './DatePicker';

afterEach(cleanup);

/** The calendar's day buttons, found by the Hijri day they print. The library
 *  renders Arabic-Indic numerals (`numerals: 'arab'`), which is the product's
 *  convention for Hijri — the same digits the page header uses. */
/** The month the calendar is currently showing. */
function caption(): string {
  return screen.getByRole('dialog').textContent ?? '';
}

function day(label: string): HTMLElement {
  const match = screen
    .getAllByRole('button')
    .find((button) => button.textContent?.trim() === label);
  if (!match) throw new Error(`No day button labelled ${label}`);
  return match;
}

describe('DatePicker', () => {
  it('shows the selected Gregorian value as a Hijri date', () => {
    render(<DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />);

    const trigger = screen.getByLabelText('التاريخ');
    expect(trigger.textContent).toContain('ربيع الأول');
    expect(trigger.textContent).toContain('١٤٤٨');
  });

  it('shows the placeholder when no day is chosen', () => {
    render(
      <DatePicker value="" onChange={() => {}} placeholder="اختر يومًا" aria-label="التاريخ" />,
    );

    expect(screen.getByLabelText('التاريخ').textContent).toContain('اختر يومًا');
  });

  /* The whole point of the control: the head teacher reads and picks Hijri, and
     the API keeps receiving the Gregorian YYYY-MM-DD that DateOnlySchema
     validates. 2026-09-05 is 23 Rabi' al-Awwal 1448. */
  it('reports a picked day as a Gregorian YYYY-MM-DD', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={onChange} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));
    await user.click(day('٢٤'));

    expect(onChange).toHaveBeenCalledWith('2026-09-06');
  });

  /* A value parsed as UTC renders the previous day west of Greenwich, and a
     picked day serialised through toISOString() drifts the other way. Clicking
     the day already selected must return the exact string that went in. */
  it('round-trips a value without shifting the day', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={onChange} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));
    await user.click(day('٢٣'));

    expect(onChange).toHaveBeenCalledWith('2026-09-05');
  });

  /* The month was passed to DayPicker as a controlled prop with no
     `onMonthChange` beside it, which pinned the calendar on one month and made
     both arrows dead. Nothing caught it because every other test only ever
     clicks a day in the month it opens on. */
  it('moves to the previous month when the back arrow is pressed', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));
    expect(caption()).toContain('ربيع الأول');

    await user.click(screen.getByRole('button', { name: /السابق/ }));

    expect(caption()).toContain('صفر');
  });

  it('moves to the next month when the forward arrow is pressed', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));

    await user.click(screen.getByRole('button', { name: /التالي/ }));

    expect(caption()).toContain('ربيع الآخر');
  });

  /* Having paged away, the calendar must open on the selected day again rather
     than wherever it was left — otherwise the next open lands on an unrelated
     month. */
  it('reopens on the selected day after paging away', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));
    await user.click(screen.getByRole('button', { name: /السابق/ }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText('التاريخ'));

    expect(caption()).toContain('ربيع الأول');
  });

  /* The fields live inside Dialog, whose body scrolls. An absolutely positioned
     popover was clipped by it and pushed scrollbars onto the dialog, so the
     calendar renders in a portal on document.body instead. */
  it('renders the calendar outside the field, so a scrolling parent cannot clip it', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />,
    );

    await user.click(screen.getByLabelText('التاريخ'));

    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('closes the calendar on Escape', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-05" onChange={() => {}} aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));
    expect(screen.queryByRole('dialog')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<DatePicker value="" onChange={() => {}} disabled aria-label="التاريخ" />);

    await user.click(screen.getByLabelText('التاريخ'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

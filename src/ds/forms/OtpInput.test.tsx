// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { OtpInput } from './OtpInput';

/* Controlled just like the real call sites: the parent holds the whole code and
   each box renders one character. The <output> mirrors that value so a test can
   assert what onChange produced without reaching into component internals. */
function Harness() {
  const [value, setValue] = useState('');
  return (
    <>
      <OtpInput value={value} onChange={setValue} ariaLabel="code" />
      <output>{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

afterEach(cleanup);

describe('OtpInput', () => {
  it('renders one box per digit of the code length', () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
  });

  it('distributes a pasted code across the boxes', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(boxes()[0]);
    await user.paste('123456');

    expect(screen.getByText('123456')).toBeDefined();
    expect(boxes().map((b) => b.value)).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('accepts digits and advances, ignoring non-digits', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(boxes()[0], '7');
    await user.type(boxes()[1], 'a'); // ignored
    await user.type(boxes()[1], '8');

    expect(screen.getByText('78')).toBeDefined();
  });

  it('clears the last digit on backspace', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(boxes()[0]);
    await user.paste('12');

    await user.keyboard('{Backspace}'); // focus is on box 2 (empty) → clears box 1

    expect(screen.getByText('1')).toBeDefined();
  });
});

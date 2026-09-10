import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { cn } from '../cn';

/** One entry in a row's action menu. `onSelect` runs after the menu closes. */
export interface ActionItem {
  key: string;
  label: string;
  icon?: IconName;
  /** `danger` paints the item red — for destructive actions. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onSelect: () => void;
}

/** The shared surface both the kebab dropdown and the right-click menu render. */
function MenuList({ items, onClose }: { items: ActionItem[]; onClose: () => void }) {
  return (
    <ul
      role="menu"
      className="ef-menu m-0 min-w-44 list-none rounded-lg border border-default bg-surface p-1 shadow-modal origin-top motion-safe:animate-[ef-dialog-in_var(--dur-fast)_var(--ease-standard)]"
    >
      {items.map((item) => (
        <li key={item.key} role="none">
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2 text-start text-sm',
              'transition-colors duration-[var(--dur-fast)] disabled:cursor-not-allowed disabled:text-ink-400',
              item.tone === 'danger'
                ? 'text-danger hover:bg-danger-bg'
                : 'text-ink-700 hover:bg-canvas',
            )}
          >
            {item.icon ? <Icon name={item.icon} size={16} /> : null}
            <span className="flex-1">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Registers close-on-outside-click and close-on-Escape while a menu is open. */
function useDismiss(active: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, onClose, ref]);
}

/** The standard 3-dots row menu: a kebab button that toggles its action list. */
export function ActionMenu({ items, label = 'إجراءات' }: { items: ActionItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  if (items.length === 0) return null;
  return (
    <div ref={ref} className="relative inline-block">
      <IconButton
        icon="ellipsis-vertical"
        label={label}
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div className="absolute end-0 z-40 mt-1">
          <MenuList items={items} onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

/** The same action list opened at a point — the row's right-click menu. */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ActionItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(true, onClose, ref);
  useEffect(() => {
    function onScroll() {
      onClose();
    }
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-50" style={{ top: y, left: x }}>
      <MenuList items={items} onClose={onClose} />
    </div>
  );
}

/** Gives a non-table row (a card, a list item) the same right-click menu the
 *  DataTable rows have. Spread `onContextMenu` on the row element and render
 *  `menu`; `stopPropagation` keeps a nested row's menu from opening its parent's
 *  too. Returns no menu when there are no actions. */
export function useRowContextMenu(items: ActionItem[]): {
  onContextMenu: (event: ReactMouseEvent) => void;
  menu: ReactNode;
} {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const close = useCallback(() => setPos(null), []);
  const onContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (items.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      setPos({ x: event.clientX, y: event.clientY });
    },
    [items.length],
  );
  const menu = pos ? <ContextMenu x={pos.x} y={pos.y} items={items} onClose={close} /> : null;
  return { onContextMenu, menu };
}

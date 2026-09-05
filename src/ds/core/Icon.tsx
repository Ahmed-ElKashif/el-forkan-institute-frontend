import type { SVGProps } from 'react';
import {
  ArrowDown, ArrowUp, Award, BookOpen, CalendarDays, ChartColumn, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleDot,
  CircleX, ClipboardCheck, ClipboardList, Download, Eye, FileSpreadsheet, FileText,
  GraduationCap, History, Inbox, Info, LoaderCircle, Lock, LockOpen, LogIn,
  LogOut, Menu, MessageCircle, Minus, OctagonAlert, Pencil, Plus, Printer,
  RotateCcw, Rows3, Rows4, ScrollText, Search, Settings, ShieldAlert, Trash2,
  TriangleAlert, Upload, User, Users, X,
} from 'lucide-react';
import { cn } from '../cn';

/* ---------------------------------------------------------------------------
   Lucide, imported as real modules rather than fetched from a CDN.

   The handoff bundle's Icon pulled every glyph from unpkg.com at runtime as a
   CSS mask URL. That breaks the app's CSP (`default-src 'self'`) and puts a
   third-party host in the render path of every icon, so it is replaced here.
   The public API (`name`, `size`, `mirror`) is unchanged, so no call site had
   to change — exactly as the design system's readme anticipated.

   The registry is explicit on purpose: it keeps the bundle to the glyphs this
   product actually uses, and `IconName` gives a typo a compile error instead
   of a silently blank square.
--------------------------------------------------------------------------- */

const REGISTRY = {
  'arrow-down': ArrowDown,
  'arrow-up': ArrowUp,
  award: Award,
  'book-open': BookOpen,
  'calendar-days': CalendarDays,
  'chart-column': ChartColumn,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  'circle-dot': CircleDot,
  'circle-x': CircleX,
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  download: Download,
  eye: Eye,
  'file-spreadsheet': FileSpreadsheet,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  history: History,
  inbox: Inbox,
  info: Info,
  'loader-circle': LoaderCircle,
  lock: Lock,
  'lock-open': LockOpen,
  'log-in': LogIn,
  'log-out': LogOut,
  menu: Menu,
  'message-circle': MessageCircle,
  minus: Minus,
  'octagon-alert': OctagonAlert,
  pencil: Pencil,
  plus: Plus,
  printer: Printer,
  'rotate-ccw': RotateCcw,
  'rows-3': Rows3,
  'rows-4': Rows4,
  'scroll-text': ScrollText,
  search: Search,
  settings: Settings,
  'shield-alert': ShieldAlert,
  trash: Trash2,
  'triangle-alert': TriangleAlert,
  upload: Upload,
  user: User,
  users: Users,
  x: X,
} as const;

export type IconName = keyof typeof REGISTRY;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName;
  size?: number;
  /** Directional glyphs (chevrons, arrows, log-out) must flip in RTL.
   *  Clocks, checkmarks and the logo must not. */
  mirror?: boolean;
  className?: string;
}

export function Icon({ name, size = 20, mirror = false, className, ...rest }: IconProps) {
  const Glyph = REGISTRY[name];
  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      strokeWidth={2}
      className={cn('shrink-0', mirror && 'ef-mirror', className)}
      {...rest}
    />
  );
}

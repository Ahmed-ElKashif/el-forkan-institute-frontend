/* ---------------------------------------------------------------------------
   El Forkan design system — public surface.

   ALWAYS import from here, never from a component file directly. The adherence
   lint (.oxlintrc.json, shipped with the Claude Design handoff) enforces this:
   it is what lets a component's internals change without touching call sites.

       import { Button, DataTable, RoleGate } from '../ds';
--------------------------------------------------------------------------- */

export { cn } from './cn';
export { formatHijriDate, formatNumber, formatPercent, formatScore } from './format';

/* --- core ---------------------------------------------------------------- */
export { Icon, type IconName, type IconProps } from './core/Icon';
export { Button, type ButtonProps } from './core/Button';
export { IconButton, type IconButtonProps } from './core/IconButton';
export { ActionMenu, ContextMenu, useRowContextMenu, type ActionItem } from './core/Menu';
export { Badge, type BadgeProps } from './core/Badge';
export { Card, type CardProps } from './core/Card';
export { StatCard, type StatCardProps } from './core/StatCard';

/* --- forms --------------------------------------------------------------- */
export { Field, type FieldProps } from './forms/Field';
export { Input, type InputProps } from './forms/Input';
export { Textarea, type TextareaProps } from './forms/Textarea';
export { Select, type SelectProps, type SelectOption } from './forms/Select';
export { Checkbox, type CheckboxProps } from './forms/Checkbox';
export { RadioGroup, type RadioGroupProps, type RadioOption } from './forms/RadioGroup';
export { Switch, type SwitchProps } from './forms/Switch';
export { SearchInput, type SearchInputProps } from './forms/SearchInput';
export { OtpInput, type OtpInputProps } from './forms/OtpInput';

/* --- data ---------------------------------------------------------------- */
export {
  DataTable,
  SortHeader,
  type DataTableProps,
  type SortHeaderProps,
  type Column,
  type Density,
  type RowTone,
} from './data/DataTable';
export {
  AttendanceCell,
  ATTENDANCE_STATES,
  type AttendanceCellProps,
  type AttendanceStatus,
} from './data/AttendanceCell';
export { ResultPill, type ResultPillProps, type Decision } from './data/ResultPill';
export { ScoreInput, type ScoreInputProps } from './data/ScoreInput';
export { Pagination, type PaginationProps } from './data/Pagination';
export { EmptyState, type EmptyStateProps } from './data/EmptyState';
export { Skeleton, type SkeletonProps } from './data/Skeleton';
export { BarChart, type BarChartProps, type BarRow, type BarSegment } from './data/BarChart';
export { Donut, type DonutProps, type DonutSegment } from './data/Donut';
export { LineChart, type LineChartProps, type LinePoint } from './data/LineChart';
export { DensityToggle, type DensityToggleProps } from './data/DensityToggle';

/* --- feedback ------------------------------------------------------------ */
export { Alert, type AlertProps } from './feedback/Alert';
export { LockBanner, type LockBannerProps } from './feedback/LockBanner';
export { Dialog, type DialogProps } from './feedback/Dialog';
export { ConfirmDialog, type ConfirmDialogProps } from './feedback/ConfirmDialog';
export { Toast, type ToastProps } from './feedback/Toast';
export { CommitBar, type CommitBarProps, type CommitCount } from './feedback/CommitBar';

/* --- navigation ---------------------------------------------------------- */
export { SideNav, type SideNavProps, type NavItem, type Role } from './navigation/SideNav';
export { TopBar, type TopBarProps, type TopBarUser } from './navigation/TopBar';
export { Tabs, type TabsProps, type TabItem } from './navigation/Tabs';
export { Breadcrumbs, type BreadcrumbsProps, type Crumb } from './navigation/Breadcrumbs';
export { RoleGate, type RoleGateProps } from './navigation/RoleGate';

/* --- brand --------------------------------------------------------------- */
export { Logo, type LogoProps } from './brand/Logo';
export { ArchPanel, type ArchPanelProps } from './brand/ArchPanel';
export { BrandLoader, type BrandLoaderProps } from './brand/BrandLoader';
export { Seal, type SealProps } from './brand/Seal';
export { PrintSheet, type PrintSheetProps, type SheetMeta } from './brand/PrintSheet';
export { CertificateSheet, type CertificateSheetProps } from './brand/CertificateSheet';

import { Badge, type BadgeProps } from '../core/Badge';
import type { IconName } from '../core/Icon';

/** The five promotion decisions `rules/promotion.ts` can return, plus withdrawn.
 *  Gold appears on exactly one of them — graduation, the ceremony case. */
const DECISIONS = {
  promote: { label: 'ينتقل', tone: 'success', icon: 'circle-check' },
  promote_with_carry: { label: 'ينتقل بمادة محمولة', tone: 'warning', icon: 'circle-dot' },
  makeup_required: { label: 'دور ثانٍ', tone: 'info', icon: 'rotate-ccw' },
  repeat: { label: 'يعيد المستوى', tone: 'danger', icon: 'circle-x' },
  graduate: { label: 'متخرّج', tone: 'ceremony', icon: 'award' },
  withdrawn: { label: 'منسحب', tone: 'neutral', icon: 'minus' },
} as const satisfies Record<string, { label: string; tone: NonNullable<BadgeProps['tone']>; icon: IconName }>;

export type Decision = keyof typeof DECISIONS;

export interface ResultPillProps {
  decision: Decision;
  size?: BadgeProps['size'];
  className?: string;
}

export function ResultPill({ decision, size = 'md', className }: ResultPillProps) {
  const d = DECISIONS[decision] ?? DECISIONS.withdrawn;
  return (
    <Badge tone={d.tone} icon={d.icon} size={size} className={className}>
      {d.label}
    </Badge>
  );
}

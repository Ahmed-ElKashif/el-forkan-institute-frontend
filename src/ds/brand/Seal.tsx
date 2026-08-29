import type { HTMLAttributes } from 'react';
import { Icon } from '../core/Icon';
import { cn } from '../cn';

export interface SealProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  /** The certificate serial, e.g. L4-1447-0001. */
  serial?: string;
  label?: string;
}

/** Gold issuance seal for certificates and the "issued" state. Ceremony only. */
export function Seal({
  size = 96,
  serial,
  label = 'شهادة معتمدة',
  className,
  ...rest
}: SealProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        boxShadow: '0 0 0 4px var(--gold-50), 0 0 0 5px var(--gold-200)',
      }}
      className={cn(
        'grid place-items-center gap-0.5 rounded-full border-2 border-gold-500 bg-gold-50 text-center text-gold-700',
        className,
      )}
      {...rest}
    >
      <Icon name="award" size={Math.round(size * 0.26)} />
      <div className="text-xs font-semibold leading-[1.3]">{label}</div>
      {serial ? <div className="ef-num text-[10px] text-gold-600">{serial}</div> : null}
    </div>
  );
}

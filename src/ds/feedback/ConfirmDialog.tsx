import type { ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Alert } from './Alert';
import { Button } from '../core/Button';
import { Field } from '../forms/Field';
import { Textarea } from '../forms/Textarea';

export interface ConfirmDialogProps {
  open?: boolean;
  title: ReactNode;
  /** What will change, stated in full. Never "هل أنت متأكد؟". */
  consequence: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Where the API demands a reason — corrections, revocations. */
  requireReason?: boolean;
  reason?: string;
  onReasonChange?: (value: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  tone?: 'danger' | 'warning';
  width?: number;
}

/** Destructive / history-rewriting confirm.
 *  Names the consequence in full and, where the API demands it, requires a
 *  typed reason of at least three characters. */
export function ConfirmDialog({
  open = true,
  title,
  consequence,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  requireReason = false,
  reason = '',
  onReasonChange,
  onConfirm,
  onCancel,
  tone = 'danger',
  width,
}: ConfirmDialogProps) {
  const ready = !requireReason || reason.trim().length >= 3;

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      width={width}
      footer={
        <>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} disabled={!ready} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Alert tone={tone} title="ما الذي سيحدث">
          {consequence}
        </Alert>
        {requireReason ? (
          <Field
            label="سبب الإجراء"
            required
            hint="يُحفظ السبب في سجل المراجعة ولا يمكن حذفه لاحقًا."
          >
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder="اكتب سببًا واضحًا لا يقل عن ثلاثة أحرف"
            />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}

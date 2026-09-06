import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, CertificateSheet, EmptyState, formatNumber } from '../../ds';
import type { CertificatePrintPayload } from './certificate.model';

/** The printable certificate, rendered outside the app shell so the browser's
 *  print output is the A4 sheet alone (the toolbar is `ef-no-print`). The
 *  payload arrives via navigation state from the issued list, which performed
 *  the reprint — this page writes nothing.
 *
 *  The sheet keeps the design system's placeholder body: the institute's real
 *  wording is still undecided (see CertificateSheet's own note). Swap it in one
 *  place once it lands. */
export function CertificatePrintPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const payload = (useLocation().state ?? null) as CertificatePrintPayload | null;

  if (!payload) {
    return (
      <div className="p-8">
        <EmptyState
          icon="award"
          title={t('certificates.printView.missing.title')}
          description={t('certificates.printView.missing.description')}
        />
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/certificates')}>
          {t('certificates.printView.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="ef-no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => navigate('/certificates')}>
          {t('certificates.printView.back')}
        </Button>
        <div className="flex items-center gap-3">
          {payload.copyNumber > 1 ? (
            <span className="ef-num text-sm text-ink-500">
              {t('certificates.printView.copy', { n: formatNumber(payload.copyNumber) })}
            </span>
          ) : null}
          <Button icon="printer" onClick={() => window.print()}>
            {t('certificates.printView.now')}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-fit">
        <CertificateSheet
          studentName={payload.studentName}
          levelName={payload.levelNameAr}
          academicYear={payload.hijriYear != null ? formatNumber(payload.hijriYear) : undefined}
          serial={payload.serialNo ?? undefined}
          issuedOn={payload.issuedAt.slice(0, 10)}
          headTeacher={payload.issuedByName}
        />
      </div>
    </div>
  );
}

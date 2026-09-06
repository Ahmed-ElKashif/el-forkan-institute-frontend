import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, PrintSheet, formatNumber } from '../../ds';
import { useExamEligibilityQuery } from './eligibility.api';

/** The printable eligible-students roster, rendered outside the app shell so the
 *  browser prints the A4 sheet alone (the toolbar is `ef-no-print`). It re-reads
 *  the list by exam id, so a refresh or a shared link still prints; the subject
 *  name rides along in navigation state and is only decorative if absent. */
export function EligibilityPrintPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId = '' } = useParams();
  const subjectNameAr = (useLocation().state as { subjectNameAr?: string } | null)?.subjectNameAr;

  const list = useExamEligibilityQuery(examId, { skip: examId === '' });
  const eligible = (list.data ?? []).filter((row) => row.isEligible);

  if (list.isLoading) {
    return <div className="p-8 text-center text-ink-500">{t('common.loading')}</div>;
  }

  if (list.isError || eligible.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon="clipboard-list"
          title={t('eligibility.print.empty.title')}
          description={t('eligibility.print.empty.description')}
        />
        <Button className="mt-4" variant="secondary" onClick={() => navigate(-1)}>
          {t('eligibility.print.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas p-6">
      <div className="ef-no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t('eligibility.print.back')}
        </Button>
        <Button icon="printer" onClick={() => window.print()}>
          {t('eligibility.print.now')}
        </Button>
      </div>

      <div className="mx-auto w-fit">
        <PrintSheet
          title={t('eligibility.print.title')}
          meta={[
            ...(subjectNameAr ? [{ label: t('eligibility.print.subject'), value: subjectNameAr }] : []),
            { label: t('eligibility.print.count'), value: formatNumber(eligible.length) },
            { label: t('eligibility.print.date'), value: new Date().toISOString().slice(0, 10) },
          ]}
          footerNote={t('eligibility.print.footer')}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gold-300 text-start">
                <th className="w-10 py-1.5 text-start font-semibold">{t('eligibility.print.no')}</th>
                <th className="py-1.5 text-start font-semibold">{t('eligibility.columns.name')}</th>
                <th className="w-28 py-1.5 text-start font-semibold">{t('eligibility.columns.code')}</th>
                <th className="w-36 py-1.5 text-start font-semibold">{t('eligibility.print.signature')}</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((row, i) => (
                <tr key={row.id} className="border-b border-gold-200">
                  <td className="ef-num py-2">{formatNumber(i + 1)}</td>
                  <td className="py-2">{row.studentName}</td>
                  <td className="ef-num py-2">{row.studentCode}</td>
                  <td className="py-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </PrintSheet>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, type TabItem } from '../../ds';
import { useTabParam } from '../../shared/react/useTabParam';
import { ExportsPage } from '../exports';
import { UploadForm } from './UploadForm';
import { ImportPreview } from './ImportPreview';

const TAB_KEYS = ['import', 'export'] as const;
type TabKey = (typeof TAB_KEYS)[number];

/** Moving the register in and out of the building (head-teacher only, gated).
 *
 *  Import and export are the same workbook travelling in opposite directions —
 *  the export mirrors the printed roster the import reads back (§6.5), so a
 *  head teacher checking what a file will contain and a head teacher loading one
 *  are doing one job, not two. They were two destinations only because they were
 *  built in different phases.
 *
 *  The tab lives in `?tab=` so the retired `/exports` route redirects into it. */
export function ImportExportPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useTabParam<TabKey>(TAB_KEYS, 'import');

  const tabs: TabItem[] = [
    { key: 'import', label: t('import.tabs.import') },
    { key: 'export', label: t('import.tabs.export') },
  ];

  return (
    <section className="space-y-4">
      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />
      {tab === 'import' ? <ImportTab /> : null}
      {tab === 'export' ? <ExportsPage /> : null}
    </section>
  );
}

/** Upload, then review and commit. The job id is the whole state — none until a
 *  file is uploaded, then the preview owns the flow until the reviewer discards
 *  it or starts another import. */
function ImportTab() {
  const [jobId, setJobId] = useState<string | null>(null);

  return jobId == null ? (
    <UploadForm onCreated={setJobId} />
  ) : (
    <ImportPreview jobId={jobId} onReset={() => setJobId(null)} />
  );
}

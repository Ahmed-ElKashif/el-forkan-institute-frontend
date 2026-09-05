import { useState } from 'react';
import { UploadForm } from './UploadForm';
import { ImportPreview } from './ImportPreview';

/** The import screen (head-teacher only, gated in the route table). Two steps in
 *  one place: upload a workbook, then review the preview and commit. The job id
 *  is the whole state — none until a file is uploaded, then the preview owns the
 *  flow until the reviewer discards it or starts another import. */
export function ImportPage() {
  const [jobId, setJobId] = useState<string | null>(null);

  return jobId == null ? (
    <UploadForm onCreated={setJobId} />
  ) : (
    <ImportPreview jobId={jobId} onReset={() => setJobId(null)} />
  );
}

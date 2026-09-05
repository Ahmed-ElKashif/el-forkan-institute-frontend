/** Trigger a browser "save as" for an in-memory blob (an export the app fetched
 *  with the user's token). A temporary object URL is created, clicked through a
 *  hidden anchor, and revoked immediately after. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

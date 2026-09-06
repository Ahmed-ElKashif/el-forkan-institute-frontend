import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Dialog, Field, Input, Textarea } from '../../ds';
import { useUpdateTemplateMutation } from './whatsapp.api';
import type { MessageTemplate } from './whatsapp.model';

/** Edit a message template. `code` and `channel` are how the app finds and routes
 *  the template, so they are shown for context but never edited — only the body,
 *  the Meta template name, the language and the active flag. */
export function TemplateDialog({ template, onClose, onSaved }: { template: MessageTemplate; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateTemplateMutation();

  const [body, setBody] = useState(template.body);
  const [providerName, setProviderName] = useState(template.providerTemplateName ?? '');
  const [language, setLanguage] = useState(template.language);
  const [isActive, setIsActive] = useState(template.isActive);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = body.trim().length >= 5 && language.trim() !== '' && !updateState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await update({
        id: template.id,
        patch: {
          body: body.trim(),
          providerTemplateName: providerName.trim() === '' ? null : providerName.trim(),
          language: language.trim(),
          isActive,
        },
      }).unwrap();
      onSaved(t('whatsapp.templates.saved', { code: template.code }));
    } catch {
      setError(t('whatsapp.saveError'));
    }
  }

  return (
    <Dialog
      title={t('whatsapp.templates.editTitle', { code: template.code })}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={updateState.isLoading}>{t('whatsapp.save')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('whatsapp.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('whatsapp.templates.body')} required hint={t('whatsapp.templates.bodyHint')}>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} aria-label={t('whatsapp.templates.body')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('whatsapp.templates.providerName')} hint={t('whatsapp.templates.providerNameHint')}>
            <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} aria-label={t('whatsapp.templates.providerName')} />
          </Field>
          <Field label={t('whatsapp.templates.language')}>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={t('whatsapp.templates.language')} />
          </Field>
        </div>
        <Checkbox label={t('whatsapp.templates.active')} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </div>
    </Dialog>
  );
}

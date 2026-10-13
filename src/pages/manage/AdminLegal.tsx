import { useEffect, useMemo, useState } from 'react';
import { Download, RotateCcw, Save, Scales } from '@/icons';
import { Button, Card, CardHeader, ErrorState, LoadingState, Notice, PageHeader, Tab, TabGroup, confirmDialog, fmt, toast } from '@/components/AdminUI';
import { manageApi, type LegalDoc } from '@/services/manageApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { isMissingMonitor } from '@/services/monitorApi';
import { MissingBackend } from './shared';

/** Rough preview of how the backend splits the text into sections. */
function Preview({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <div className="prose-sm max-h-[70vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700 dark:text-white/75">
      {lines.map((raw, i) => {
        const l = raw.trim();
        if (!l) return <div key={i} className="h-2" />;
        if (i === 0) return <h2 key={i} className="mb-2 text-lg font-bold text-gray-950 dark:text-white">{l}</h2>;
        if (/^(\d+)\.\s+\S/.test(l) && l.length < 90 && !/[.:;]$/.test(l)) return <h3 key={i} className="mb-1 mt-4 text-[15px] font-bold text-gray-950 dark:text-white">{l}</h3>;
        if (/^(ANNEXURE|SCHEDULE)\b/i.test(l)) return <h3 key={i} className="mb-1 mt-4 text-[15px] font-bold text-gray-950 dark:text-white">{l}</h3>;
        if (/^([A-Z]|\d+)\.\d+\s/.test(l)) return <h4 key={i} className="mb-0.5 mt-2.5 font-semibold text-gray-900 dark:text-white">{l}</h4>;
        if (/^[-•]\s/.test(l)) return <p key={i} className="pl-4 before:-ml-3 before:mr-1.5 before:content-['•']">{l.slice(2)}</p>;
        return <p key={i} className="mb-1">{l}</p>;
      })}
    </div>
  );
}

export default function AdminLegal() {
  const [docs, setDocs] = useState<LegalDoc[] | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [slug, setSlug] = useState('privacy-policy');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  const load = () => {
    setError('');
    manageApi
      .legal()
      .then((d) => {
        setDocs(d);
        setDraft(Object.fromEntries(d.map((x) => [x.slug, x.text])));
      })
      .catch((e) => (isMissingMonitor(e) ? setMissing(true) : setError(getApiErrorMessage(e))));
  };
  useEffect(load, []);

  const doc = docs?.find((d) => d.slug === slug);
  const text = draft[slug] ?? '';
  const dirty = !!doc && text !== doc.text;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (docs?.some((d) => draft[d.slug] !== d.text)) e.preventDefault();
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [docs, draft]);

  const save = async () => {
    if (!doc) return;
    const ok = await confirmDialog({ title: `Publish ${doc.title}?`, message: 'The app and the website show the new text straight away. The old version is kept on the server as a backup.', confirmLabel: 'Publish' });
    if (!ok) return;
    setSaving(true);
    try {
      await manageApi.saveLegal(slug, text);
      toast.success(`${doc.title} published`);
      load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader
        icon={Scales}
        eyebrow="App & website"
        title="Legal pages"
        description="Privacy Policy and Terms of Use as shown in the app and on the website."
        actions={
          doc && (
            <>
              <Button variant="outline" size="sm" onClick={download}>
                <Download size={14} /> Download .txt
              </Button>
              <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
                <Save size={14} /> Publish
              </Button>
            </>
          )
        }
      />
      <MissingBackend show={missing} />
      <Notice tone="info" className="mb-4">
        Saving writes <code className="font-mono text-xs">src/content/legal/{slug}.txt</code> on the server. If your host rebuilds from Git on every deploy, also put the downloaded file in your repo so the next deploy keeps it.
      </Notice>
      {error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : !docs ? (
        missing ? null : <LoadingState rows={6} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabGroup>
              {docs.map((d) => (
                <Tab key={d.slug} groupId="legal-docs" active={slug === d.slug} onClick={() => setSlug(d.slug)}>
                  {d.title}
                  {draft[d.slug] !== d.text && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </Tab>
              ))}
            </TabGroup>
            <TabGroup>
              <Tab groupId="legal-view" active={view === 'edit'} onClick={() => setView('edit')}>
                Edit
              </Tab>
              <Tab groupId="legal-view" active={view === 'preview'} onClick={() => setView('preview')}>
                Preview
              </Tab>
            </TabGroup>
          </div>
          <Card>
            <CardHeader
              title={doc?.title}
              description={`${doc?.updatedAt ? `Last saved ${fmt.dateTime(doc.updatedAt)}` : 'Not saved yet'} · ${words.toLocaleString('en-IN')} words${dirty ? ' · unsaved changes' : ''}`}
              icon={Scales}
              actions={
                dirty && (
                  <Button size="xs" variant="ghost" onClick={() => setDraft((d) => ({ ...d, [slug]: doc!.text }))}>
                    <RotateCcw size={12} /> Undo changes
                  </Button>
                )
              }
            />
            {view === 'edit' ? (
              <textarea
                value={text}
                onChange={(e) => setDraft((d) => ({ ...d, [slug]: e.target.value }))}
                spellCheck
                className="block h-[68vh] w-full resize-none rounded-b-2xl bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-gray-800 outline-none dark:text-white/85"
              />
            ) : (
              <Preview text={text} />
            )}
          </Card>
          <p className="mt-3 text-xs text-gray-400">Format: first line is the title · “1. Heading” starts a section · “1.1 Something” is a sub-heading · “- text” is a bullet.</p>
        </>
      )}
    </div>
  );
}

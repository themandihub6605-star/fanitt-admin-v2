import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Percent } from 'lucide-react';
import { referralApi, type ReferralConfig } from '@/services/referralApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button } from '@/components/AdminUI';

const FIELDS: { key: keyof ReferralConfig; label: string; description: string }[] = [
  { key: 'agentToAgentPercent', label: 'Agent → Agent', description: 'When an Agency refers another Agency' },
  { key: 'agentToBrandOrCreatorPercent', label: 'Agent → Brand/Creator', description: 'When an Agency refers a Brand or Creator' },
  { key: 'creatorToCreatorPercent', label: 'Creator → Creator', description: 'When a Creator refers another Creator' },
  { key: 'creatorToBrandPercent', label: 'Creator → Brand', description: 'When a Creator refers a Brand' },
];

export default function AdminReferralConfig() {
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    referralApi
      .getConfig()
      .then(setConfig)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof ReferralConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: value === '' ? 0 : Number(value) });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await referralApi.updateConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Referral Commission Settings"
        description="Set what percentage of earnings gets paid out as referral commission for each relationship type. Applies across all 4 account types."
      />

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading config...</p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {!loading && config && (
        <Card className="mt-2 p-5">
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-sm font-bold text-gray-900 dark:text-white">{f.label}</span>
                <span className="mb-1.5 block text-xs text-gray-400 dark:text-white/40">{f.description}</span>
                <div className="relative max-w-[160px]">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={config[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-white/10">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} /> Saved
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

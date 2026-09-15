import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Percent } from 'lucide-react';
import { adminApi, type SiteSettings } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button } from '@/components/AdminUI';

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white';

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .getSiteSettings()
      .then(setSettings)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await adminApi.updateSiteSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Site Settings" description="Platform-wide config — changes apply immediately, no redeploy needed." />

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading settings...</p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {!loading && settings && (
        <Card className="mt-2 space-y-5 p-5">
          <label className="block">
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Platform Commission</span>
            <span className="mb-1.5 block text-xs text-gray-400 dark:text-white/40">
              Cut taken from every session payment, donation, and campaign payout.
            </span>
            <div className="relative max-w-[160px]">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={settings.platformCommissionPercent}
                onChange={(e) => setSettings({ ...settings, platformCommissionPercent: Number(e.target.value) })}
                className={`${inputClasses} pr-9`}
              />
              <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Support Email</span>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Homepage Banner Text</span>
            <input
              value={settings.homepageBannerText}
              onChange={(e) => setSettings({ ...settings, homepageBannerText: e.target.value })}
              placeholder="Leave empty to hide the banner"
              className={inputClasses}
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3.5 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Maintenance Mode</p>
              <p className="text-xs text-gray-400 dark:text-white/40">Shows a maintenance page to all visitors on the main site.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-rose-500' : 'bg-gray-200 dark:bg-white/15'}`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {settings.maintenanceMode && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Maintenance Message</span>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                rows={2}
                className={inputClasses}
              />
            </label>
          )}

          <div className="flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-white/10">
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

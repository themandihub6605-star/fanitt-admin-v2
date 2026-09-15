import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Megaphone } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button } from '@/components/AdminUI';

const ROLES = [
  { value: '', label: 'Everyone' },
  { value: 'fan', label: 'Fans only' },
  { value: 'creator', label: 'Creators only' },
  { value: 'brand', label: 'Brands only' },
  { value: 'agency', label: 'Agencies only' },
];

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

export default function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const targetLabel = ROLES.find((r) => r.value === role)?.label || 'Everyone';
    if (!window.confirm(`Send this notification to "${targetLabel}"? This can't be undone.`)) return;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await adminApi.broadcastNotification({ title: title.trim(), message: message.trim(), role: role || undefined });
      setResult(res.sentTo);
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Broadcast Notification" description="Send the same notification to everyone, or a specific account type." />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}
          {result !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" /> Sent to {result} user{result === 1 ? '' : 's'}.
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Send to</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClasses}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New feature: Live Sessions"
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-gray-900 dark:text-white">Message</span>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you want to tell them?"
              className={inputClasses}
            />
          </label>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
            Send Notification
          </Button>
        </form>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Plus, ShieldCheck, RefreshCw } from 'lucide-react';
import { adminApi, type AdminUser } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button, EmptyState } from '@/components/AdminUI';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass + '!';
}

const inputClasses =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listAdmins()
      .then(setAdmins)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await adminApi.createAdmin({ name, email, password });
      setCreated({ email, password });
      setName('');
      setEmail('');
      setPassword(generatePassword());
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader title="Admin Accounts" description="Everyone who has access to this panel." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <Plus size={15} />
            </span>
            Add New Admin
          </h2>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}
            {created && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={14} /> Admin created — share these credentials:
                </p>
                <p className="mt-2 text-gray-700 dark:text-white/80">
                  Email: <span className="font-mono">{created.email}</span>
                </p>
                <p className="text-gray-700 dark:text-white/80">
                  Password: <span className="font-mono">{created.password}</span>
                </p>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-white/80">Name</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-white/80">Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-white/80">Temporary Password</span>
              <div className="flex gap-2">
                <input required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClasses} font-mono`} />
                <Button type="button" variant="outline" size="sm" onClick={() => setPassword(generatePassword())} className="shrink-0">
                  <RefreshCw size={13} /> New
                </Button>
              </div>
            </label>

            <Button type="submit" disabled={creating} className="w-full">
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Admin'}
            </Button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
            All Admins {!loading && <span className="text-gray-300 dark:text-white/20">({admins.length})</span>}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400 dark:text-white/40">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <EmptyState icon={ShieldCheck} message="No admin accounts yet." />
          ) : (
            <div className="space-y-2">
              {admins.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-sm shadow-pink-500/20">
                    <ShieldCheck size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{a.name}</p>
                    <p className="truncate text-xs text-gray-400 dark:text-white/50">{a.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

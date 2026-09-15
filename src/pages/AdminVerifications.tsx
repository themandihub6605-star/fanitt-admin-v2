import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Check, X, Sparkles, Building2 } from 'lucide-react';
import { adminApi, type PendingVerifications } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Button } from '@/components/AdminUI';

export default function AdminVerifications() {
  const [data, setData] = useState<PendingVerifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listPendingVerifications()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreator = async (id: string, decision: 'verified' | 'rejected') => {
    setActingOn(id);
    try {
      await adminApi.verifyCreator(id, decision);
      setData((prev) => (prev ? { ...prev, pendingCreators: prev.pendingCreators.filter((c) => c._id !== id) } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const handleBrand = async (id: string, decision: 'verified' | 'rejected') => {
    setActingOn(id);
    try {
      await adminApi.verifyBrand(id, decision);
      setData((prev) => (prev ? { ...prev, pendingBrands: prev.pendingBrands.filter((b) => b._id !== id) } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Pending Verifications" description="Creator and Brand profiles waiting on the verified badge." />

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      )}

      {!loading && data && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
              <Sparkles size={14} /> Creators ({data.pendingCreators.length})
            </h2>
            {data.pendingCreators.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingCreators.map((c) => (
                  <Card key={c._id} className="p-4">
                    <div className="flex items-center gap-3">
                      {c.user?.avatarUrl ? (
                        <img src={c.user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-sm font-bold text-white">
                          {(c.user?.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-gray-900 dark:text-white">{c.user?.name || 'Unknown user'}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-white/50">{c.user?.email || '—'}</p>
                      </div>
                    </div>
                    {c.category?.label && <p className="mt-2 text-xs text-gray-400 dark:text-white/40">Category: {c.category.label}</p>}
                    {c.bio && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-white/50">{c.bio}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCreator(c._id, 'verified')}
                        disabled={actingOn === c._id}
                        className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700"
                      >
                        <Check size={12} /> Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleCreator(c._id, 'rejected')} disabled={actingOn === c._id}>
                        <X size={12} /> Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
              <Building2 size={14} /> Brands ({data.pendingBrands.length})
            </h2>
            {data.pendingBrands.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-white/40">Nothing pending.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingBrands.map((b) => (
                  <Card key={b._id} className="p-4">
                    <div className="flex items-center gap-3">
                      {b.user?.avatarUrl ? (
                        <img src={b.user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-orange-600 text-sm font-bold text-white">
                          {(b.companyName || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-gray-900 dark:text-white">{b.companyName || 'Unknown brand'}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-white/50">{b.user?.email || '—'}</p>
                      </div>
                    </div>
                    {b.industry && <p className="mt-2 text-xs text-gray-400 dark:text-white/40">Industry: {b.industry}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleBrand(b._id, 'verified')}
                        disabled={actingOn === b._id}
                        className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700"
                      >
                        <Check size={12} /> Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleBrand(b._id, 'rejected')} disabled={actingOn === b._id}>
                        <X size={12} /> Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
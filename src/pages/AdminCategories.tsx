import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Plus, Trash2, RotateCcw, Tag } from 'lucide-react';
import { adminApi, type AdminCategory } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { PageHeader, Card, Button, EmptyState } from '@/components/AdminUI';

const inputClasses =
  'rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listCategories()
      .then(setCategories)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await adminApi.createCategory({ label: newLabel.trim(), icon: newIcon.trim() });
      setCategories((prev) => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
      setNewLabel('');
      setNewIcon('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (cat: AdminCategory) => {
    setActingOn(cat._id);
    setError('');
    try {
      if (cat.isActive) {
        await adminApi.deleteCategory(cat._id);
        setCategories((prev) => prev.map((c) => (c._id === cat._id ? { ...c, isActive: false } : c)));
      } else {
        const updated = await adminApi.updateCategory(cat._id, { isActive: true });
        setCategories((prev) => prev.map((c) => (c._id === cat._id ? updated : c)));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Creator content categories — shown on signup, Explore Creators filters, and profile pages."
      />

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-white/60">Category name</span>
            <input
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Personal Finance"
              className={cn(inputClasses, 'w-56')}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-white/60">Icon name (lucide-react, optional)</span>
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="e.g. Wallet"
              className={cn(inputClasses, 'w-48')}
            />
          </label>
          <Button type="submit" disabled={creating}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Category
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="mt-6">
          <Card>
            <EmptyState icon={Tag} message="No categories yet — add one above." />
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-2xl border p-4',
                cat.isActive
                  ? 'border-gray-100 bg-white shadow-[0_2px_10px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#171B26]'
                  : 'border-dashed border-gray-200 bg-gray-50/50 opacity-60 dark:border-white/10 dark:bg-white/[0.02]'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                  <Tag size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900 dark:text-white">{cat.label}</p>
                  <p className="text-xs text-gray-400 dark:text-white/40">{cat.isActive ? 'Active' : 'Removed'}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleActive(cat)}
                disabled={actingOn === cat._id}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50',
                  cat.isActive
                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                )}
              >
                {actingOn === cat._id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : cat.isActive ? (
                  <Trash2 size={12} />
                ) : (
                  <RotateCcw size={12} />
                )}
                {cat.isActive ? 'Remove' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

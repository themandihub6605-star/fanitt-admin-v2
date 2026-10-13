import { useEffect, useState } from 'react';
import { Store, Zap } from '@/icons';
import { confirmDialog, fmt, toast } from '@/components/AdminUI';
import { featuresApi, isMissingMonitor, type AppFeatures } from '@/services/monitorApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';

/**
 * Switch for the Fanitt Store's PHYSICAL PRODUCTS (merch shop). Off: the
 * app hides the shop (home "Fanitt Store" section, shop, cart, checkout,
 * product pages) and nobody can start a new shop order. Stores, digital
 * products, lives, calls and FanBox keep working, and existing orders can
 * still be tracked and shipped.
 */
export function StoreSwitch({ className }: { className?: string }) {
  const [f, setF] = useState<AppFeatures | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    featuresApi
      .get()
      .then(setF)
      .catch((e) => isMissingMonitor(e) && setMissing(true));
  }, []);

  if (missing) {
    return (
      <div className={cn('mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200', className)}>
        The store products on/off switch needs the latest backend file <code className="font-mono text-xs">src/monitor/features.js</code> and the updated monitor files.
      </div>
    );
  }
  if (!f) return <div className={cn('skeleton mb-5 h-[76px] rounded-xl', className)} />;

  const on = f.storeEnabled;
  const toggle = async () => {
    const next = !on;
    const ok = await confirmDialog(
      next
        ? { title: 'Show Fanitt Store products?', message: 'Physical products (merch shop) show again in the app and people can order again.', confirmLabel: 'Turn on' }
        : {
            title: 'Hide Fanitt Store products?',
            message: 'Physical products disappear from the app: the home "Fanitt Store" section, the shop, cart, checkout and product pages, and the products section on store pages. Nobody can place a new shop order. Stores, digital products, lives, calls and FanBox keep working, and existing orders can still be tracked and shipped.',
            confirmLabel: 'Turn off',
            tone: 'danger',
          }
    );
    if (!ok) return;
    setBusy(true);
    try {
      const r = await featuresApi.setStore(next);
      setF((p) => ({ ...(p as AppFeatures), ...r }));
      toast.success(next ? 'Store products are visible' : 'Store products are hidden');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'mb-5 flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3.5',
        on ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06]' : 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/[0.08]',
        className
      )}
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white', on ? 'bg-emerald-500' : 'bg-rose-500')}>
        <Store size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-gray-950 dark:text-white">
          Fanitt Store products are {on ? 'on' : 'off'}
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', on ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'live-dot bg-emerald-500' : 'bg-rose-500')} /> {on ? 'Visible in the app' : 'Hidden in the app'}
          </span>
        </p>
        <p className="mt-0.5 text-[12.5px] text-gray-500 dark:text-white/50">
          {on ? 'Physical products (merch shop) are visible and can be ordered.' : 'Physical products are hidden and can’t be ordered. Stores, digital products, lives, calls and FanBox still work.'}
          {f.updatedAt && ` · changed ${fmt.ago(f.updatedAt)}${f.updatedBy?.name ? ` by ${f.updatedBy.name}` : ''}`}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? 'Hide Fanitt Store products' : 'Show Fanitt Store products'}
        disabled={busy}
        onClick={toggle}
        className={cn('relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60', on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20')}
      >
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform', on ? 'translate-x-7' : 'translate-x-1')}>
          <Zap size={12} className={on ? 'text-emerald-600' : 'text-gray-400'} />
        </span>
      </button>
    </div>
  );
}
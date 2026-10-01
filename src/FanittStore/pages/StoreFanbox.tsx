import { Gift, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState } from '@/components/AdminUI';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type OrderRow } from '../api';
import { ErrorBanner, Loading, Pagination, ReasonModal, StatusBadge, dateTime, rupees, usePagedList } from '../ui';

export default function StoreFanbox() {
  const list = usePagedList<OrderRow>((page) => storeAdminApi.fanbox({ page }), []);
  const [refunding, setRefunding] = useState<OrderRow | null>(null);

  return (
    <StoreLayout description="Tips fans send to creators, with their messages. The FanBox fee is set in Settings.">
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />
      {list.loading ? (
        <Loading text="Loading FanBox…" />
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-white/40">{list.total.toLocaleString('en-IN')} FanBox payments</p>
          <div className="mt-2 space-y-3">
            {list.items.length === 0 && <EmptyState icon={Gift} message="No FanBox sent yet." />}
            {list.items.map((f) => (
              <Card key={f._id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                  <Gift size={18} />
                </span>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {f.buyer?.name} → {f.seller?.name}
                    </p>
                    <StatusBadge status={f.status} />
                    {f.paidWith === 'wallet' && <Badge tone="sky">Wallet</Badge>}
                  </div>
                  {f.message ? <p className="mt-0.5 text-sm italic text-gray-600 dark:text-white/70">“{f.message}”</p> : null}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {dateTime(f.paidAt)} · {f.razorpayPaymentId || f.invoiceNumber}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-white/55">
                  <p className="text-base font-bold text-gray-900 dark:text-white">{rupees(f.amount)}</p>
                  <p>
                    fee {rupees(f.feeAmount)} · creator {rupees(f.creatorEarning)}
                  </p>
                </div>
                {f.status === 'paid' && (
                  <Button size="sm" variant="outline" onClick={() => setRefunding(f)}>
                    <Undo2 size={12} /> Refund
                  </Button>
                )}
              </Card>
            ))}
          </div>
          <Pagination page={list.page} pages={list.pages} onPage={list.goTo} />
        </>
      )}

      <ReasonModal
        open={Boolean(refunding)}
        title={`Refund FanBox ${refunding ? rupees(refunding.amount) : ''}`}
        hint="The fan gets the money back and it is taken from the creator's wallet."
        presets={['Sent by mistake', 'Unauthorised payment', 'Duplicate payment']}
        confirmLabel="Refund"
        onClose={() => setRefunding(null)}
        onSubmit={async (reason) => {
          if (!refunding) return;
          await storeAdminApi.refundOrder(refunding._id, reason);
          list.reload();
        }}
      />
    </StoreLayout>
  );
}

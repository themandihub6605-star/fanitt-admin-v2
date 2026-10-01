import { useState } from 'react';
import { Receipt, Undo2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/AdminUI';
import StoreLayout from '../StoreLayout';
import { storeAdminApi, type OrderRow, type OrderStatus } from '../api';
import { ITEM_LABEL, ErrorBanner, Loading, Pagination, ReasonModal, SearchBox, Select, StatusBadge, dateTime, rupees, useDebounced, usePagedList } from '../ui';

type Filter = 'all' | OrderStatus;

export default function StoreOrders() {
  const [status, setStatus] = useState<Filter>('paid');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [refunding, setRefunding] = useState<OrderRow | null>(null);
  const list = usePagedList<OrderRow>((page) => storeAdminApi.orders({ page, status, search: q }), [status, q]);

  return (
    <StoreLayout description="Every store payment. Refunds go back to the buyer (card/UPI or wallet — whichever paid) and are taken from the creator's wallet.">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search item, invoice, payment id, buyer or seller…" />
        <Select<Filter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All orders' },
            { value: 'paid', label: 'Paid' },
            { value: 'refunded', label: 'Refunded' },
            { value: 'pending', label: 'Unpaid (checkout not finished)' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
      </div>
      <ErrorBanner message={list.error} onClose={() => list.setError('')} />

      {list.loading ? (
        <Loading text="Loading orders…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{list.total.toLocaleString('en-IN')} orders</p>
          <Card className="mt-2 overflow-x-auto p-0">
            {list.items.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Receipt} message="No orders found." />
              </div>
            ) : (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-white/10 dark:text-white/40">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Buyer → Seller</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Fee · Creator</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {list.items.map((o) => (
                    <tr key={o._id} className="align-top text-gray-700 dark:text-white/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="gray">{ITEM_LABEL[o.itemType]}</Badge>
                          {o.paidWith === 'wallet' && <Badge tone="sky">Wallet</Badge>}
                        </div>
                        <p className="mt-1 max-w-[260px] truncate font-semibold text-gray-900 dark:text-white">{o.itemTitle}</p>
                        <p className="text-[11px] text-gray-400">
                          {o.invoiceNumber || '—'} · {dateTime(o.paidAt || o.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p>{o.buyer?.name} <span className="text-gray-400">{o.buyer?.email}</span></p>
                        <p className="text-gray-400">→ {o.seller?.name}{o.store ? ` (${o.store.name})` : ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <b className="text-gray-900 dark:text-white">{rupees(o.amount)}</b>
                        {o.itemType === 'call' && o.settledAmount != null && (
                          <p className="text-[11px] text-gray-400">
                            billed {rupees(o.settledAmount)} · back {rupees(o.walletRefund || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {rupees(o.feeAmount)} · {rupees(o.creatorEarning)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                        {o.refundReason && <p className="mt-1 max-w-[180px] text-[11px] text-gray-400">{o.refundReason}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'paid' && o.itemType !== 'call' && o.amount > 0 && (
                          <Button size="sm" variant="outline" onClick={() => setRefunding(o)}>
                            <Undo2 size={12} /> Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Pagination page={list.page} pages={list.pages} onPage={list.goTo} />
          <p className="mt-3 text-[11px] text-gray-400 dark:text-white/40">Calls settle automatically when they end (billed minutes to the creator, the rest back to the caller's wallet), so they can't be refunded here.</p>
        </>
      )}

      <ReasonModal
        open={Boolean(refunding)}
        title={`Refund ${refunding ? rupees(refunding.amount) : ''}`}
        hint={
          refunding?.paidWith === 'wallet'
            ? "The money goes back to the buyer's Fanitt wallet and access is removed. The creator's share is taken back."
            : 'Razorpay refunds the buyer in 5–7 working days and access is removed. The creator’s share is taken back.'
        }
        presets={['Buyer charged twice', 'Product did not match its description', 'Files could not be opened', 'Live did not happen']}
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

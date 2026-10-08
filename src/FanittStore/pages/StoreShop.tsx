import { useEffect, useState } from 'react';
import { Ban, Eye, IndianRupee, Loader2, Package, PackageCheck, RotateCcw, Save, ShoppingBag, Truck, Undo2 } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/services/apiClient';
import { Badge, Button, Card, EmptyState, StatCard } from '@/components/AdminUI';
import { cn } from '@/utils/cn';
import StoreLayout from '../StoreLayout';
import { ErrorBanner, Loading, Modal, Pagination, ReasonModal, SearchBox, Select, dateTime, inputClasses, rupees, useDebounced, usePagedList } from '../ui';
import type { Paged } from '../api';

// Fanitt Shop — physical products (clothes, merch…) bought with COD or online.
// Backend: /api/store/admin/shop/* (src/FanittStore/routes/adminCommerce.routes.js). Money is in paise.

// ---------------- types ----------------

type OrderStatus = 'awaiting_payment' | 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed';

interface ShopOrder {
  _id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  items: { product: string; title: string; imageUrl: string; variantLabel: string; variantName: string; price: number; mrp: number; qty: number }[];
  itemCount: number;
  itemsTotal: number;
  deliveryCharge: number;
  total: number;
  address: { name: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
  paymentMethod: 'cod' | 'online';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  courier: string;
  trackingId: string;
  trackingUrl: string;
  sellerNote: string;
  cancelReason: string;
  cancelledBy: string;
  timeline: { status: string; at: string; note: string; by: string }[];
  createdAt: string;
  deliveredAt: string | null;
  store: { _id: string; name: string; slug: string; logoUrl: string } | null;
  buyer: { _id: string; name: string; avatar: string } | null;
  buyerEmail?: string;
  buyerPhone?: string;
  feePercent: number;
  feeAmount: number;
  creatorEarning: number;
  settledAt: string | null;
  canCancel: boolean;
  razorpayPaymentId: string;
  razorpayRefundId: string;
}

interface ShopProduct {
  _id: string;
  title: string;
  category: string;
  images: string[];
  imageUrl: string;
  price: number;
  mrp: number;
  totalStock: number;
  variantName: string;
  variants: { _id: string; label: string; stock: number }[];
  deliveryCharge: number;
  codAvailable: boolean;
  status: 'draft' | 'published' | 'unpublished' | 'removed';
  removedReason: string;
  salesCount: number;
  views: number;
  store: { _id: string; name: string; slug: string; logoUrl: string } | string | null;
  createdAt: string;
}

interface Overview {
  products: { total: number; published: number; removed: number };
  orders: { placed: number; confirmed: number; shipped: number; delivered: number; cancelled: number; awaitingPayment: number };
  delivered: { sales: number; fees: number; codOrders: number; onlineOrders: number };
  last30Days: { orders: number; value: number };
  refundPending: number;
}

interface ShopSettings {
  shopEnabled: boolean;
  shopFeePercent: number;
  shopCodEnabled: boolean;
  shopOnlineEnabled: boolean;
  shopCodMaxAmount: number;
}

// ---------------- api ----------------

const base = '/store/admin/shop';
type Query = Record<string, string | number | undefined>;
const clean = (q: Query) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'));
const get = async <T,>(url: string, params?: Query) => (await apiClient.get<{ data: T }>(url, { params: params && clean(params) })).data.data;
const list = async <T,>(url: string, params: Query): Promise<Paged<T>> => {
  const d = await get<{ items: T[]; total: number; page: number; pages: number }>(url, params);
  return { items: d.items || [], total: d.total || 0, page: d.page || 1, pages: Math.max(1, d.pages || 1) };
};

const shopApi = {
  overview: () => get<Overview>(`${base}/overview`),
  orders: (q: Query) => list<ShopOrder>(`${base}/orders`, q),
  order: (id: string) => get<ShopOrder>(`${base}/orders/${id}`),
  cancelOrder: (id: string, reason: string) => apiClient.post(`${base}/orders/${id}/cancel`, { reason }),
  retryRefund: (id: string) => apiClient.post(`${base}/orders/${id}/refund`),
  products: (q: Query) => list<ShopProduct>(`${base}/products`, q),
  removeProduct: (id: string, reason: string) => apiClient.patch(`${base}/products/${id}/remove`, { reason }),
  restoreProduct: (id: string) => apiClient.patch(`${base}/products/${id}/restore`),
  settings: () => get<ShopSettings>(`${base}/settings`),
  saveSettings: (body: Partial<ShopSettings>) => apiClient.patch<{ data: ShopSettings }>(`${base}/settings`, body).then((r) => r.data.data),
};

// ---------------- small helpers ----------------

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  placed: 'New',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  payment_failed: 'Payment failed',
  published: 'Live',
  draft: 'Draft',
  unpublished: 'Hidden',
  removed: 'Removed',
};
const STATUS_TONE: Record<string, 'gray' | 'orange' | 'emerald' | 'amber' | 'rose' | 'sky' | 'pink'> = {
  awaiting_payment: 'amber',
  placed: 'orange',
  confirmed: 'sky',
  shipped: 'sky',
  delivered: 'emerald',
  cancelled: 'gray',
  payment_failed: 'rose',
  published: 'emerald',
  draft: 'gray',
  unpublished: 'gray',
  removed: 'rose',
};
const Status = ({ s }: { s: string }) => <Badge tone={STATUS_TONE[s] || 'gray'}>{STATUS_LABEL[s] || s}</Badge>;

function PayBadge({ o }: { o: ShopOrder }) {
  if (o.paymentMethod === 'cod') return <Badge tone={o.paymentStatus === 'paid' ? 'emerald' : 'amber'}>COD{o.paymentStatus === 'paid' ? ' · collected' : ''}</Badge>;
  const tone = o.paymentStatus === 'paid' ? 'emerald' : o.paymentStatus === 'refunded' ? 'pink' : o.paymentStatus === 'failed' ? 'rose' : 'amber';
  return <Badge tone={tone}>Online · {o.paymentStatus}</Badge>;
}

const needsRefund = (o: ShopOrder) => o.status === 'cancelled' && o.paymentMethod === 'online' && o.paymentStatus === 'paid';
const storeName = (s: ShopProduct['store']) => (s && typeof s === 'object' ? s.name : '');

// ---------------- page ----------------

type Tab = 'orders' | 'products' | 'settings';

export default function StoreShop() {
  const [tab, setTab] = useState<Tab>('orders');
  const [overview, setOverview] = useState<Overview | null>(null);
  const loadOverview = () => shopApi.overview().then(setOverview).catch(() => undefined);
  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <StoreLayout description="Physical products creators sell — orders with Cash on Delivery or online payment, shipped by the creator.">
      {overview && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard index={0} label="New orders (to confirm)" value={overview.orders.placed.toLocaleString('en-IN')} icon={ShoppingBag} accent="orange" />
          <StatCard index={1} label="To ship / in transit" value={`${overview.orders.confirmed} / ${overview.orders.shipped}`} icon={Truck} accent="sky" />
          <StatCard index={2} label="Delivered sales" value={rupees(overview.delivered.sales)} icon={PackageCheck} accent="emerald" trend={{ value: `${overview.delivered.codOrders} COD · ${overview.delivered.onlineOrders} online`, positive: true }} />
          <StatCard index={3} label="Fanitt fees earned" value={rupees(overview.delivered.fees)} icon={IndianRupee} accent="pink" trend={{ value: `Last 30 days: ${overview.last30Days.orders} orders`, positive: true }} />
        </div>
      )}
      {overview && overview.refundPending > 0 && (
        <button type="button" onClick={() => setTab('orders')} className="mb-4 w-full rounded-xl bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
          {overview.refundPending} cancelled online order{overview.refundPending > 1 ? 's' : ''} still need a refund — filter "Refund pending" below.
        </button>
      )}

      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5 sm:w-fit">
        {(
          [
            ['orders', 'Orders', ShoppingBag],
            ['products', 'Products', Package],
            ['settings', 'Settings', Save],
          ] as const
        ).map(([key, text, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors sm:flex-none',
              tab === key ? 'bg-white text-orange-700 shadow-sm dark:bg-white/10 dark:text-orange-300' : 'text-gray-500 hover:text-gray-800 dark:text-white/50'
            )}
          >
            <Icon size={15} /> {text}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersTab onChanged={loadOverview} />}
      {tab === 'products' && <ProductsTab onChanged={loadOverview} />}
      {tab === 'settings' && <SettingsTab />}
    </StoreLayout>
  );
}

// ---------------- orders ----------------

type OrderFilter = 'all' | OrderStatus | 'refund';

function OrdersTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<OrderFilter>('all');
  const [method, setMethod] = useState<'all' | 'cod' | 'online'>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [openId, setOpenId] = useState<string | null>(null);
  const orders = usePagedList<ShopOrder>(
    (page) => shopApi.orders({ page, method, search: q, status: status === 'refund' ? undefined : status, refundPending: status === 'refund' ? 'true' : undefined }),
    [status, method, q]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Order no., buyer name / phone or store…" />
        <Select<OrderFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All orders' },
            { value: 'placed', label: 'New' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'refund', label: 'Refund pending' },
            { value: 'awaiting_payment', label: 'Awaiting payment' },
            { value: 'payment_failed', label: 'Payment failed' },
          ]}
        />
        <Select<'all' | 'cod' | 'online'>
          value={method}
          onChange={setMethod}
          options={[
            { value: 'all', label: 'COD + online' },
            { value: 'cod', label: 'Cash on Delivery' },
            { value: 'online', label: 'Online' },
          ]}
        />
      </div>
      <ErrorBanner message={orders.error} onClose={() => orders.setError('')} />

      {orders.loading ? (
        <Loading text="Loading orders…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{orders.total.toLocaleString('en-IN')} orders</p>
          <Card className="mt-2 overflow-x-auto p-0">
            {orders.items.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={ShoppingBag} message="No orders found." />
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-white/10 dark:text-white/40">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Buyer → Store</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {orders.items.map((o) => (
                    <tr key={o._id} className="cursor-pointer align-top text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/[0.03]" onClick={() => setOpenId(o._id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {o.items[0]?.imageUrl ? <img src={o.items[0].imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 dark:bg-white/5" />}
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-semibold text-gray-900 dark:text-white">
                              {o.items[0]?.title}
                              {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ''}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {o.orderNumber} · {dateTime(o.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p>
                          {o.address?.name} <span className="text-gray-400">{o.address?.city}</span>
                        </p>
                        <p className="text-gray-400">→ {o.store?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <b className="text-gray-900 dark:text-white">{rupees(o.total)}</b>
                        <p className="text-[11px] text-gray-400">{o.itemCount} item{o.itemCount === 1 ? '' : 's'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PayBadge o={o} />
                      </td>
                      <td className="px-4 py-3">
                        <Status s={o.status} />
                        {needsRefund(o) && <p className="mt-1 text-[11px] font-semibold text-rose-500">Refund pending</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline">
                          <Eye size={12} /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Pagination page={orders.page} pages={orders.pages} onPage={orders.goTo} />
        </>
      )}

      <OrderModal
        id={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          orders.reload();
          onChanged();
        }}
      />
    </>
  );
}

function OrderModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    setOrder(null);
    setError('');
    if (id) shopApi.order(id).then(setOrder).catch((e) => setError(getApiErrorMessage(e)));
  }, [id]);

  const refund = async () => {
    if (!order) return;
    setRefunding(true);
    setError('');
    try {
      await shopApi.retryRefund(order._id);
      setOrder(await shopApi.order(order._id));
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setRefunding(false);
    }
  };

  const a = order?.address;
  return (
    <>
      <Modal open={Boolean(id)} wide title={order ? `Order ${order.orderNumber}` : 'Order'} subtitle={order ? `${dateTime(order.createdAt)} · checkout ${order.checkoutId}` : undefined} onClose={onClose}>
        <ErrorBanner message={error} />
        {!order ? (
          !error && <Loading />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Status s={order.status} />
              <PayBadge o={order} />
              {needsRefund(order) && <Badge tone="rose">Refund pending</Badge>}
            </div>

            {/* items */}
            <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100 dark:divide-white/5 dark:ring-white/10">
              {order.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-white/5" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{it.title}</p>
                    <p className="text-xs text-gray-400">
                      {it.variantLabel ? `${it.variantName || 'Option'}: ${it.variantLabel} · ` : ''}
                      {rupees(it.price)} × {it.qty}
                    </p>
                  </div>
                  <b className="text-gray-900 dark:text-white">{rupees(it.price * it.qty)}</b>
                </div>
              ))}
              <div className="space-y-1 p-3 text-xs text-gray-500 dark:text-white/60">
                <Row k="Items" v={rupees(order.itemsTotal)} />
                <Row k="Delivery" v={order.deliveryCharge ? rupees(order.deliveryCharge) : 'Free'} />
                <Row k="Total" v={<b className="text-gray-900 dark:text-white">{rupees(order.total)}</b>} />
                {order.settledAt && <Row k={`Fanitt fee (${order.feePercent}%) · creator gets`} v={`${rupees(order.feeAmount)} · ${rupees(order.creatorEarning)}`} />}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Box title="Deliver to">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {a?.name} · {a?.phone}
                </p>
                <p>
                  {[a?.line1, a?.line2, a?.landmark].filter(Boolean).join(', ')}
                  <br />
                  {a?.city}, {a?.state} – {a?.pincode}
                </p>
                {(order.buyerEmail || order.buyerPhone) && (
                  <p className="mt-1 text-gray-400">
                    Account: {order.buyer?.name} {order.buyerEmail} {order.buyerPhone}
                  </p>
                )}
              </Box>
              <Box title="Seller & shipping">
                <p className="font-semibold text-gray-900 dark:text-white">{order.store?.name || '—'}</p>
                {order.courier || order.trackingId ? (
                  <p>
                    {order.courier} {order.trackingId && `· ${order.trackingId}`}
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="ml-1 text-orange-600 underline">
                        Track
                      </a>
                    )}
                  </p>
                ) : (
                  <p className="text-gray-400">No tracking added</p>
                )}
                {order.sellerNote && <p className="text-gray-400">Note: {order.sellerNote}</p>}
                {order.razorpayPaymentId && <p className="mt-1 text-gray-400">Payment {order.razorpayPaymentId}{order.razorpayRefundId && ` · refund ${order.razorpayRefundId}`}</p>}
              </Box>
            </div>

            {order.cancelReason && (
              <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-white/5 dark:text-white/60">
                Cancelled by {order.cancelledBy || '—'}: {order.cancelReason}
              </p>
            )}

            <Box title="Timeline">
              <ol className="space-y-1.5">
                {order.timeline.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    <span>
                      <b className="text-gray-800 dark:text-white/90">{STATUS_LABEL[t.status] || t.status}</b> · {dateTime(t.at)} · by {t.by}
                      {t.note && <span className="text-gray-400"> — {t.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Box>

            <div className="flex flex-wrap justify-end gap-2">
              {needsRefund(order) && (
                <Button variant="primary" onClick={refund} disabled={refunding}>
                  {refunding ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />} Retry refund {rupees(order.total)}
                </Button>
              )}
              {order.canCancel && (
                <Button variant="danger" onClick={() => setCancelling(true)}>
                  <Ban size={14} /> Cancel order
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ReasonModal
        open={cancelling}
        title={`Cancel ${order?.orderNumber || 'order'}`}
        hint={
          order?.paymentMethod === 'online' && order.paymentStatus === 'paid'
            ? 'Stock goes back, and Razorpay refunds the buyer in 5–7 working days. Buyer and creator are notified.'
            : 'Stock goes back. Buyer and creator are notified with this reason.'
        }
        presets={['Seller is not responding', 'Item not as described', 'Fake / suspicious order', 'Requested by the buyer']}
        confirmLabel="Cancel order"
        onClose={() => setCancelling(false)}
        onSubmit={async (reason) => {
          if (!order) return;
          await shopApi.cancelOrder(order._id, reason);
          setOrder(await shopApi.order(order._id));
          onChanged();
        }}
      />
    </>
  );
}

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-3">
    <span>{k}</span>
    <span>{v}</span>
  </div>
);

const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-white/5 dark:text-white/60">
    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{title}</p>
    {children}
  </div>
);

// ---------------- products ----------------

type ProductFilter = 'all' | ShopProduct['status'];

function ProductsTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<ProductFilter>('published');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [removing, setRemoving] = useState<ShopProduct | null>(null);
  const [error, setError] = useState('');
  const products = usePagedList<ShopProduct>((page) => shopApi.products({ page, status, search: q }), [status, q]);

  const restore = async (p: ShopProduct) => {
    try {
      await shopApi.restoreProduct(p._id);
      products.reload();
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Product title or store name…" />
        <Select<ProductFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'published', label: 'Live' },
            { value: 'all', label: 'All products' },
            { value: 'draft', label: 'Drafts' },
            { value: 'unpublished', label: 'Hidden by creator' },
            { value: 'removed', label: 'Removed by Fanitt' },
          ]}
        />
      </div>
      <ErrorBanner message={products.error || error} onClose={() => (products.setError(''), setError(''))} />

      {products.loading ? (
        <Loading text="Loading products…" />
      ) : (
        <>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40">{products.total.toLocaleString('en-IN')} products</p>
          {products.items.length === 0 ? (
            <Card className="mt-2">
              <EmptyState icon={Package} message="No products found." />
            </Card>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.items.map((p) => (
                <Card key={p._id} className="flex gap-3 p-3">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" /> : <div className="h-24 w-24 shrink-0 rounded-xl bg-gray-100 dark:bg-white/5" />}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-white">{p.title}</p>
                      <Status s={p.status} />
                    </div>
                    <p className="truncate text-xs text-gray-400">
                      {storeName(p.store) || '—'} · {p.category} · {p.images.length} photo{p.images.length === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-sm">
                      <b className="text-gray-900 dark:text-white">{rupees(p.price)}</b>
                      {p.mrp > p.price && <span className="ml-1.5 text-xs text-gray-400 line-through">{rupees(p.mrp)}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Stock {p.totalStock}
                      {p.variants.length > 0 && ` (${p.variants.map((v) => `${v.label}: ${v.stock}`).join(', ')})`} · {p.salesCount} sold · {p.views} views
                      {p.codAvailable ? ' · COD' : ''}
                    </p>
                    {p.removedReason && <p className="mt-1 text-[11px] text-rose-500">Removed: {p.removedReason}</p>}
                    <div className="mt-auto flex justify-end pt-2">
                      {p.status === 'removed' ? (
                        <Button size="sm" variant="outline" onClick={() => restore(p)}>
                          <RotateCcw size={12} /> Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRemoving(p)}>
                          <Ban size={12} /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <Pagination page={products.page} pages={products.pages} onPage={products.goTo} />
        </>
      )}

      <ReasonModal
        open={Boolean(removing)}
        title={`Remove "${removing?.title || ''}"`}
        hint="Buyers stop seeing it at once. The creator is notified with this reason. Orders already placed are not affected."
        presets={['Counterfeit / fake brand', 'Prohibited item', 'Misleading photos or description', 'Copyright / trademark complaint']}
        confirmLabel="Remove"
        onClose={() => setRemoving(null)}
        onSubmit={async (reason) => {
          if (!removing) return;
          await shopApi.removeProduct(removing._id, reason);
          products.reload();
          onChanged();
        }}
      />
    </>
  );
}

// ---------------- settings ----------------

function SettingsTab() {
  const [form, setForm] = useState<ShopSettings | null>(null);
  const [codMax, setCodMax] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    shopApi
      .settings()
      .then((s) => {
        setForm(s);
        setCodMax(s.shopCodMaxAmount ? String(s.shopCodMaxAmount / 100) : '');
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  if (!form) return error ? <ErrorBanner message={error} /> : <Loading />;

  const set = (patch: Partial<ShopSettings>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const rupeesValue = Number(codMax || 0);
      if (!Number.isFinite(rupeesValue) || rupeesValue < 0) throw new Error('Enter a valid COD limit');
      const next = await shopApi.saveSettings({ ...form, shopCodMaxAmount: Math.round(rupeesValue * 100) });
      setForm(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error && !('isAxiosError' in e) ? e.message : getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="max-w-2xl space-y-5">
      <Toggle label="Shop is open" hint="Off: buyers can browse but can't place new orders." value={form.shopEnabled} onChange={(v) => set({ shopEnabled: v })} />
      <Toggle label="Cash on Delivery" hint="The creator collects the cash; Fanitt's fee is taken from their wallet on delivery." value={form.shopCodEnabled} onChange={(v) => set({ shopCodEnabled: v })} />
      <Toggle label="Online payment (Razorpay)" hint="Money is held by Fanitt and credited to the creator's wallet when the order is delivered." value={form.shopOnlineEnabled} onChange={(v) => set({ shopOnlineEnabled: v })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-gray-800 dark:text-white/90">Fanitt fee (%)</span>
          <input type="number" min={0} max={50} step={0.5} value={form.shopFeePercent} onChange={(e) => set({ shopFeePercent: Number(e.target.value) })} className={cn(inputClasses, 'mt-1.5')} />
          <span className="mt-1 block text-[11px] text-gray-400">On the items total — delivery charge is not charged.</span>
        </label>
        <label className="block">
          <span className="text-sm font-bold text-gray-800 dark:text-white/90">COD limit per order (₹)</span>
          <input
            type="number"
            min={0}
            value={codMax}
            onChange={(e) => {
              setSaved(false);
              setCodMax(e.target.value);
            }}
            placeholder="0 = no limit"
            className={cn(inputClasses, 'mt-1.5')}
          />
          <span className="mt-1 block text-[11px] text-gray-400">Orders above this must be paid online. Empty or 0 = no limit.</span>
        </label>
      </div>

      <ErrorBanner message={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-emerald-600">Saved ✓</span>}
        <Button onClick={save} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save settings
        </Button>
      </div>
    </Card>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-gray-800 dark:text-white/90">{label}</p>
        <p className="text-xs text-gray-400">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', value ? 'bg-orange-500' : 'bg-gray-300 dark:bg-white/15')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}
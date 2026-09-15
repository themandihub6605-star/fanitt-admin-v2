import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Ban,
  RotateCcw,
  Star,
  Users2,
  Wallet,
  Hash,
  FileText,
  ExternalLink,
  ImageOff,
} from 'lucide-react';
import { adminApi, type UserDetail } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { Card, Badge, Button, StatCard, EmptyState } from '@/components/AdminUI';

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function humanizeKey(k: string) {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?)(\?|$)/i;

function isUrlString(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//i.test(v);
}
function isImageUrl(v: string) {
  return IMAGE_EXT.test(v) || v.includes('/image/upload/'); // Cloudinary image delivery URLs
}
function isDocUrl(v: string) {
  return DOC_EXT.test(v) || v.includes('/raw/upload/');
}

/** Renders one uploaded file/link — an image thumbnail you can open
 * full-size, or a document chip for anything else (PDF, KYC scan,
 * etc). This is what makes uploaded documents actually visible
 * instead of silently vanishing. */
function FilePreview({ url, label }: { url: string; label?: string }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-gray-100 dark:border-white/10">
        <img src={url} alt={label || 'Uploaded file'} className="h-28 w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
          <ExternalLink size={16} className="text-white" />
        </span>
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
    >
      <FileText size={14} className="shrink-0 text-orange-500" />
      <span className="truncate">{label || (isDocUrl(url) ? 'Document' : 'Link')}</span>
      <ExternalLink size={12} className="ml-auto shrink-0 text-gray-400" />
    </a>
  );
}

/** Renders one field of a role profile (Creator/Brand/Agency) whatever
 * shape it turns out to be — a plain value, a single uploaded file, a
 * gallery of images/posts, a list of objects (e.g. posts, portfolio
 * items), or a nested sub-object — instead of the old renderer, which
 * silently dropped anything that wasn't a primitive. Depth is capped
 * at one level of nesting so this can't recurse into something huge. */
function ProfileField({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === '') return null;

  // Single uploaded file / link
  if (isUrlString(value)) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">{label}</p>
        <div className="max-w-xs">
          <FilePreview url={value} label={label} />
        </div>
      </div>
    );
  }

  // Array of files/links -> gallery grid
  if (Array.isArray(value) && value.every(isUrlString)) {
    if (value.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
          {label} <span className="text-gray-300 dark:text-white/20">({value.length})</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <FilePreview key={i} url={url} label={`${label} ${i + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  // Array of objects -> list of mini cards (e.g. posts, past campaigns)
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">
          {label} <span className="text-gray-300 dark:text-white/20">({value.length})</span>
        </p>
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3 dark:border-white/10">
              {typeof item === 'object' && item !== null ? (
                <div className="space-y-1.5">
                  {Object.entries(item as Record<string, unknown>)
                    .filter(([k]) => !['_id', '__v'].includes(k))
                    .map(([k, v]) => (
                      <ProfileField key={k} label={humanizeKey(k)} value={v} depth={depth + 1} />
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-white/80">{String(item)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nested plain object -> one level of sub-fields (e.g. socialLinks)
  if (typeof value === 'object' && depth < 2) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => !['_id', '__v'].includes(k) && v !== null && v !== '');
    if (entries.length === 0) return null;
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">{label}</p>
        <div className="space-y-1 rounded-xl border border-gray-100 p-3 dark:border-white/10">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-400 dark:text-white/40">{humanizeKey(k)}</span>
              {isUrlString(v) ? (
                <a href={v} target="_blank" rel="noreferrer" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">
                  Open
                </a>
              ) : (
                <span className="font-semibold text-gray-800 dark:text-white/80">{String(v)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Plain primitive
  if (depth === 0) {
    return (
      <div className="flex justify-between border-b border-gray-100 py-2 text-sm dark:border-white/5">
        <span className="text-gray-400 dark:text-white/40">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-white/80">{String(value)}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400 dark:text-white/40">{label}</span>
      <span className="font-semibold text-gray-800 dark:text-white/80">{String(value)}</span>
    </div>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    adminApi
      .getUserDetail(id)
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleToggleSuspend = async () => {
    if (!data || !id) return;
    setActing(true);
    try {
      if (data.user.isSuspended) {
        await adminApi.reinstateUser(id);
      } else {
        const reason = window.prompt('Reason for suspension (optional):') || '';
        await adminApi.suspendUser(id, reason);
      }
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-400 dark:text-white/40">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading user...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={28} className="text-rose-500" />
        <p className="text-sm text-gray-500 dark:text-white/50">{error || "Couldn't load this user"}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
          <ArrowLeft size={14} /> Back to Users
        </Button>
      </div>
    );
  }

  const { user, roleProfile, transactions, reviews, referredCount } = data;

  // Split the role profile into simple fields (rendered as a compact
  // two-column key/value grid, same as before) vs structured fields
  // (files, galleries, arrays, nested objects — rendered full-width
  // with the new ProfileField renderer above). Nothing gets dropped.
  const roleEntries = roleProfile
    ? Object.entries(roleProfile).filter(([k, v]) => !['_id', '__v', 'user'].includes(k) && v !== null && v !== '')
    : [];
  const simpleEntries = roleEntries.filter(([, v]) => typeof v !== 'object');
  const structuredEntries = roleEntries.filter(([, v]) => typeof v === 'object');

  return (
    <div className="pb-16">
      <button
        onClick={() => navigate('/users')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80"
      >
        <ArrowLeft size={15} /> Back to Users
      </button>

      {/* Profile header — brand-gradient banner behind the avatar,
          matching the rest of the redesigned panel instead of the old
          flat navy card. */}
      <Card className="relative mt-4 overflow-hidden">
        <div className="h-20 bg-brand-gradient sm:h-24" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex flex-col items-center gap-4 sm:-mt-8 sm:flex-row">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-md dark:border-[#171B26]" />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-gradient text-2xl font-extrabold text-white shadow-md dark:border-[#171B26]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="text-center sm:text-left">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-sm text-gray-500 dark:text-white/50">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge tone="orange" className="capitalize">{user.role}</Badge>
                <Badge tone={user.isSuspended ? 'rose' : 'emerald'}>{user.isSuspended ? 'Suspended' : 'Active'}</Badge>
                {user.phone && <span className="text-xs font-medium text-gray-400 dark:text-white/40">{user.phone}</span>}
              </div>
            </div>
          </div>

          <Button
            variant={user.isSuspended ? 'outline' : 'danger'}
            size="sm"
            onClick={handleToggleSuspend}
            disabled={acting}
            className="shrink-0"
          >
            {acting ? <Loader2 size={14} className="animate-spin" /> : user.isSuspended ? <RotateCcw size={14} /> : <Ban size={14} />}
            {user.isSuspended ? 'Reinstate' : 'Suspend'}
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Wallet balance" value={formatRupees(user.walletBalance || 0)} icon={Wallet} accent="emerald" />
        <StatCard label="People referred" value={referredCount} icon={Users2} accent="orange" />
        <StatCard label="Reviews received" value={reviews.length} icon={Star} accent="amber" />
        <StatCard label="Referral code" value={user.referralCode || '—'} icon={Hash} accent="pink" />
      </div>

      {roleProfile === null && (
        <Card className="mt-4 flex items-center gap-3 p-4 text-sm text-gray-400 dark:text-white/40">
          <AlertCircle size={16} className="shrink-0 text-amber-500" />
          The <span className="mx-1 font-mono text-xs">/admin/users/{id}</span> response returned <span className="mx-1 font-mono text-xs">roleProfile: null</span> for
          this user — that's a backend response, not a display issue. Check that endpoint's response in your browser's Network tab to confirm.
        </Card>
      )}

      {roleProfile && (simpleEntries.length > 0 || structuredEntries.length > 0) && (
        <Card className="mt-4 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40 capitalize">{user.role} Profile</h2>

          {simpleEntries.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {simpleEntries.map(([k, v]) => (
                <ProfileField key={k} label={humanizeKey(k)} value={v} />
              ))}
            </div>
          )}

          {/* Everything structured — posts, portfolio images, KYC/verification
              documents, social links, and any other array/object field the
              backend sends — rendered here instead of being silently dropped. */}
          {structuredEntries.length > 0 && (
            <div className="mt-5 space-y-5 border-t border-gray-100 pt-5 dark:border-white/10">
              {structuredEntries.map(([k, v]) => (
                <ProfileField key={k} label={humanizeKey(k)} value={v} />
              ))}
            </div>
          )}
        </Card>
      )}

      {roleProfile && structuredEntries.length === 0 && (
        <Card className="mt-4 flex items-center gap-3 p-4 text-sm text-gray-400 dark:text-white/40">
          <ImageOff size={16} className="shrink-0" />
          This user's role profile has no posts, portfolio media, or uploaded documents on it yet.
        </Card>
      )}

      <Card className="mt-4 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <EmptyState icon={Wallet} message="No transactions yet." />
        ) : (
          <div className="mt-2 divide-y divide-gray-100 dark:divide-white/5">
            {transactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="capitalize text-gray-600 dark:text-white/70">{t.type.replace(/_/g, ' ')}</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatRupees(t.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40">Reviews Received</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={Star} message="No reviews yet." />
        ) : (
          <div className="mt-3 space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="border-b border-gray-100 pb-3 text-sm dark:border-white/5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={cn(i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-white/15')} />
                  ))}
                  <span className="ml-2 text-xs text-gray-400 dark:text-white/40">from {r.fromUser?.name || 'Someone'}</span>
                </div>
                {r.comment && <p className="mt-1 text-gray-700 dark:text-white/70">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Search, Ban, RotateCcw, ChevronLeft, ChevronRight, Users2 } from 'lucide-react';
import { adminApi, type AdminUser } from '@/services/adminApi';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, Badge, Button, EmptyState } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

const ROLES = ['', 'fan', 'creator', 'brand', 'agency', 'admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listUsers({ search: search || undefined, role: role || undefined, page, limit: 25 })
      .then((d) => {
        setUsers(d.users);
        setPages(d.pages);
        setTotal(d.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, page]);

  const handleToggleSuspend = async (u: AdminUser, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActingOn(u._id);
    try {
      if (u.isSuspended) {
        const updated = await adminApi.reinstateUser(u._id);
        setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
      } else {
        const reason = window.prompt('Reason for suspension (optional):') || '';
        const updated = await adminApi.suspendUser(u._id, reason);
        setUsers((prev) => prev.map((x) => (x._id === u._id ? updated : x)));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <PageHeader title="Users" description={`Every account on the platform — ${total.toLocaleString('en-IN')} total. Click a row for full details.`} />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-orange-500/20"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All roles'}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Users2} message="No users found." />
        </div>
      ) : (
        <>
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-400 dark:border-white/5 dark:bg-white/[0.02] dark:text-white/40">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {users.map((u) => (
                    <tr key={u._id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <Link to={`/users/${u._id}`} className="flex items-center gap-2.5">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-600 text-[10px] font-bold text-white">
                              {u.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/60">
                        <Link to={`/users/${u._id}`} className="block">
                          {u.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-500 dark:text-white/60">
                        <Link to={`/users/${u._id}`} className="block">
                          {u.role}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/users/${u._id}`} className="block">
                          <Badge tone={u.isSuspended ? 'rose' : 'emerald'}>{u.isSuspended ? 'Suspended' : 'Active'}</Badge>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant={u.isSuspended ? 'outline' : 'danger'}
                          onClick={(e) => handleToggleSuspend(u, e)}
                          disabled={actingOn === u._id}
                        >
                          {actingOn === u._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : u.isSuspended ? (
                            <RotateCcw size={12} />
                          ) : (
                            <Ban size={12} />
                          )}
                          {u.isSuspended ? 'Reinstate' : 'Suspend'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-white/40">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={14} /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
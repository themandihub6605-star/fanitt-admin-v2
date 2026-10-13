import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, LogIn } from '@/icons';
import { monitorApi, isMissingMonitor, type AuditLog, type AuthEvent } from '@/services/monitorApi';
import { Badge, Card, CardHeader, LoadingState, fmt } from '@/components/AdminUI';

/** On a user's page: their recent sign-ins and every admin change made to their account. */
export function UserActivityPanel({ userId }: { userId: string }) {
  const [logins, setLogins] = useState<AuthEvent[] | null>(null);
  const [audit, setAudit] = useState<AuditLog[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setLogins(null);
    setAudit(null);
    monitorApi
      .authEvents({ user: userId, days: 90, limit: 8 })
      .then((r) => alive && setLogins(r.items))
      .catch((e) => {
        if (!alive) return;
        if (isMissingMonitor(e)) setMissing(true);
        setLogins([]);
      });
    monitorApi
      .auditLogs({ targetId: userId, days: 365, limit: 8 })
      .then((r) => alive && setAudit(r.items))
      .catch(() => alive && setAudit([]));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (missing) return null; // backend without tracking — nothing to show

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Recent sign-ins" description="Last 90 days" icon={LogIn} actions={<Link to="/activity?tab=logins" className="text-xs font-semibold text-orange-600 hover:underline">All logins</Link>} />
        {logins === null ? (
          <LoadingState rows={3} />
        ) : logins.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No sign-ins recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {logins.map((e) => (
              <li key={e._id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                {e.success ? <Badge tone="emerald" dot>Signed in</Badge> : <Badge tone="rose" dot>Failed</Badge>}
                <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-white/65">
                  {fmt.label(e.action)} · {fmt.label(e.client || 'unknown')}
                  {e.ip ? ` · ${e.ip}` : ''}
                </span>
                <span className="shrink-0 text-xs text-gray-400" title={fmt.dateTime(e.createdAt)}>
                  {fmt.ago(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title="Admin changes to this account" description="Who changed what, and when" icon={History} actions={<Link to="/activity?tab=audit" className="text-xs font-semibold text-orange-600 hover:underline">Audit log</Link>} />
        {audit === null ? (
          <LoadingState rows={3} />
        ) : audit.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">No admin changes recorded for this account.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {audit.map((a) => (
              <li key={a._id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-gray-800 dark:text-white/85">{a.message || `${a.method} ${a.path.replace('/api', '')}`}</span>
                  <span className="block truncate text-xs text-gray-400">by {a.actorName || 'an admin'}</span>
                </span>
                {!a.success && <Badge tone="rose">Failed</Badge>}
                <span className="shrink-0 text-xs text-gray-400" title={fmt.dateTime(a.createdAt)}>
                  {fmt.ago(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

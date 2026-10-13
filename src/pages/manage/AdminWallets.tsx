import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from '@/icons';
import { DataTable, PageHeader, SearchInput, Select, fmt, type Column } from '@/components/AdminUI';
import { manageApi, type WalletRow } from '@/services/manageApi';
import { MissingBackend, StatStrip, UserCell, usePaged, useSearch } from './shared';

export default function AdminWallets() {
  const [role, setRole] = useState('');
  const { term, setTerm, search } = useSearch();
  const { data, rows, loading, error, missing, setPage, reload } = usePaged(manageApi.wallets, { role, search });
  const s = data?.summary;

  const columns: Column<WalletRow>[] = [
    { key: 'user', header: 'User', value: (r) => r.name, render: (r) => <UserCell user={r} sub={`${r.email ?? ''} · ${fmt.label(r.role ?? '')}`} /> },
    { key: 'balance', header: 'Wallet balance (₹)', align: 'right', value: (r) => r.walletBalance / 100, render: (r) => <span className="font-bold text-gray-950 dark:text-white">{fmt.rupees(r.walletBalance)}</span> },
    { key: 'pending', header: 'Withdrawal waiting (₹)', align: 'right', value: (r) => r.withdrawals.pending / 100, render: (r) => (r.withdrawals.pending ? <Link to="/withdrawals" className="font-semibold text-amber-600 hover:underline">{fmt.rupees(r.withdrawals.pending)}</Link> : <span className="text-gray-300">—</span>) },
    { key: 'paid', header: 'Paid out so far (₹)', align: 'right', value: (r) => r.withdrawals.paid / 100, hideOnMobile: true, render: (r) => <span className="text-gray-600 dark:text-white/65">{r.withdrawals.paid ? fmt.rupees(r.withdrawals.paid) : '—'}</span> },
    { key: 'since', header: 'Member since', value: (r) => r.createdAt, hideOnMobile: true, render: (r) => <span className="text-xs text-gray-500">{fmt.date(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader icon={Wallet} eyebrow="Finance" title="Wallets" description="Money sitting in users’ Fanitt wallets — what Fanitt owes and could be asked to pay out." />
      <MissingBackend show={missing} />
      <StatStrip
        items={[
          { label: 'Total in wallets', value: fmt.rupeesCompact(s?.totalBalance), tone: 'violet', hint: 'Owed to users' },
          { label: 'Users with a balance', value: fmt.number(s?.holders), tone: 'sky' },
          { label: 'Withdrawals waiting', value: fmt.rupeesCompact(s?.pendingWithdrawals), tone: 'amber', hint: 'Requested, not paid yet' },
          { label: 'Average balance', value: s?.holders ? fmt.rupeesCompact((s.totalBalance ?? 0) / s.holders) : '—', tone: 'gray' },
        ]}
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon={Wallet}
        emptyMessage="No one has money in their wallet."
        exportName="wallets"
        serverPaging={data ? { page: data.page, pages: data.pages, total: data.total, onPage: setPage } : undefined}
        toolbar={
          <>
            <SearchInput value={term} onChange={setTerm} placeholder="Search name or email…" />
            <Select
              label="Role"
              value={role}
              onChange={setRole}
              options={[
                { value: '', label: 'Everyone' },
                { value: 'creator', label: 'Creators' },
                { value: 'brand', label: 'Brands' },
                { value: 'fan', label: 'Fans' },
                { value: 'agency', label: 'Agencies' },
              ]}
            />
          </>
        }
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Check, X, Building2, MapPin, Phone, KeyRound, Copy, CheckCheck, Plus } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import type { ApiAgency } from '@/types/agency';
import { getApiErrorMessage } from '@/services/apiClient';
import { PageHeader, Card, TabGroup, Tab, Button, EmptyState } from '@/components/AdminUI';

const TABS = [
  { key: 'unverified', label: 'Unverified' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const;

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass + '!';
}

function CreateAgencyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (creds: { email: string; password: string }) => void }) {
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!agencyName.trim() || !email.trim() || password.length < 8) {
      setError('Agency name, email, and an 8+ character password are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await adminApi.createAgency({
        agencyName: agencyName.trim(),
        ownerName: ownerName.trim() || undefined,
        email: email.trim(),
        password,
        mobile: mobile.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        commissionPercent: commissionPercent ? Number(commissionPercent) : undefined,
      });
      onCreated({ email: result.user.email, password });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#171B26]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Agency Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-white/50 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-white/50">
          Provisions the account directly — no approval step needed since it's admin-created. Share the credentials below with the agency afterward.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Agency name *" className={inputClass} />
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner name (optional)" className={inputClass} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" className={inputClass} />
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={`flex-1 font-mono ${inputClass}`} />
            <Button variant="outline" size="sm" type="button" onClick={() => setPassword(generatePassword())}>
              Regenerate
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" className={inputClass} />
            <input value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} placeholder="Commission %" type="number" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputClass} />
          </div>
        </div>

        <Button className="mt-5 w-full justify-center" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Agency'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminAgencyApprovals() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('unverified');
  const [agencies, setAgencies] = useState<ApiAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [passwordFormFor, setPasswordFormFor] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [issuedCredentials, setIssuedCredentials] = useState<{ id: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .listAgencies(tab)
      .then(setAgencies)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const handleDecision = async (id: string, decision: 'verified' | 'rejected') => {
    setActingOn(id);
    try {
      await adminApi.verifyAgency(id, decision);
      setAgencies((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const openPasswordForm = (agencyId: string) => {
    setIssuedCredentials(null);
    setPasswordInput(generatePassword());
    setPasswordFormFor(agencyId);
  };

  const handleSetPassword = async (agency: ApiAgency) => {
    if (passwordInput.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setActingOn(agency._id);
    setError('');
    try {
      const result = await adminApi.setAgencyPassword(agency._id, passwordInput);
      setIssuedCredentials({ id: agency._id, email: result.email, password: result.password });
      setPasswordFormFor(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActingOn(null);
    }
  };

  const copyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}\nLogin at: [your Agency Panel URL]`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Agency Approval"
        description="Review agency registration requests. Once approved, set a login password so they can access the separate Agency Panel."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Create Agency
          </Button>
        }
      />

      <TabGroup>
        {TABS.map((t) => (
          <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Tab>
        ))}
      </TabGroup>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-gray-400 dark:text-white/40">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Loading agencies...</p>
        </div>
      )}

      {!loading && agencies.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={Building2} message={`No ${tab} agencies right now.`} />
        </div>
      )}

      {!loading && agencies.length > 0 && (
        <div className="mt-6 space-y-3">
          {agencies.map((agency) => (
            <Card key={agency._id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                    <Building2 size={18} />
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{agency.agencyName}</p>
                    <p className="text-sm text-gray-500 dark:text-white/50">Owner: {agency.ownerName || agency.user?.name || 'Unknown'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-white/40">
                      {agency.user?.email && <span>{agency.user.email}</span>}
                      {agency.mobile && (
                        <span className="flex items-center gap-1"><Phone size={11} /> {agency.mobile}</span>
                      )}
                      {agency.city && (
                        <span className="flex items-center gap-1"><MapPin size={11} /> {agency.city}{agency.state ? `, ${agency.state}` : ''}</span>
                      )}
                      {agency.documentUrl && (
                        <a href={agency.documentUrl} target="_blank" rel="noreferrer" className="text-orange-500 underline hover:text-orange-600 dark:text-orange-400">
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {tab === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleDecision(agency._id, 'verified')} disabled={actingOn === agency._id} className="!bg-emerald-600 !shadow-emerald-600/25 hover:!bg-emerald-700">
                      {actingOn === agency._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDecision(agency._id, 'rejected')} disabled={actingOn === agency._id}>
                      <X size={14} /> Reject
                    </Button>
                  </div>
                )}

                {tab === 'verified' && passwordFormFor !== agency._id && issuedCredentials?.id !== agency._id && (
                  <Button variant="outline" size="sm" onClick={() => openPasswordForm(agency._id)}>
                    <KeyRound size={14} /> Set Agency Panel Password
                  </Button>
                )}
              </div>

              {tab === 'verified' && passwordFormFor === agency._id && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <input
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <Button variant="outline" size="sm" type="button" onClick={() => setPasswordInput(generatePassword())}>
                    Regenerate
                  </Button>
                  <Button size="sm" onClick={() => handleSetPassword(agency)} disabled={actingOn === agency._id}>
                    {actingOn === agency._id ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                  </Button>
                  <button onClick={() => setPasswordFormFor(null)} className="text-xs font-semibold text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/70">
                    Cancel
                  </button>
                </div>
              )}

              {issuedCredentials?.id === agency._id && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Password set — share these with the agency:</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-white/80">
                    Email: <span className="font-mono">{issuedCredentials.email}</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-white/80">
                    Password: <span className="font-mono">{issuedCredentials.password}</span>
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => copyCredentials(issuedCredentials.email, issuedCredentials.password)}>
                    {copied ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy Credentials'}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateAgencyModal
          onClose={() => setCreateOpen(false)}
          onCreated={(creds) => {
            setCreateOpen(false);
            setCreatedCreds(creds);
            load();
          }}
        />
      )}

      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCreatedCreds(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-6 dark:border-emerald-500/30 dark:bg-[#171B26]">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Agency created — share these credentials:</p>
            <p className="mt-3 text-sm text-gray-700 dark:text-white/80">
              Email: <span className="font-mono">{createdCreds.email}</span>
            </p>
            <p className="text-sm text-gray-700 dark:text-white/80">
              Password: <span className="font-mono">{createdCreds.password}</span>
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full justify-center"
              onClick={() => navigator.clipboard.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`)}
            >
              <Copy size={13} /> Copy Credentials
            </Button>
            <button onClick={() => setCreatedCreds(null)} className="mt-2 w-full text-center text-xs font-semibold text-gray-400 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/70">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, ShieldOff } from '@/icons';
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/AdminUI';

/** Every route in this app requires an authenticated user with role
 * 'admin'. The backend checks the role again on every /admin request, so
 * this gate is only about showing the right screen. */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, user, hasHydrated } = useAppSelector((s) => s.auth);
  const { logout } = useAuth();
  const location = useLocation();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
          <ShieldOff size={22} />
        </span>
        <h1 className="text-lg font-semibold text-gray-950 dark:text-white">Not authorized</h1>
        <p className="max-w-sm text-sm text-gray-500 dark:text-white/50">This account ({user.email}) doesn’t have admin access. Sign in with an admin account instead.</p>
        <Button variant="outline" onClick={logout}>
          Sign in with another account
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

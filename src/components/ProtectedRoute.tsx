import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

/** Every route in this app requires an authenticated user with role
 * 'admin' — there's no public area, so this gate is simpler than the main
 * site's (no allowedRoles prop needed, it's always just "admin or bounce"). */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, user, hasHydrated } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!hasHydrated) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A0A0A] px-6 text-center">
        <h1 className="text-xl font-bold text-white">Not authorized</h1>
        <p className="max-w-sm text-sm text-white/50">
          This account ({user.email}) doesn't have admin access. Sign in with an admin account instead.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

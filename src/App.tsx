// File: src/App.tsx  (fanitt-admin)
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials, setHydrated } from '@/store/slices/authSlice';
import { authApi } from '@/services/authApi';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ThemeProvider } from '@/context/ThemeContext';
import { ConfirmHost, ToastHost, EmptyState, Button, LoadingState } from '@/components/AdminUI';
import { Compass } from '@/icons';
import Login from '@/pages/Login';
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/AdminUsers'));
const AdminVerifications = lazy(() => import('@/pages/AdminVerifications'));
const AdminAgencies = lazy(() => import('@/pages/AdminAgencies'));
const AdminReferralConfig = lazy(() => import('@/pages/AdminReferralConfig'));
const AdminEscrowDisputes = lazy(() => import('@/pages/AdminEscrowDisputes'));
const AdminTransactions = lazy(() => import('@/pages/AdminTransactions'));
const AdminCategories = lazy(() => import('@/pages/AdminCategories'));
const AdminReviews = lazy(() => import('@/pages/manage/AdminReviews'));
const AdminStories = lazy(() => import('@/pages/manage/AdminStories'));
const AdminGifts = lazy(() => import('@/pages/manage/AdminGifts'));
const AdminSessions = lazy(() => import('@/pages/manage/AdminSessions'));
const AdminApplications = lazy(() => import('@/pages/manage/AdminApplications'));
const AdminWallets = lazy(() => import('@/pages/manage/AdminWallets'));
const AdminCommunityContent = lazy(() => import('@/pages/manage/AdminCommunityContent'));
const AdminLegal = lazy(() => import('@/pages/manage/AdminLegal'));
const AdminWithdrawals = lazy(() => import('@/pages/AdminWithdrawals'));
const AdminBroadcast = lazy(() => import('@/pages/AdminBroadcast'));
const AdminSiteSettings = lazy(() => import('@/pages/AdminSiteSettings'));
const AdminUserDetail = lazy(() => import('@/pages/AdminUserDetail'));
const AdminAdmins = lazy(() => import('@/pages/AdminAdmins'));
const AdminChangePassword = lazy(() => import('@/pages/AdminChangePassword'));
const AdminSubscriptionPlans = lazy(() => import('@/pages/AdminSubscriptionPlans'));
const AdminMilestones = lazy(() => import('@/pages/AdminMilestones'));
const AdminCommunities = lazy(() => import('@/pages/AdminCommunities'));
const AdminPosts = lazy(() => import('@/pages/AdminPosts'));
const AdminCampaigns = lazy(() => import('@/pages/AdminCampaigns'));
const AdminHomeLayout = lazy(() => import('@/pages/AdminHomeLayout'));
const AdminMeets = lazy(() => import('@/pages/AdminMeets'));
const AdminAppAnalytics = lazy(() => import('@/pages/AdminAppAnalytics'));
const AdminAccountDeletions = lazy(() => import('@/pages/AdminAccountDeletions'));
const AdminContactMessages = lazy(() => import('@/pages/AdminContactMessages'));
const AdminHomeBanners = lazy(() => import('@/pages/AdminHomeBanners'));
const AdminActivity = lazy(() => import('@/pages/AdminActivity'));
const AdminLeaderboards = lazy(() => import('@/pages/insights/AdminLeaderboards'));
const AdminFinance = lazy(() => import('@/pages/insights/AdminFinance'));
const AdminContent = lazy(() => import('@/pages/insights/AdminContent'));
const AdminGrowth = lazy(() => import('@/pages/insights/AdminGrowth'));
const AdminSystem = lazy(() => import('@/pages/AdminSystem'));
// Fanitt Store
const StoreOverview = lazy(() => import('@/FanittStore/pages/StoreOverview'));
const StoreStores = lazy(() => import('@/FanittStore/pages/StoreStores'));
const StoreProducts = lazy(() => import('@/FanittStore/pages/StoreProducts'));
const StoreOrders = lazy(() => import('@/FanittStore/pages/StoreOrders'));
const StoreLives = lazy(() => import('@/FanittStore/pages/StoreLives'));
const StoreCalls = lazy(() => import('@/FanittStore/pages/StoreCalls'));
const StoreAffiliate = lazy(() => import('@/FanittStore/pages/StoreAffiliate'));
const StoreFanbox = lazy(() => import('@/FanittStore/pages/StoreFanbox'));
const StoreSettings = lazy(() => import('@/FanittStore/pages/StoreSettings'));
const StoreShop = lazy(() => import('@/FanittStore/pages/StoreShop'));

function useAuthHydration() {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (accessToken) {
        try {
          const user = await authApi.getMe();
          if (!cancelled) dispatch(setCredentials({ user, accessToken }));
        } catch {
          // token invalid/expired — interceptor already logs out on 401
        }
      }
      if (!cancelled) dispatch(setHydrated());
    }
    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * The page for the current route. It just fades in — there is deliberately
 * no exit animation: waiting for the old page to animate out (AnimatePresence
 * mode="wait") could get stuck on some pages (e.g. after the Store pages),
 * leaving the old page on screen until a manual refresh.
 */
function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <motion.div key={location.pathname} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
      {/* Each page is its own small file, loaded the first time you open it. */}
      <Suspense fallback={<LoadingState />}>{outlet}</Suspense>
    </motion.div>
  );
}

function Shell() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <AnimatedOutlet />
      </AdminLayout>
    </ProtectedRoute>
  );
}

function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      message="This address doesn’t match any page in the admin panel. Use the menu or press Ctrl K to search."
      action={
        <Link to="/">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

function AppRoutes() {
  useAuthHydration();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Every admin page shares one layout; only the page area animates. */}
      <Route element={<Shell />}>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/users/:id" element={<AdminUserDetail />} />
        <Route path="/verifications" element={<AdminVerifications />} />
        <Route path="/agencies" element={<AdminAgencies />} />
        <Route path="/referral-config" element={<AdminReferralConfig />} />
        <Route path="/escrow-disputes" element={<AdminEscrowDisputes />} />
        <Route path="/transactions" element={<AdminTransactions />} />
        <Route path="/categories" element={<AdminCategories />} />
        <Route path="/moderation" element={<Navigate to="/reviews" replace />} />
        <Route path="/reviews" element={<AdminReviews />} />
        <Route path="/stories" element={<AdminStories />} />
        <Route path="/gifts" element={<AdminGifts />} />
        <Route path="/sessions" element={<AdminSessions />} />
        <Route path="/applications" element={<AdminApplications />} />
        <Route path="/wallets" element={<AdminWallets />} />
        <Route path="/community-content" element={<AdminCommunityContent />} />
        <Route path="/legal" element={<AdminLegal />} />
        <Route path="/withdrawals" element={<AdminWithdrawals />} />
        <Route path="/broadcast" element={<AdminBroadcast />} />
        <Route path="/settings" element={<AdminSiteSettings />} />
        <Route path="/admins" element={<AdminAdmins />} />
        <Route path="/change-password" element={<AdminChangePassword />} />
        <Route path="/subscription-plans" element={<AdminSubscriptionPlans />} />
        <Route path="/milestones" element={<AdminMilestones />} />
        <Route path="/communities" element={<AdminCommunities />} />
        <Route path="/posts" element={<AdminPosts />} />
        <Route path="/campaigns" element={<AdminCampaigns />} />
        <Route path="/home-layout" element={<AdminHomeLayout />} />
        <Route path="/live-sessions" element={<AdminMeets />} />
        <Route path="/home-banners" element={<AdminHomeBanners />} />
        <Route path="/account-deletions" element={<AdminAccountDeletions />} />
        <Route path="/contact-messages" element={<AdminContactMessages />} />
        <Route path="/app-analytics" element={<AdminAppAnalytics />} />
        <Route path="/activity" element={<AdminActivity />} />
        <Route path="/insights/leaderboards" element={<AdminLeaderboards />} />
        <Route path="/insights/finance" element={<AdminFinance />} />
        <Route path="/insights/content" element={<AdminContent />} />
        <Route path="/insights/growth" element={<AdminGrowth />} />
        <Route path="/system" element={<AdminSystem />} />
        {/* Fanitt Store */}
        <Route path="/store" element={<StoreOverview />} />
        <Route path="/store/stores" element={<StoreStores />} />
        <Route path="/store/shop" element={<StoreShop />} />
        <Route path="/store/products" element={<StoreProducts />} />
        <Route path="/store/orders" element={<StoreOrders />} />
        <Route path="/store/lives" element={<StoreLives />} />
        <Route path="/store/calls" element={<StoreCalls />} />
        <Route path="/store/affiliate" element={<StoreAffiliate />} />
        <Route path="/store/fanbox" element={<StoreFanbox />} />
        <Route path="/store/settings" element={<StoreSettings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
        <AppRoutes />
        <ConfirmHost />
        <ToastHost />
    </ThemeProvider>
  );
}
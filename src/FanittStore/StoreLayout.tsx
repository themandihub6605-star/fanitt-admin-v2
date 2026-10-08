import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Store, Package, Receipt, Radio, PhoneCall, Link2, Gift, Settings, ShoppingBag } from 'lucide-react';
import { PageHeader } from '@/components/AdminUI';
import { cn } from '@/utils/cn';

export const STORE_TABS = [
  { href: '/store', label: 'Overview', icon: BarChart3 },
  { href: '/store/stores', label: 'Stores & KYC', icon: Store },
  { href: '/store/shop', label: 'Shop orders', icon: ShoppingBag },
  { href: '/store/products', label: 'Products', icon: Package },
  { href: '/store/orders', label: 'Orders', icon: Receipt },
  { href: '/store/lives', label: 'Live', icon: Radio },
  { href: '/store/calls', label: 'Calls', icon: PhoneCall },
  { href: '/store/affiliate', label: 'Affiliate', icon: Link2 },
  { href: '/store/fanbox', label: 'FanBox', icon: Gift },
  { href: '/store/settings', label: 'Settings', icon: Settings },
];

/** Header + section tabs shared by every Fanitt Store admin page. */
export default function StoreLayout({ description, children }: { description: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div>
      <PageHeader title="Fanitt Store" description={description} />
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1">
        {STORE_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm',
                active ? 'text-orange-700 dark:text-orange-300' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white/80'
              )}
            >
              {active && (
                <motion.span
                  layoutId="store-tab-pill"
                  className="absolute inset-0 rounded-xl bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-500/15 dark:ring-orange-500/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 40 }}
                />
              )}
              <tab.icon size={15} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
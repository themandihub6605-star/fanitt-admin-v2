/* eslint-disable react-refresh/only-export-components */
/**
 * Icon set for the admin panel: Phosphor icons (duotone for things, bold
 * for small UI marks like arrows and checks), exposed under the names the
 * pages already use, so `import { Wallet } from '@/icons'` just works.
 *
 * Only the three weights we use are bundled (see paths.ts) — the full
 * Phosphor package ships six per icon and doubled the bundle size.
 */
import { forwardRef, type CSSProperties, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { PATHS } from './paths';

export type IconWeight = 'bold' | 'duotone' | 'fill';

export interface IconProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  color?: string;
  /** Kept for compatibility; Phosphor uses weights instead of stroke widths. */
  strokeWidth?: number;
  /** fill="currentColor" (any value but 'none') → the solid version of the icon. */
  fill?: string;
  weight?: IconWeight;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export type LucideIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
export type AppIcon = LucideIcon;

const W: Record<IconWeight, 0 | 1 | 2> = { bold: 0, duotone: 1, fill: 2 };

function make(ph: string, name: string, base: IconWeight): LucideIcon {
  const C = forwardRef<SVGSVGElement, IconProps>(function AppIcon({ size = 20, strokeWidth, fill, weight, color, style, className, ...rest }, ref) {
    const w: IconWeight = weight ?? (fill && fill !== 'none' ? 'fill' : strokeWidth && strokeWidth >= 2.5 ? 'bold' : base);
    const body = PATHS[ph]?.[W[w]] ?? '';
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill={color ?? 'currentColor'}
        className={className}
        style={style}
        aria-hidden={rest['aria-label'] ? undefined : true}
        role={rest['aria-label'] ? 'img' : undefined}
        {...rest}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  });
  C.displayName = name;
  return C;
}

export const Activity = make('Pulse', 'Activity', 'duotone');
export const AlertCircle = make('WarningCircle', 'AlertCircle', 'duotone');
export const AlertTriangle = make('Warning', 'AlertTriangle', 'duotone');
export const ArrowDown = make('ArrowDown', 'ArrowDown', 'bold');
export const ArrowDownRight = make('ArrowDownRight', 'ArrowDownRight', 'bold');
export const ArrowLeft = make('ArrowLeft', 'ArrowLeft', 'bold');
export const ArrowRight = make('ArrowRight', 'ArrowRight', 'bold');
export const ArrowUp = make('ArrowUp', 'ArrowUp', 'bold');
export const ArrowUpDown = make('ArrowsDownUp', 'ArrowUpDown', 'bold');
export const ArrowUpRight = make('ArrowUpRight', 'ArrowUpRight', 'bold');
export const BadgeCheck = make('SealCheck', 'BadgeCheck', 'duotone');
export const Ban = make('Prohibit', 'Ban', 'duotone');
export const Banknote = make('Money', 'Banknote', 'duotone');
export const BarChart3 = make('ChartBar', 'BarChart3', 'duotone');
export const Bell = make('Bell', 'Bell', 'duotone');
export const Briefcase = make('Briefcase', 'Briefcase', 'duotone');
export const Building2 = make('Buildings', 'Building2', 'duotone');
export const CalendarClock = make('CalendarCheck', 'CalendarClock', 'duotone');
export const CalendarDays = make('CalendarDots', 'CalendarDays', 'duotone');
export const Check = make('Check', 'Check', 'bold');
export const CheckCheck = make('Checks', 'CheckCheck', 'bold');
export const CheckCircle2 = make('CheckCircle', 'CheckCircle2', 'duotone');
export const ChevronDown = make('CaretDown', 'ChevronDown', 'bold');
export const ChevronLeft = make('CaretLeft', 'ChevronLeft', 'bold');
export const ChevronRight = make('CaretRight', 'ChevronRight', 'bold');
export const ChevronUp = make('CaretUp', 'ChevronUp', 'bold');
export const Clapperboard = make('FilmSlate', 'Clapperboard', 'duotone');
export const ClipboardCheck = make('ClipboardText', 'ClipboardCheck', 'duotone');
export const Clock = make('Clock', 'Clock', 'duotone');
export const Compass = make('Compass', 'Compass', 'duotone');
export const Copy = make('Copy', 'Copy', 'bold');
export const CornerDownLeft = make('ArrowElbowDownLeft', 'CornerDownLeft', 'bold');
export const Cpu = make('Cpu', 'Cpu', 'duotone');
export const CreditCard = make('CreditCard', 'CreditCard', 'duotone');
export const Crown = make('Crown', 'Crown', 'duotone');
export const Database = make('Database', 'Database', 'duotone');
export const Download = make('DownloadSimple', 'Download', 'bold');
export const ExternalLink = make('ArrowSquareOut', 'ExternalLink', 'bold');
export const Eye = make('Eye', 'Eye', 'duotone');
export const EyeOff = make('EyeSlash', 'EyeOff', 'duotone');
export const FileEdit = make('NotePencil', 'FileEdit', 'duotone');
export const FileText = make('FileText', 'FileText', 'duotone');
export const FileWarning = make('FileX', 'FileWarning', 'duotone');
export const Flag = make('Flag', 'Flag', 'duotone');
export const Gift = make('Gift', 'Gift', 'duotone');
export const Globe = make('Globe', 'Globe', 'duotone');
export const Globe2 = make('GlobeHemisphereEast', 'Globe2', 'duotone');
export const Hash = make('Hash', 'Hash', 'bold');
export const Heart = make('Heart', 'Heart', 'duotone');
export const HeartPulse = make('Heartbeat', 'HeartPulse', 'duotone');
export const History = make('ClockCounterClockwise', 'History', 'duotone');
export const Hourglass = make('Hourglass', 'Hourglass', 'duotone');
export const Image = make('Image', 'Image', 'duotone');
export const ImageOff = make('ImageBroken', 'ImageOff', 'duotone');
export const ImagePlus = make('ImageSquare', 'ImagePlus', 'duotone');
export const Images = make('Images', 'Images', 'duotone');
export const Inbox = make('Tray', 'Inbox', 'duotone');
export const IndianRupee = make('CurrencyInr', 'IndianRupee', 'duotone');
export const Info = make('Info', 'Info', 'duotone');
export const KeyRound = make('Key', 'KeyRound', 'duotone');
export const Layers = make('Stack', 'Layers', 'duotone');
export const LayoutDashboard = make('SquaresFour', 'LayoutDashboard', 'duotone');
export const LayoutGrid = make('GridFour', 'LayoutGrid', 'duotone');
export const Link2 = make('Link', 'Link2', 'duotone');
export const Loader2 = make('CircleNotch', 'Loader2', 'bold');
export const Lock = make('Lock', 'Lock', 'duotone');
export const LogIn = make('SignIn', 'LogIn', 'duotone');
export const LogOut = make('SignOut', 'LogOut', 'duotone');
export const Mail = make('Envelope', 'Mail', 'duotone');
export const MapPin = make('MapPin', 'MapPin', 'duotone');
export const Megaphone = make('Megaphone', 'Megaphone', 'duotone');
export const Menu = make('List', 'Menu', 'bold');
export const MessageCircle = make('ChatCircle', 'MessageCircle', 'duotone');
export const MessagesSquare = make('ChatsCircle', 'MessagesSquare', 'duotone');
export const Mic = make('Microphone', 'Mic', 'duotone');
export const MicOff = make('MicrophoneSlash', 'MicOff', 'duotone');
export const Milestone = make('FlagBanner', 'Milestone', 'duotone');
export const Monitor = make('Monitor', 'Monitor', 'duotone');
export const MonitorSmartphone = make('Devices', 'MonitorSmartphone', 'duotone');
export const MonitorUp = make('Screencast', 'MonitorUp', 'duotone');
export const Moon = make('Moon', 'Moon', 'duotone');
export const MousePointerClick = make('CursorClick', 'MousePointerClick', 'duotone');
export const Package = make('Package', 'Package', 'duotone');
export const PackageCheck = make('Package', 'PackageCheck', 'duotone');
export const Paperclip = make('Paperclip', 'Paperclip', 'duotone');
export const PenLine = make('PencilLine', 'PenLine', 'duotone');
export const Pencil = make('PencilSimple', 'Pencil', 'duotone');
export const Percent = make('Percent', 'Percent', 'bold');
export const Phone = make('Phone', 'Phone', 'duotone');
export const PhoneCall = make('PhoneCall', 'PhoneCall', 'duotone');
export const PhoneOff = make('PhoneSlash', 'PhoneOff', 'duotone');
export const Pin = make('PushPin', 'Pin', 'duotone');
export const Play = make('Play', 'Play', 'duotone');
export const PlayCircle = make('PlayCircle', 'PlayCircle', 'duotone');
export const Plus = make('Plus', 'Plus', 'bold');
export const Radio = make('Broadcast', 'Radio', 'duotone');
export const Receipt = make('Receipt', 'Receipt', 'duotone');
export const RefreshCw = make('ArrowsClockwise', 'RefreshCw', 'bold');
export const RotateCcw = make('ArrowCounterClockwise', 'RotateCcw', 'bold');
export const Route = make('Path', 'Route', 'duotone');
export const Save = make('FloppyDisk', 'Save', 'duotone');
export const Search = make('MagnifyingGlass', 'Search', 'bold');
export const Send = make('PaperPlaneTilt', 'Send', 'duotone');
export const ServerCrash = make('WarningOctagon', 'ServerCrash', 'duotone');
export const Settings = make('GearSix', 'Settings', 'duotone');
export const Settings2 = make('SlidersHorizontal', 'Settings2', 'duotone');
export const ShieldAlert = make('ShieldWarning', 'ShieldAlert', 'duotone');
export const ShieldCheck = make('ShieldCheck', 'ShieldCheck', 'duotone');
export const ShieldOff = make('ShieldSlash', 'ShieldOff', 'duotone');
export const ShoppingBag = make('ShoppingBag', 'ShoppingBag', 'duotone');
export const Smartphone = make('DeviceMobile', 'Smartphone', 'duotone');
export const Sparkles = make('Sparkle', 'Sparkles', 'duotone');
export const Square = make('Square', 'Square', 'duotone');
export const Star = make('Star', 'Star', 'duotone');
export const Store = make('Storefront', 'Store', 'duotone');
export const Sun = make('Sun', 'Sun', 'duotone');
export const Tag = make('Tag', 'Tag', 'duotone');
export const TestTube2 = make('TestTube', 'TestTube2', 'duotone');
export const Ticket = make('Ticket', 'Ticket', 'duotone');
export const Timer = make('Timer', 'Timer', 'duotone');
export const Trash2 = make('Trash', 'Trash2', 'duotone');
export const TrendingDown = make('TrendDown', 'TrendingDown', 'duotone');
export const TrendingUp = make('TrendUp', 'TrendingUp', 'duotone');
export const Trophy = make('Trophy', 'Trophy', 'duotone');
export const Truck = make('Truck', 'Truck', 'duotone');
export const Undo2 = make('ArrowUUpLeft', 'Undo2', 'bold');
export const User = make('User', 'User', 'duotone');
export const UserCheck = make('UserCheck', 'UserCheck', 'duotone');
export const UserCog = make('UserGear', 'UserCog', 'duotone');
export const UserMinus = make('UserMinus', 'UserMinus', 'duotone');
export const UserPlus = make('UserPlus', 'UserPlus', 'duotone');
export const UserX = make('UserMinus', 'UserX', 'duotone');
export const Users = make('Users', 'Users', 'duotone');
export const Users2 = make('UsersThree', 'Users2', 'duotone');
export const UsersRound = make('UsersFour', 'UsersRound', 'duotone');
export const Video = make('VideoCamera', 'Video', 'duotone');
export const VideoOff = make('VideoCameraSlash', 'VideoOff', 'duotone');
export const Volume2 = make('SpeakerHigh', 'Volume2', 'duotone');
export const VolumeX = make('SpeakerSlash', 'VolumeX', 'duotone');
export const Wallet = make('Wallet', 'Wallet', 'duotone');
export const X = make('X', 'X', 'bold');
export const XCircle = make('XCircle', 'XCircle', 'duotone');
export const Zap = make('Lightning', 'Zap', 'duotone');
export const SidebarSimple = make('SidebarSimple', 'SidebarSimple', 'bold');
export const Funnel = make('Funnel', 'Funnel', 'duotone');
export const ChartLineUp = make('ChartLineUp', 'ChartLineUp', 'duotone');
export const ChartPie = make('ChartPieSlice', 'ChartPie', 'duotone');
export const Coins = make('Coins', 'Coins', 'duotone');
export const Pulse = make('Pulse', 'Pulse', 'duotone');
export const FilmReel = make('FilmSlate', 'FilmReel', 'duotone');
export const Newspaper = make('Newspaper', 'Newspaper', 'duotone');
export const Storefront2 = make('Storefront', 'Storefront2', 'duotone');
export const HandCoins = make('HandCoins', 'HandCoins', 'duotone');
export const Sparkle = make('Sparkle', 'Sparkle', 'duotone');
export const Rows2 = make('Rows', 'Rows2', 'bold');
export const Rows3 = make('Equals', 'Rows3', 'bold');
export const HandHeart = make('HandHeart', 'HandHeart', 'duotone');
export const Scales = make('Scales', 'Scales', 'duotone');
export const BookOpen = make('BookOpen', 'BookOpen', 'duotone');
export const CircleDashed = make('CircleDashed', 'CircleDashed', 'duotone');
export const Aperture = make('Aperture', 'Aperture', 'duotone');
export const ChatText = make('ChatTeardropText', 'ChatText', 'duotone');
export const UserFocus = make('UserFocus', 'UserFocus', 'duotone');
export const IdCard = make('IdentificationCard', 'IdCard', 'duotone');
export const Prohibit = make('Prohibit', 'Prohibit', 'duotone');
export const PiggyBank = make('PiggyBank', 'PiggyBank', 'duotone');
export const Vault = make('Vault', 'Vault', 'duotone');
export const Bank = make('Bank', 'Bank', 'duotone');
export const Maximize = make('ArrowsOut', 'Maximize', 'bold');
export const Minimize = make('ArrowsIn', 'Minimize', 'bold');
export const DotsNine = make('DotsNine', 'DotsNine', 'bold');
export const PlusCircle = make('PlusCircle', 'PlusCircle', 'duotone');

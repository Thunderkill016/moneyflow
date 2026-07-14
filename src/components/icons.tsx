import {
  Archive,
  ArrowLeftRight,
  Bell,
  BookOpen,
  CalendarDays,
  CarFront,
  ChartNoAxesColumnIncreasing,
  Check,
  CircleHelp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  CreditCard,
  Flag,
  Home,
  HeartPulse,
  Inbox,
  Landmark,
  ListOrdered,
  LockKeyhole,
  type LucideIcon,
  type LucideProps,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Scale,
  Search,
  Settings2,
  ShoppingBag,
  Soup,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

export type IconName =
  | "home"
  | "arrows"
  | "chart"
  | "wallet"
  | "settings"
  | "search"
  | "bell"
  | "plus"
  | "arrowUp"
  | "arrowDown"
  | "arrowRight"
  | "bowl"
  | "car"
  | "bag"
  | "receipt"
  | "spark"
  | "target"
  | "close"
  | "check"
  | "trash"
  | "bank"
  | "card"
  | "edit"
  | "archive"
  | "restore"
  | "calendar"
  | "flag"
  | "lock"
  | "heart"
  | "book"
  | "inbox"
  | "timeline"
  | "rules"
  | "imports"
  | "more"
  | "paste"
  | "upload";

const icons: Record<IconName, LucideIcon> = {
  home: Home,
  arrows: ArrowLeftRight,
  chart: ChartNoAxesColumnIncreasing,
  wallet: WalletCards,
  settings: Settings2,
  search: Search,
  bell: Bell,
  plus: Plus,
  arrowUp: ChevronUp,
  arrowDown: ChevronDown,
  arrowRight: ChevronRight,
  bowl: Soup,
  car: CarFront,
  bag: ShoppingBag,
  receipt: ReceiptText,
  spark: Sparkles,
  target: Target,
  close: X,
  check: Check,
  trash: Trash2,
  bank: Landmark,
  card: CreditCard,
  edit: Pencil,
  archive: Archive,
  restore: RotateCcw,
  calendar: CalendarDays,
  flag: Flag,
  lock: LockKeyhole,
  heart: HeartPulse,
  book: BookOpen,
  inbox: Inbox,
  timeline: ListOrdered,
  rules: Scale,
  imports: Archive,
  more: MoreHorizontal,
  paste: ClipboardPaste,
  upload: Upload,
};

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = icons[name] ?? CircleHelp;
  return <Component aria-hidden="true" strokeWidth={1.8} {...props} />;
}

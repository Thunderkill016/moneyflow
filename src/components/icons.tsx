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
  CreditCard,
  Flag,
  Home,
  HeartPulse,
  Landmark,
  LockKeyhole,
  type LucideIcon,
  type LucideProps,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings2,
  ShoppingBag,
  Soup,
  Sparkles,
  Target,
  Trash2,
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
  | "book";

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
};

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = icons[name] ?? CircleHelp;
  return <Component aria-hidden="true" strokeWidth={1.8} {...props} />;
}

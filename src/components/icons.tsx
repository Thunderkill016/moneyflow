import {
  Archive,
  ArrowLeftRight,
  Baby,
  Bell,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  CalendarDays,
  CarFront,
  ChartNoAxesColumnIncreasing,
  Check,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleParking,
  ClipboardPaste,
  Coffee,
  CreditCard,
  Download,
  Dumbbell,
  Film,
  Flag,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HandHeart,
  Home,
  HeartPulse,
  Inbox,
  Landmark,
  ListOrdered,
  LockKeyhole,
  type LucideIcon,
  type LucideProps,
  MoreHorizontal,
  Music,
  PawPrint,
  Pencil,
  PiggyBank,
  Pill,
  Plane,
  Plus,
  ReceiptText,
  RotateCcw,
  Scale,
  Search,
  Settings2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Soup,
  Sparkles,
  Stamp,
  Table2,
  Target,
  TicketPercent,
  Trash2,
  Upload,
  WalletCards,
  WashingMachine,
  Wifi,
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
  | "arrowLeft"
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
  | "upload"
  | "table"
  | "download"
  | "coffee"
  | "phone"
  | "gift"
  | "paw"
  | "gym"
  | "music"
  | "plane"
  | "wifi"
  | "piggy"
  | "briefcase"
  | "coins"
  | "fuel"
  | "film"
  | "shirt"
  | "baby"
  | "pill"
  | "study"
  | "bus"
  | "bike"
  | "parking"
  | "ticket"
  | "laundry"
  | "charity"
  | "tax";

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
  arrowLeft: ChevronLeft,
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
  table: Table2,
  download: Download,
  coffee: Coffee,
  phone: Smartphone,
  gift: Gift,
  paw: PawPrint,
  gym: Dumbbell,
  music: Music,
  plane: Plane,
  wifi: Wifi,
  piggy: PiggyBank,
  briefcase: Briefcase,
  coins: HandCoins,
  fuel: Fuel,
  film: Film,
  shirt: Shirt,
  baby: Baby,
  pill: Pill,
  study: GraduationCap,
  bus: Bus,
  bike: Bike,
  parking: CircleParking,
  ticket: TicketPercent,
  laundry: WashingMachine,
  charity: HandHeart,
  tax: Stamp,
};

export function Icon({ name, ...props }: LucideProps & { name: IconName }) {
  const Component = icons[name] ?? CircleHelp;
  return <Component aria-hidden="true" strokeWidth={1.8} {...props} />;
}

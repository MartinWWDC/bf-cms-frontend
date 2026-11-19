import {
  BriefcaseIcon, HeadsetIcon, TagsIcon, UserCheckIcon,
  ArchiveIcon, BellIcon, BikeIcon, BanIcon, BookOpenIcon, BotIcon, BoxIcon, CalendarIcon, ChartColumnIcon,
  CheckIcon, CircleDotIcon, CircleHelpIcon, CircleIcon, CpuIcon, FileTextIcon, FlagIcon, FolderTreeIcon, GaugeIcon,
  GlobeIcon, HandCoinsIcon, HeartIcon, HistoryIcon, ImageIcon, KeyRoundIcon, LanguagesIcon, LayersIcon,
  LayoutDashboardIcon, LayoutGridIcon, LinkIcon, ListChecksIcon, ListIcon, ListOrderedIcon, LogsIcon,
  type LucideIcon, MailIcon, MapIcon, MapPinIcon, MegaphoneIcon, MessageSquareIcon, MessagesSquareIcon,
  PackageIcon, PaletteIcon, PercentIcon, PhoneIcon, PlugIcon, ReceiptTextIcon, RouteIcon, RssIcon, RulerIcon,
  ScaleIcon, ScrollTextIcon, SearchIcon, SettingsIcon, ShieldCheckIcon, ShieldIcon, ShirtIcon, SmartphoneIcon,
  SparklesIcon, StarIcon, StoreIcon, TagIcon, TextIcon, ToggleLeftIcon, TriangleAlertIcon, TruckIcon,
  Undo2Icon, UploadIcon, UserIcon, UsersIcon, WalletIcon, WarehouseIcon, WebhookIcon, WrenchIcon, ZapIcon,
  CogIcon, BadgeEuroIcon, ShoppingCartIcon, MapPinnedIcon, UsersRoundIcon, SlidersHorizontalIcon,
} from "lucide-react";

/**
 * The backend names an icon per navigation entry (`field-types.md` section 8: "a name from
 * an icon set to be agreed with the frontend"). These are the names it sends today.
 * Unknown names fall back to a neutral dot instead of breaking the menu.
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  support: HeadsetIcon, label: TagsIcon, "user-check": UserCheckIcon, briefcase: BriefcaseIcon,
  address: MapPinIcon, archive: ArchiveIcon, bell: BellIcon, bike: BikeIcon, block: BanIcon, blog: BookOpenIcon,
  bolt: ZapIcon, box: BoxIcon, calendar: CalendarIcon, cancel: BanIcon, cart: ShoppingCartIcon,
  category: FolderTreeIcon, chart: ChartColumnIcon, chat: MessageSquareIcon, check: CheckIcon, circle: CircleIcon,
  clothing: ShirtIcon, collection: LayersIcon, complaints: TriangleAlertIcon, component: CogIcon,
  content: FileTextIcon, cpu: CpuIcon, device: SmartphoneIcon, discount: PercentIcon, document: FileTextIcon,
  feed: RssIcon, flag: FlagIcon, gauge: GaugeIcon, globe: GlobeIcon, grid: LayoutGridIcon, heart: HeartIcon,
  help: CircleHelpIcon, history: HistoryIcon, image: ImageIcon, invoice: ReceiptTextIcon, key: KeyRoundIcon,
  language: LanguagesIcon, layers: LayersIcon, layout: LayoutDashboardIcon, link: LinkIcon, list: ListIcon,
  listings: BikeIcon, location: MapPinnedIcon, log: ScrollTextIcon, logs: LogsIcon, mail: MailIcon, map: MapIcon,
  megaphone: MegaphoneIcon, message: MessageSquareIcon, messages: MessagesSquareIcon, money: HandCoinsIcon,
  offer: BadgeEuroIcon, operations: SlidersHorizontalIcon, orders: PackageIcon, palette: PaletteIcon,
  phone: PhoneIcon, plug: PlugIcon, price: TagIcon, queue: ListOrderedIcon, return: Undo2Icon, robot: BotIcon,
  route: RouteIcon, ruler: RulerIcon, rules: ScaleIcon, scale: ScaleIcon, search: SearchIcon,
  settings: SettingsIcon, shield: ShieldIcon, "shield-check": ShieldCheckIcon, shipping: TruckIcon,
  sparkles: SparklesIcon, star: StarIcon, store: StoreIcon, tag: TagIcon, tasks: ListChecksIcon,
  team: UsersRoundIcon, text: TextIcon, toggle: ToggleLeftIcon, tool: WrenchIcon, truck: TruckIcon,
  upload: UploadIcon, user: UserIcon, users: UsersIcon, wallet: WalletIcon, warehouse: WarehouseIcon,
  warning: TriangleAlertIcon, webhook: WebhookIcon,
};

export function getNavIcon(key: string | null | undefined): LucideIcon {
  return (key && NAV_ICONS[key]) || CircleDotIcon;
}

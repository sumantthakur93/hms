import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Home01Icon,
  Building01Icon,
  StethoscopeIcon,
  UserMultipleIcon,
  PillIcon,
  TestTubeIcon,
  Invoice01Icon,
  Settings01Icon,
  CalendarCheckIn01Icon,
  UserAdd01Icon,
  Search01Icon,
  BubbleChatIcon,
  CalendarAdd01Icon,
  Clock01Icon,
  CheckListIcon,
  CheckmarkCircle01Icon,
  File01Icon,
  Notification01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Logout01Icon,
  MoreHorizontalIcon,
  Menu01Icon,
  Cancel01Icon,
  ViewIcon,
  ViewOffIcon,
  Loading01Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  SecurityCheckIcon,
  Cardiogram01Icon,
  Tick01Icon,
  FavouriteIcon,
  BrainIcon,
  Bone01Icon,
  Baby01Icon,
  EarIcon,
  Activity01Icon,
  TestTubeIcon as FlaskConicalIcon,
  FolderOpenIcon,
  SmartPhone01Icon,
  Mail01Icon,
  Location01Icon,
  Shield01Icon,
  CalendarBlock01Icon,
  CalendarRemove01Icon,
  CalendarMinus01Icon,
  Add01Icon,
  Delete01Icon,
  PencilIcon,
  FloppyDiskIcon,
  LockIcon,
  Edit01Icon,
  UserIcon,
  Hospital01Icon,
  UserCheck01Icon,
  UserRemove01Icon,
  Download04Icon,
  Upload04Icon,
  ArrowLeft01Icon as ArrowLeft01IconRaw,
  Package01Icon,
  RupeeIcon,
  Layers01Icon,
  BanIcon,
  AlertCircleIcon as AlertTriangleIcon,
  SentIcon,
  BanknoteIcon,
  CreditCardIcon,
  PrinterIcon,
} from "@hugeicons/core-free-icons";

type IconProps = {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
};

function makeIcon(icon: IconSvgElement) {
  return function Icon({ className, size, strokeWidth }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        className={className}
        size={size}
        strokeWidth={strokeWidth}
      />
    );
  };
}

// Dashboard nav icons (mapped from nav-config string keys)
export const LayoutDashboard = makeIcon(Home01Icon);
export const Building2 = makeIcon(Building01Icon);
export const Users = makeIcon(UserMultipleIcon);
export const Pill = makeIcon(PillIcon);
export const TestTube = makeIcon(TestTubeIcon);
export const Receipt = makeIcon(Invoice01Icon);
export const Settings = makeIcon(Settings01Icon);
export const CalendarClock = makeIcon(CalendarCheckIn01Icon);
export const UserPlus = makeIcon(UserAdd01Icon);
export const Search = makeIcon(Search01Icon);
export const MessageSquare = makeIcon(BubbleChatIcon);
export const CalendarPlus = makeIcon(CalendarAdd01Icon);
export const History = makeIcon(Clock01Icon);
export const ListTodo = makeIcon(CheckListIcon);
export const CheckCircle2 = makeIcon(CheckmarkCircle01Icon);
export const FileText = makeIcon(File01Icon);

// UI icons
export const Bell = makeIcon(Notification01Icon);
export const ChevronLeft = makeIcon(ArrowLeft01Icon);
export const ChevronRight = makeIcon(ArrowRight01Icon);
export const ChevronDown = makeIcon(ArrowDown01Icon);
export const ChevronUp = makeIcon(ArrowUp01Icon);
export const LogOut = makeIcon(Logout01Icon);
export const MoreHorizontal = makeIcon(MoreHorizontalIcon);
export const Menu = makeIcon(Menu01Icon);
export const X = makeIcon(Cancel01Icon);
export const Eye = makeIcon(ViewIcon);
export const EyeOff = makeIcon(ViewOffIcon);
export const Loader2 = makeIcon(Loading01Icon);
export const AlertCircle = makeIcon(AlertCircleIcon);
export const ShieldCheck = makeIcon(SecurityCheckIcon);
export const Shield = makeIcon(Shield01Icon);
export const HeartPulse = makeIcon(Cardiogram01Icon);
export const Check = makeIcon(Tick01Icon);
export const Heart = makeIcon(FavouriteIcon);
export const Brain = makeIcon(BrainIcon);
export const Bone = makeIcon(Bone01Icon);
export const Baby = makeIcon(Baby01Icon);
export const Ear = makeIcon(EarIcon);
export const Activity = makeIcon(Activity01Icon);
export const FlaskConical = makeIcon(FlaskConicalIcon);
export const FolderOpen = makeIcon(FolderOpenIcon);
export const Phone = makeIcon(SmartPhone01Icon);
export const Mail = makeIcon(Mail01Icon);
export const MapPin = makeIcon(Location01Icon);
export const ArrowRight = makeIcon(ArrowRight01Icon);
export const CalendarOff = makeIcon(CalendarBlock01Icon);
export const CalendarX = makeIcon(CalendarRemove01Icon);
export const CalendarMinus = makeIcon(CalendarMinus01Icon);
export const Plus = makeIcon(Add01Icon);
export const Trash2 = makeIcon(Delete01Icon);
export const Trash = makeIcon(Delete01Icon);
export const Pencil = makeIcon(PencilIcon);
export const Save = makeIcon(FloppyDiskIcon);
export const Lock = makeIcon(LockIcon);
export const Edit3 = makeIcon(Edit01Icon);
export const User = makeIcon(UserIcon);
export const UserCheck = makeIcon(UserCheck01Icon);
export const UserX = makeIcon(UserRemove01Icon);
export const Stethoscope = makeIcon(StethoscopeIcon);
export const Hospital = makeIcon(Hospital01Icon);
export const Calendar = makeIcon(CalendarCheckIn01Icon);
export const CalendarDots = makeIcon(CalendarCheckIn01Icon);
export const Clock = makeIcon(Clock01Icon);
export const ArrowLeft = makeIcon(ArrowLeft01IconRaw);
export const Download = makeIcon(Download04Icon);
export const Upload = makeIcon(Upload04Icon);
export const Package = makeIcon(Package01Icon);
export const IndianRupee = makeIcon(RupeeIcon);
export const Layers = makeIcon(Layers01Icon);
export const Ban = makeIcon(BanIcon);
export const AlertTriangle = makeIcon(AlertTriangleIcon);
export const Send = makeIcon(SentIcon);
export const Banknote = makeIcon(BanknoteIcon);
export const CreditCard = makeIcon(CreditCardIcon);
export const Printer = makeIcon(PrinterIcon);

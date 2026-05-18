export type Lang = "zh" | "en";

export type I18nKey =
  | "appName"
  | "signInWithGoogle"
  | "signOut"
  | "memberApp"
  | "admin"
  | "home"
  | "dashboard"
  | "profile"
  | "me"
  | "bookNow"
  | "payActivate"
  | "membershipFee"
  | "membershipStatusNone"
  | "membershipStatusActive"
  | "membershipStatusExpired"
  | "latestBooking"
  | "expiresAt"
  | "memberNo"
  | "paymentMethods"
  | "bookingRulesTitle"
  | "ruleMinGap"
  | "ruleMaxDuration"
  | "photos"
  | "notifications"
  | "messages"
  | "members"
  | "rules"
  | "studios"
  | "bookings"
  // admin dashboard
  | "adminConsole"
  | "country"
  | "allCountries"
  | "totalBookings"
  | "pendingRetouch"
  | "pendingUploads"
  | "completed"
  | "filter"
  | "period"
  | "day"
  | "month"
  | "year"
  | "apply"
  | "orders";

const DICT: Record<Lang, Record<I18nKey, string>> = {
  zh: {
    appName: "会员管理系统",
    signInWithGoogle: "使用 Google 登录",
    signOut: "退出登录",
    memberApp: "会员端",
    admin: "后台管理",
    home: "首页",
    dashboard: "仪表盘",
    profile: "我的",
    me: "我的",
    bookNow: "立即预约",
    payActivate: "开通/续费会员",
    membershipFee: "会员费",
    membershipStatusNone: "未开通",
    membershipStatusActive: "已开通",
    membershipStatusExpired: "已到期",
    latestBooking: "最近一次预约",
    expiresAt: "到期日",
    memberNo: "会员编号",
    paymentMethods: "支付方式",
    bookingRulesTitle: "预约规则（防滥用）",
    ruleMinGap: "每次拍摄间隔至少 7 天",
    ruleMaxDuration: "每次最多 2 小时",
    photos: "照片档案",
    notifications: "通知",
    messages: "消息",
    members: "会员",
    rules: "规则",
    studios: "摄影棚",
    bookings: "预约",
    adminConsole: "后台控制台",
    country: "国家",
    allCountries: "全部国家",
    totalBookings: "总预约数",
    pendingRetouch: "等待精修",
    pendingUploads: "等待照片上传",
    completed: "已完成",
    filter: "筛选",
    period: "周期",
    day: "日期",
    month: "月份",
    year: "年份",
    apply: "应用",
    orders: "订单"
  },
  en: {
    appName: "Member Management",
    signInWithGoogle: "Continue with Google",
    signOut: "Sign out",
    memberApp: "Member App",
    admin: "Admin",
    home: "Home",
    dashboard: "Dashboard",
    profile: "Profile",
    me: "Me",
    bookNow: "Book now",
    payActivate: "Pay / Activate",
    membershipFee: "Membership fee",
    membershipStatusNone: "Inactive",
    membershipStatusActive: "Active",
    membershipStatusExpired: "Expired",
    latestBooking: "Latest booking",
    expiresAt: "Expires",
    memberNo: "Member no.",
    paymentMethods: "Payment methods",
    bookingRulesTitle: "Booking rules (anti-abuse)",
    ruleMinGap: "Minimum 7-day gap between sessions",
    ruleMaxDuration: "Max 2 hours per session",
    photos: "Photo library",
    notifications: "Notifications",
    messages: "Messages",
    members: "Members",
    rules: "Rules",
    studios: "Studios",
    bookings: "Bookings",
    adminConsole: "Admin console",
    country: "Country",
    allCountries: "All countries",
    totalBookings: "Total bookings",
    pendingRetouch: "Pending retouch",
    pendingUploads: "Pending uploads",
    completed: "Completed",
    filter: "Filter",
    period: "Period",
    day: "Day",
    month: "Month",
    year: "Year",
    apply: "Apply",
    orders: "Orders"
  }
};

/**
 * Translate an i18n key using current language.
 * @param lang Language
 * @param key Key
 */
export function t(lang: Lang, key: I18nKey): string {
  return DICT[lang][key];
}

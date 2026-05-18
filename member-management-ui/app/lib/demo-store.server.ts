import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { UserSession } from "~/lib/session.server";
import { getShootPackage } from "~/lib/shoot-packages";

export type MembershipStatus = "none" | "active" | "expired";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberNo: string;
  country: "MY" | "SG" | "TH";
  avatarUrl?: string;
  membershipExpiresAt?: string; // ISO
  pointsBalance?: number;
  pointsEarnedTotal?: number;
  createdAt: string; // ISO
};

export type Payment = {
  id: string;
  memberId: string;
  amount: number;
  currency: "MYR" | "SGD" | "THB";
  method: "FPX" | "Credit Card" | "DuitNow" | "TNG eWallet";
  status: "succeeded" | "failed";
  createdAt: string; // ISO
};

export type PaymentMethod = Payment["method"];

export type PaymentMethodConfig = {
  method: PaymentMethod;
  enabled: boolean;
  /**
   * Regions/countries supported by this method (display-only for PoC).
   */
  regions: Array<"MY" | "SG" | "TH">;
};

export type Booking = {
  id: string;
  memberId: string;
  packageId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  studio: string;
  photographer: string;
  status: "confirmed" | "pending" | "cancelled";
  createdAt: string; // ISO
};

export type PointsLedgerEntry = {
  id: string;
  memberId: string;
  kind: "earn" | "deduct";
  points: number;
  titleZh: string;
  titleEn: string;
  subtitleZh?: string;
  subtitleEn?: string;
  createdAt: string; // ISO
  expiresAt?: string; // ISO
};

export type CreditsLedgerEntry = {
  id: string;
  memberId: string;
  kind: "grant" | "spend" | "adjust";
  credits: number;
  titleZh: string;
  titleEn: string;
  subtitleZh?: string;
  subtitleEn?: string;
  createdAt: string; // ISO
  expiresAt?: string; // ISO
};

export type TopupOrderStatus = "submitted" | "approved" | "rejected";

export type TopupOrder = {
  id: string;
  memberId: string;
  packageId: string;
  amount: number;
  currency: "MYR" | "SGD" | "THB";
  proofUrl: string;
  status: TopupOrderStatus;
  createdAt: string; // ISO
  reviewedAt?: string; // ISO
};

export type ShootOrderStatus = "scheduled" | "cancelled" | "completed";

export type ShootOrder = {
  id: string;
  memberId: string;
  packageId: string;
  creditsCost: number;
  bookingId: string;
  status: ShootOrderStatus;
  createdAt: string; // ISO
  cancelledAt?: string; // ISO
  refundCredits?: number;
  rescheduledAt?: string; // ISO
  previousBookingId?: string;
};

export type AlbumStatus = "waiting_upload" | "delivered" | "retouch_requested" | "retouch_done";

export type PhotoAlbum = {
  id: string;
  memberId: string;
  bookingId?: string;
  shootDate: string; // YYYY-MM-DD
  title: string;
  status: AlbumStatus;
  retouchLimit: number;
  retouchSelectedPhotoIds: string[];
  createdAt: string; // ISO
  deliveredAt?: string; // ISO
  retouchDoneAt?: string; // ISO
};

export type Photo = {
  id: string;
  albumId: string;
  /**
   * Demo URL; in production this should be S3/GCS signed URL or CDN path.
   */
  url: string;
  /**
   * Original filename (or generated name) for download UX.
   */
  filename?: string;
  /**
   * Where this photo comes from (demo).
   */
  source?: "remote" | "local";
  createdAt: string; // ISO
};

export type NotificationType = "payment" | "booking" | "photos";

export type Notification = {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO
  readAt?: string; // ISO
};

export type Rules = {
  /**
   * Minimum days gap between two confirmed bookings for the same member.
   */
  minGapDays: number;
  /**
   * Maximum booking duration in minutes.
   */
  maxDurationMinutes: number;
  /**
   * Capacity per (studio + time-slot) in this demo. When full, booking will be rejected.
   */
  capacityPerSlot: number;
};

export type Studio = {
  id: string;
  name: string;
  /**
   * Max confirmed bookings per studio per time-slot (demo).
   */
  capacityPerSlot: number;
  active: boolean;
  /**
   * UI color for calendar blocks (hex).
   * Example: "#2563eb"
   */
  color: string;
  createdAt: string; // ISO
};

export type DemoStore = {
  version: 1;
  members: Record<string, Member>;
  payments: Record<string, Payment>;
  paymentMethods: Record<PaymentMethod, PaymentMethodConfig>;
  ruleConfigs?: Record<string, RuleConfig>;
  studios: Record<string, Studio>;
  bookings: Record<string, Booking>;
  pointsLedgers: Record<string, PointsLedgerEntry>;
  creditsLedgers: Record<string, CreditsLedgerEntry>;
  topupOrders: Record<string, TopupOrder>;
  shootOrders?: Record<string, ShootOrder>;
  albums: Record<string, PhotoAlbum>;
  photos: Record<string, Photo>;
  notifications: Record<string, Notification>;
  rules: Rules;
};

const DEFAULT_RULES: Rules = { minGapDays: 7, maxDurationMinutes: 120, capacityPerSlot: 2 };
const DEFAULT_PAYMENT_METHODS: Record<PaymentMethod, PaymentMethodConfig> = {
  FPX: { method: "FPX", enabled: true, regions: ["MY"] },
  "Credit Card": { method: "Credit Card", enabled: true, regions: ["MY", "SG", "TH"] },
  DuitNow: { method: "DuitNow", enabled: true, regions: ["MY"] },
  "TNG eWallet": { method: "TNG eWallet", enabled: true, regions: ["MY"] }
};

export type RuleConfig = {
  id: string;
  name: string;
  description: string;
  value: string;
  createdAt: string; // ISO
};

/**
 * Demo data store for PoC:
 * - File-backed JSON for persistence during local demos.
 * - No external dependencies, easy to replace with real DB/API later.
 *
 * IMPORTANT:
 * - This is NOT production-grade persistence.
 * - Do not store secrets/PII here in real deployments.
 */
class DemoStoreService {
  private store: DemoStore | null = null;
  private loading: Promise<DemoStore> | null = null;

  /**
   * Get the JSON file path for the demo store.
   */
  private getFilePath() {
    // Keep demo data inside project folder (cross-platform).
    return path.join(process.cwd(), ".demo-store.json");
  }

  /**
   * Load store from disk (or initialize defaults).
   */
  private async load(): Promise<DemoStore> {
    const filePath = this.getFilePath();
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as DemoStore;
      // Basic safety to avoid crashing on bad JSON.
      if (parsed?.version !== 1) throw new Error("invalid demo store version");
      return parsed;
    } catch {
      const seeded = this.seed();
      await this.save(seeded);
      return seeded;
    }
  }

  /**
   * Save store to disk.
   */
  private async save(store: DemoStore): Promise<void> {
    const filePath = this.getFilePath();
    const data = JSON.stringify(store, null, 2);
    await fs.writeFile(filePath, data, "utf8");
  }

  /**
   * Create a default demo dataset.
   */
  private seed(): DemoStore {
    const now = new Date().toISOString();
    const memberA: Member = {
      id: "m_demo_a",
      name: "Member A",
      email: "member.a@example.com",
      phone: "+60 12-345 6789",
      memberNo: "MY-2026-000123",
      country: "MY",
      pointsBalance: 0,
      pointsEarnedTotal: 0,
      createdAt: now
    };
    const memberB: Member = {
      id: "m_demo_b",
      name: "Alex Tan",
      email: "alex.tan@studio.sg",
      phone: "+65 8123 4567",
      memberNo: "SG-2026-000045",
      country: "SG",
      pointsBalance: 480,
      pointsEarnedTotal: 480,
      createdAt: now,
      // expiring soon
      membershipExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    };

    const albumForB: PhotoAlbum = {
      id: "alb_demo_1",
      memberId: memberB.id,
      shootDate: "2026-05-01",
      title: "Shoot 2026-05-01 (Demo)",
      status: "delivered",
      retouchLimit: 5,
      retouchSelectedPhotoIds: [],
      createdAt: now,
      deliveredAt: now
    };
    const photos: Record<string, Photo> = {};
    for (let i = 1; i <= 12; i++) {
      const p: Photo = {
        id: `p_demo_${i}`,
        albumId: albumForB.id,
        url: `https://picsum.photos/seed/${albumForB.id}_${i}/800/600`,
        filename: `demo_${i}.jpg`,
        source: "remote",
        createdAt: now
      };
      photos[p.id] = p;
    }

    const bookingForB1: Booking = {
      id: "BKG-DEMO-0001",
      memberId: memberB.id,
      packageId: "daily_portrait",
      startsAt: "2026-05-18T14:00:00+08:00",
      endsAt: "2026-05-18T15:30:00+08:00",
      studio: "Orchard Studio",
      photographer: "Terence Lim",
      status: "confirmed",
      createdAt: now
    };
    const bookingForB0: Booking = {
      id: "BKG-DEMO-0000",
      memberId: memberB.id,
      packageId: "bridal_outdoor",
      startsAt: "2026-05-02T16:00:00+08:00",
      endsAt: "2026-05-02T17:30:00+08:00",
      studio: "Orchard Studio",
      photographer: "Terence Lim",
      status: "confirmed",
      createdAt: now
    };
    const bookingForB2: Booking = {
      id: "BKG-DEMO-0002",
      memberId: memberB.id,
      packageId: "family_session",
      startsAt: "2026-05-26T10:30:00+08:00",
      endsAt: "2026-05-26T12:00:00+08:00",
      studio: "Tanjong Pagar",
      photographer: "Yusra A.",
      status: "pending",
      createdAt: now
    };
    const bookingForB3: Booking = {
      id: "BKG-DEMO-0003",
      memberId: memberB.id,
      packageId: "personal_branding",
      startsAt: "2026-06-02T16:00:00+08:00",
      endsAt: "2026-06-02T17:30:00+08:00",
      studio: "Orchard Studio",
      photographer: "Terence Lim",
      status: "confirmed",
      createdAt: now
    };

    const pointsEarn740: PointsLedgerEntry = {
      id: "PTS-DEMO-0001",
      memberId: memberB.id,
      kind: "earn",
      points: 740,
      titleZh: "配套购买",
      titleEn: "Package purchase",
      subtitleZh: "Daily Portrait × 4",
      subtitleEn: "Daily Portrait × 4",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    };
    const pointsEarn60Soon: PointsLedgerEntry = {
      id: "PTS-DEMO-0002",
      memberId: memberB.id,
      kind: "earn",
      points: 60,
      titleZh: "活动奖励",
      titleEn: "Promo reward",
      subtitleZh: "限时积分",
      subtitleEn: "Limited-time points",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    const pointsDeduct160A: PointsLedgerEntry = {
      id: "PTS-DEMO-0003",
      memberId: memberB.id,
      kind: "deduct",
      points: 160,
      titleZh: "拍摄扣分",
      titleEn: "Session deduction",
      subtitleZh: "Orchard · 4 May",
      subtitleEn: "Orchard · 4 May",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
    };
    const pointsDeduct160B: PointsLedgerEntry = {
      id: "PTS-DEMO-0004",
      memberId: memberB.id,
      kind: "deduct",
      points: 160,
      titleZh: "调整扣分",
      titleEn: "Manual deduction",
      subtitleZh: "客服手动调整",
      subtitleEn: "Manual adjustment",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    };

    const creditsGrant10: CreditsLedgerEntry = {
      id: "CRD-DEMO-0001",
      memberId: memberB.id,
      kind: "grant",
      credits: 10,
      titleZh: "充值到账",
      titleEn: "Top-up granted",
      subtitleZh: "3888 元 · 10 credits",
      subtitleEn: "3888 · 10 credits",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    const creditsSpend2: CreditsLedgerEntry = {
      id: "CRD-DEMO-0002",
      memberId: memberB.id,
      kind: "spend",
      credits: 2,
      titleZh: "拍摄使用",
      titleEn: "Session used",
      subtitleZh: "已使用 2 次拍摄",
      subtitleEn: "2 sessions",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    return {
      version: 1,
      members: { [memberA.id]: memberA, [memberB.id]: memberB },
      payments: {},
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      ruleConfigs: {
        r_min_gap_days: {
          id: "r_min_gap_days",
          name: "Min gap days",
          description: "Minimum days gap between two confirmed bookings for the same member.",
          value: "7",
          createdAt: now
        },
        r_max_duration_hours: {
          id: "r_max_duration_hours",
          name: "Max duration (hours)",
          description: "Maximum booking duration in hours.",
          value: "2",
          createdAt: now
        },
        r_default_capacity_per_slot: {
          id: "r_default_capacity_per_slot",
          name: "Default capacity/slot",
          description: "Fallback capacity when a studio does not define its own capacity.",
          value: "2",
          createdAt: now
        },
        r_cancel_policy_json: {
          id: "r_cancel_policy_json",
          name: "Cancel policy (JSON)",
          description: "Tiers: cutoffHours/refundRate (credits).",
          value: JSON.stringify(
            [
              { cutoffHours: 48, refundRate: 1 },
              { cutoffHours: 24, refundRate: 0.5 },
              { cutoffHours: 0, refundRate: 0 }
            ],
            null,
            0
          ),
          createdAt: now
        },
        r_reschedule_min_hours: {
          id: "r_reschedule_min_hours",
          name: "Reschedule min hours",
          description: "Minimum hours before start to allow reschedule.",
          value: "24",
          createdAt: now
        }
      },
      studios: {
        // Default colors are stable so Studio1/Studio2 are easy to distinguish.
        s_a: { id: "s_a", name: "Studio A", capacityPerSlot: 2, active: true, color: "#2563eb", createdAt: now },
        s_b: { id: "s_b", name: "Studio B", capacityPerSlot: 2, active: true, color: "#10b981", createdAt: now }
      },
      bookings: {
        [bookingForB0.id]: bookingForB0,
        [bookingForB1.id]: bookingForB1,
        [bookingForB2.id]: bookingForB2,
        [bookingForB3.id]: bookingForB3
      },
      pointsLedgers: {
        [pointsEarn740.id]: pointsEarn740,
        [pointsEarn60Soon.id]: pointsEarn60Soon,
        [pointsDeduct160A.id]: pointsDeduct160A,
        [pointsDeduct160B.id]: pointsDeduct160B
      },
      creditsLedgers: { [creditsGrant10.id]: creditsGrant10, [creditsSpend2.id]: creditsSpend2 },
      topupOrders: {},
      shootOrders: {},
      albums: { [albumForB.id]: albumForB },
      photos,
      notifications: {},
      rules: DEFAULT_RULES
    };
  }

  /**
   * Get the store (cached in memory).
   */
  public async getStore(): Promise<DemoStore> {
    if (this.store) return this.store;
    if (!this.loading) this.loading = this.load();
    this.store = await this.loading;
    // Migrate older demo-store.json data.
    this.store = this.migrate(this.store);
    return this.store;
  }

  /**
   * Migrate persisted store (best-effort, PoC only).
   * - Ensure new fields exist (paymentMethods, studios)
   * - Normalize old bookings that stored studio name instead of studio id.
   */
  private migrate(store: DemoStore): DemoStore {
    // paymentMethods
    store.paymentMethods = store.paymentMethods ?? DEFAULT_PAYMENT_METHODS;

    // studios
    store.studios =
      store.studios ??
      (() => {
        const now = new Date().toISOString();
        return {
          s_a: {
            id: "s_a",
            name: "Studio A",
            capacityPerSlot: store.rules?.capacityPerSlot ?? 2,
            active: true,
            color: "#2563eb",
            createdAt: now
          },
          s_b: {
            id: "s_b",
            name: "Studio B",
            capacityPerSlot: store.rules?.capacityPerSlot ?? 2,
            active: true,
            color: "#10b981",
            createdAt: now
          }
        };
      })();

    // Ensure every studio has a color.
    const palette = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
    const used = new Set(Object.values(store.studios).map((s) => s.color).filter(Boolean));
    let idx = 0;
    for (const s of Object.values(store.studios)) {
      if (s.color) continue;
      while (idx < palette.length && used.has(palette[idx])) idx++;
      s.color = palette[Math.min(idx, palette.length - 1)];
      used.add(s.color);
      idx++;
    }

    // normalize bookings studio field
    for (const b of Object.values(store.bookings ?? {})) {
      const patch = b as unknown as { packageId?: string };
      if (!patch.packageId) patch.packageId = "daily_portrait";
      if (b.studio === "Studio A") b.studio = "s_a";
      if (b.studio === "Studio B") b.studio = "s_b";
    }

    store.pointsLedgers = store.pointsLedgers ?? {};
    store.creditsLedgers = store.creditsLedgers ?? {};
    store.topupOrders = store.topupOrders ?? {};
    store.shootOrders = store.shootOrders ?? {};

    for (const m of Object.values(store.members ?? {})) {
      const patch = m as unknown as { pointsBalance?: number; pointsEarnedTotal?: number };
      if (patch.pointsBalance !== undefined && patch.pointsEarnedTotal !== undefined) continue;
      const entries = Object.values(store.pointsLedgers).filter((p) => p.memberId === m.id);
      const earnedTotal = entries.filter((e) => e.kind === "earn").reduce((sum, e) => sum + e.points, 0);
      const deducted = entries.filter((e) => e.kind === "deduct").reduce((sum, e) => sum + e.points, 0);
      const balance = Math.max(0, earnedTotal - deducted);
      if (patch.pointsBalance === undefined) patch.pointsBalance = balance;
      if (patch.pointsEarnedTotal === undefined) patch.pointsEarnedTotal = earnedTotal;
    }

    const demoB = store.members?.["m_demo_b"];
    if (demoB && demoB.email === "member.b@example.com") {
      store.members["m_demo_b"] = { ...demoB, name: "Alex Tan", email: "alex.tan@studio.sg" };
    }

    if (store.members?.["m_demo_b"]) {
      store.bookings = store.bookings ?? {};
      const createdAt = new Date().toISOString();
      const desired: Booking[] = [
        {
          id: "BKG-DEMO-0000",
          memberId: "m_demo_b",
          packageId: "bridal_outdoor",
          startsAt: "2026-05-02T16:00:00+08:00",
          endsAt: "2026-05-02T17:30:00+08:00",
          studio: "Orchard Studio",
          photographer: "Terence Lim",
          status: "confirmed",
          createdAt
        },
        {
          id: "BKG-DEMO-0001",
          memberId: "m_demo_b",
          packageId: "daily_portrait",
          startsAt: "2026-05-18T14:00:00+08:00",
          endsAt: "2026-05-18T15:30:00+08:00",
          studio: "Orchard Studio",
          photographer: "Terence Lim",
          status: "confirmed",
          createdAt
        },
        {
          id: "BKG-DEMO-0002",
          memberId: "m_demo_b",
          packageId: "family_session",
          startsAt: "2026-05-26T10:30:00+08:00",
          endsAt: "2026-05-26T12:00:00+08:00",
          studio: "Tanjong Pagar",
          photographer: "Yusra A.",
          status: "pending",
          createdAt
        },
        {
          id: "BKG-DEMO-0003",
          memberId: "m_demo_b",
          packageId: "personal_branding",
          startsAt: "2026-06-02T16:00:00+08:00",
          endsAt: "2026-06-02T17:30:00+08:00",
          studio: "Orchard Studio",
          photographer: "Terence Lim",
          status: "confirmed",
          createdAt
        }
      ];
      for (const b of desired) {
        if (!store.bookings[b.id]) store.bookings[b.id] = b;
      }

      const existingBookingIds = new Set(Object.values(store.shootOrders ?? {}).map((o) => o.bookingId));
      for (const b of desired) {
        if (existingBookingIds.has(b.id)) continue;
        const pkg = getShootPackage(b.packageId);
        const creditsCost = pkg?.credits ?? 1;
        const o: ShootOrder = {
          id: `SHO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          memberId: b.memberId,
          packageId: b.packageId,
          creditsCost,
          bookingId: b.id,
          status: b.status === "cancelled" ? "cancelled" : "scheduled",
          createdAt: b.createdAt
        };
        store.shootOrders[o.id] = o;
      }
    }

    if (store.members?.["m_demo_b"]) {
      const hasAnyPoints = Object.values(store.pointsLedgers).some((p) => p.memberId === "m_demo_b");
      const hasAnyCredits = Object.values(store.creditsLedgers).some((c) => c.memberId === "m_demo_b");
      const now = Date.now();
      const createdAt = new Date().toISOString();

      if (!hasAnyPoints) {
        const points: PointsLedgerEntry[] = [
          {
            id: "PTS-DEMO-0001",
            memberId: "m_demo_b",
            kind: "earn",
            points: 740,
            titleZh: "配套购买",
            titleEn: "Package purchase",
            subtitleZh: "Daily Portrait × 4",
            subtitleEn: "Daily Portrait × 4",
            createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "PTS-DEMO-0002",
            memberId: "m_demo_b",
            kind: "earn",
            points: 60,
            titleZh: "活动奖励",
            titleEn: "Promo reward",
            subtitleZh: "限时积分",
            subtitleEn: "Limited-time points",
            createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "PTS-DEMO-0003",
            memberId: "m_demo_b",
            kind: "deduct",
            points: 160,
            titleZh: "拍摄扣分",
            titleEn: "Session deduction",
            subtitleZh: "Orchard · 4 May",
            subtitleEn: "Orchard · 4 May",
            createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "PTS-DEMO-0004",
            memberId: "m_demo_b",
            kind: "deduct",
            points: 160,
            titleZh: "调整扣分",
            titleEn: "Manual deduction",
            subtitleZh: "客服手动调整",
            subtitleEn: "Manual adjustment",
            createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        for (const p of points) {
          if (!store.pointsLedgers[p.id]) store.pointsLedgers[p.id] = p;
        }
      }

      if (!hasAnyCredits) {
        const credits: CreditsLedgerEntry[] = [
          {
            id: "CRD-DEMO-0001",
            memberId: "m_demo_b",
            kind: "grant",
            credits: 10,
            titleZh: "充值到账",
            titleEn: "Top-up granted",
            subtitleZh: "3888 元 · 10 credits",
            subtitleEn: "3888 · 10 credits",
            createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "CRD-DEMO-0002",
            memberId: "m_demo_b",
            kind: "spend",
            credits: 2,
            titleZh: "拍摄使用",
            titleEn: "Session used",
            subtitleZh: "已使用 2 次拍摄",
            subtitleEn: "2 sessions",
            createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        for (const c of credits) {
          if (!store.creditsLedgers[c.id]) store.creditsLedgers[c.id] = c;
        }
      }
      if (store.creditsLedgers?.["CRD-DEMO-0001"] && !store.creditsLedgers["CRD-DEMO-0001"].expiresAt) {
        store.creditsLedgers["CRD-DEMO-0001"] = {
          ...store.creditsLedgers["CRD-DEMO-0001"],
          expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      store.topupOrders = store.topupOrders ?? {};
      if (!store.topupOrders["ORD-DEMO-0001"]) {
        store.topupOrders["ORD-DEMO-0001"] = {
          id: "ORD-DEMO-0001",
          memberId: "m_demo_b",
          packageId: "PKG-3888-10",
          amount: 3888,
          currency: "SGD",
          proofUrl: "/demo-uploads/.gitkeep",
          status: "approved",
          createdAt,
          reviewedAt: createdAt
        };
      }
    }

    // rule configs (generic rule table)
    store.ruleConfigs = store.ruleConfigs ?? (() => {
      const now = new Date().toISOString();
      return {
        r_min_gap_days: {
          id: "r_min_gap_days",
          name: "Min gap days",
          description: "Minimum days gap between two confirmed bookings for the same member.",
          value: String(store.rules?.minGapDays ?? 7),
          createdAt: now
        },
        r_max_duration_hours: {
          id: "r_max_duration_hours",
          name: "Max duration (hours)",
          description: "Maximum booking duration in hours.",
          value: String(Math.round((store.rules?.maxDurationMinutes ?? 120) / 60)),
          createdAt: now
        },
        r_default_capacity_per_slot: {
          id: "r_default_capacity_per_slot",
          name: "Default capacity/slot",
          description: "Fallback capacity when a studio does not define its own capacity.",
          value: String(store.rules?.capacityPerSlot ?? 2),
          createdAt: now
        },
        r_cancel_policy_json: {
          id: "r_cancel_policy_json",
          name: "Cancel policy (JSON)",
          description: "Tiers: cutoffHours/refundRate (credits).",
          value: JSON.stringify(
            [
              { cutoffHours: 48, refundRate: 1 },
              { cutoffHours: 24, refundRate: 0.5 },
              { cutoffHours: 0, refundRate: 0 }
            ],
            null,
            0
          ),
          createdAt: now
        },
        r_reschedule_min_hours: {
          id: "r_reschedule_min_hours",
          name: "Reschedule min hours",
          description: "Minimum hours before start to allow reschedule.",
          value: "24",
          createdAt: now
        }
      };
    })();

    if (!store.ruleConfigs.r_cancel_policy_json) {
      const now = new Date().toISOString();
      store.ruleConfigs.r_cancel_policy_json = {
        id: "r_cancel_policy_json",
        name: "Cancel policy (JSON)",
        description: "Tiers: cutoffHours/refundRate (credits).",
        value: JSON.stringify(
          [
            { cutoffHours: 48, refundRate: 1 },
            { cutoffHours: 24, refundRate: 0.5 },
            { cutoffHours: 0, refundRate: 0 }
          ],
          null,
          0
        ),
        createdAt: now
      };
    }
    if (!store.ruleConfigs.r_reschedule_min_hours) {
      const now = new Date().toISOString();
      store.ruleConfigs.r_reschedule_min_hours = {
        id: "r_reschedule_min_hours",
        name: "Reschedule min hours",
        description: "Minimum hours before start to allow reschedule.",
        value: "24",
        createdAt: now
      };
    }

    // keep legacy rules in sync (best-effort)
    const minGap = Number(store.ruleConfigs.r_min_gap_days?.value ?? store.rules.minGapDays);
    const maxHours = Number(store.ruleConfigs.r_max_duration_hours?.value ?? Math.round(store.rules.maxDurationMinutes / 60));
    const cap = Number(store.ruleConfigs.r_default_capacity_per_slot?.value ?? store.rules.capacityPerSlot);
    if (Number.isFinite(minGap)) store.rules.minGapDays = minGap;
    if (Number.isFinite(maxHours)) store.rules.maxDurationMinutes = maxHours * 60;
    if (Number.isFinite(cap)) store.rules.capacityPerSlot = cap;

    return store;
  }

  /**
   * Rules (generic configs)
   */
  public async listRuleConfigs(): Promise<RuleConfig[]> {
    const store = await this.getStore();
    store.ruleConfigs = store.ruleConfigs ?? {};
    return Object.values(store.ruleConfigs).sort((a, b) => a.name.localeCompare(b.name));
  }

  public async createRuleConfig(params: { name: string; description: string; value: string }): Promise<RuleConfig> {
    const store = await this.getStore();
    store.ruleConfigs = store.ruleConfigs ?? {};
    const now = new Date().toISOString();
    const rule: RuleConfig = {
      id: `r_${crypto.randomUUID().slice(0, 8)}`,
      name: params.name.trim() || "Rule",
      description: params.description.trim(),
      value: params.value.trim(),
      createdAt: now
    };
    store.ruleConfigs[rule.id] = rule;
    await this.persist();
    return rule;
  }

  public async updateRuleConfig(params: { id: string; name?: string; description?: string; value?: string }) {
    const store = await this.getStore();
    store.ruleConfigs = store.ruleConfigs ?? {};
    const current = store.ruleConfigs[params.id];
    if (!current) throw new Error("rule not found");
    const next: RuleConfig = {
      ...current,
      name: params.name !== undefined ? params.name : current.name,
      description: params.description !== undefined ? params.description : current.description,
      value: params.value !== undefined ? params.value : current.value
    };
    store.ruleConfigs[params.id] = next;

    // If it's one of the built-in booking rules, sync to legacy fields.
    if (params.id === "r_min_gap_days") {
      const v = Number(next.value);
      if (Number.isFinite(v)) store.rules.minGapDays = v;
    }
    if (params.id === "r_max_duration_hours") {
      const v = Number(next.value);
      if (Number.isFinite(v)) store.rules.maxDurationMinutes = v * 60;
    }
    if (params.id === "r_default_capacity_per_slot") {
      const v = Number(next.value);
      if (Number.isFinite(v)) store.rules.capacityPerSlot = v;
    }

    await this.persist();
    return next;
  }

  public async deleteRuleConfig(params: { id: string }) {
    const store = await this.getStore();
    store.ruleConfigs = store.ruleConfigs ?? {};
    delete store.ruleConfigs[params.id];
    await this.persist();
  }

  /**
   * Persist current store to disk.
   */
  private async persist(): Promise<void> {
    if (!this.store) return;
    await this.save(this.store);
  }

  /**
   * Get or create a "demo member" associated with current session user.
   * - For member role: binds to a stable member record by email.
   * - For admin role: returns null (admin is not a member).
   */
  public async getMemberForUser(user: UserSession): Promise<Member | null> {
    if (user.role !== "member") return null;
    const store = await this.getStore();
    const found = Object.values(store.members).find((m) => m.email === user.email);
    if (found) return found;

    const now = new Date().toISOString();
    const created: Member = {
      id: `m_${crypto.randomUUID()}`,
      name: user.name,
      email: user.email,
      phone: "+60 00-000 0000",
      memberNo: `MY-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`,
      country: "MY",
      avatarUrl: user.avatarUrl,
      pointsBalance: 0,
      pointsEarnedTotal: 0,
      createdAt: now
    };
    store.members[created.id] = created;
    await this.persist();
    return created;
  }

  /**
   * Calculate membership status from expiry timestamp.
   */
  public getMembershipStatus(member: Member): MembershipStatus {
    if (!member.membershipExpiresAt) return "none";
    const expires = new Date(member.membershipExpiresAt).getTime();
    return expires > Date.now() ? "active" : "expired";
  }

  /**
   * Create a successful payment and activate membership for 365 days.
   */
  public async payAndActivateMembership(params: {
    memberId: string;
    method: Payment["method"];
    amount: number;
    currency: Payment["currency"];
  }): Promise<Payment> {
    const store = await this.getStore();
    const member = store.members[params.memberId];
    if (!member) throw new Error("member not found");

    const methodCfg = store.paymentMethods?.[params.method];
    if (!methodCfg?.enabled) {
      throw new Error("payment method disabled");
    }

    const now = new Date();
    const payment: Payment = {
      id: `TXN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: params.memberId,
      amount: params.amount,
      currency: params.currency,
      method: params.method,
      status: "succeeded",
      createdAt: now.toISOString()
    };
    store.payments[payment.id] = payment;

    member.membershipExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    store.members[member.id] = member;

    this.addNotification(store, {
      memberId: member.id,
      type: "payment",
      title: "Payment succeeded / 付款成功",
      body: `Membership active until ${member.membershipExpiresAt}`
    });

    await this.persist();
    return payment;
  }

  /**
   * List payment method configs in stable order.
   */
  public async listPaymentMethods(): Promise<PaymentMethodConfig[]> {
    const store = await this.getStore();
    const order: PaymentMethod[] = ["FPX", "Credit Card", "DuitNow", "TNG eWallet"];
    // Ensure older stores have the field.
    store.paymentMethods = store.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
    return order.map((m) => store.paymentMethods[m] ?? DEFAULT_PAYMENT_METHODS[m]);
  }

  /**
   * Enable/disable a payment method (demo).
   */
  public async setPaymentMethodEnabled(params: { method: PaymentMethod; enabled: boolean }): Promise<void> {
    const store = await this.getStore();
    store.paymentMethods = store.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
    const current = store.paymentMethods[params.method] ?? DEFAULT_PAYMENT_METHODS[params.method];
    store.paymentMethods[params.method] = { ...current, enabled: params.enabled };
    await this.persist();
  }

  /**
   * Update booking rules for demo.
   */
  public async updateRules(next: Partial<Rules>): Promise<Rules> {
    const store = await this.getStore();
    store.rules = {
      minGapDays: Math.max(0, next.minGapDays ?? store.rules.minGapDays),
      maxDurationMinutes: Math.max(15, next.maxDurationMinutes ?? store.rules.maxDurationMinutes),
      capacityPerSlot: Math.max(1, next.capacityPerSlot ?? store.rules.capacityPerSlot)
    };
    await this.persist();
    return store.rules;
  }

  /**
   * Create a booking with basic rule checks.
   * Returns either {ok:true, booking} or {ok:false, reason}.
   */
  public async createBooking(params: {
    memberId: string;
    packageId: string;
    startsAt: string;
    endsAt: string;
    studio: string;
    photographer: string;
    consumeCredits?: boolean;
  }): Promise<{ ok: true; booking: Booking } | { ok: false; reason: string }> {
    const store = await this.getStore();
    const member = store.members[params.memberId];
    if (!member) return { ok: false, reason: "Member not found" };

    const pkg = getShootPackage(params.packageId);
    if (!pkg) return { ok: false, reason: "Invalid package" };

    const starts = new Date(params.startsAt);
    const ends = new Date(params.endsAt);
    const durationMinutes = Math.round((ends.getTime() - starts.getTime()) / 60000);
    if (durationMinutes <= 0) return { ok: false, reason: "Invalid time range" };
    if (durationMinutes > store.rules.maxDurationMinutes) {
      return { ok: false, reason: `Max duration is ${store.rules.maxDurationMinutes} minutes` };
    }

    const membershipStatus = this.getMembershipStatus(member);
    if (membershipStatus !== "active") {
      return { ok: false, reason: "Membership inactive" };
    }

    // min gap check (per member).
    const confirmed = Object.values(store.bookings).filter(
      (b) => b.memberId === params.memberId && b.status === "confirmed"
    );
    const minGapMs = store.rules.minGapDays * 24 * 60 * 60 * 1000;
    const tooClose = confirmed.some((b) => {
      const bStart = new Date(b.startsAt).getTime();
      return Math.abs(bStart - starts.getTime()) < minGapMs;
    });
    if (tooClose) return { ok: false, reason: `Min gap is ${store.rules.minGapDays} days` };

    // capacity check (studio + startsAt).
    // - Prefer per-studio capacity if studio id exists in store.
    const studioCfg = store.studios?.[params.studio];
    const capacityLimit = studioCfg?.capacityPerSlot ?? store.rules.capacityPerSlot;
    const sameSlotCount = Object.values(store.bookings).filter(
      (b) => b.status === "confirmed" && b.studio === params.studio && b.startsAt === params.startsAt
    ).length;
    if (sameSlotCount >= capacityLimit) return { ok: false, reason: "Slot is full" };

    const consumeCredits = params.consumeCredits !== false;
    if (consumeCredits) {
      const creditsSummary = await this.getMemberCreditsSummary({ memberId: params.memberId });
      if (creditsSummary.balance < pkg.credits) return { ok: false, reason: "Insufficient credits" };
    }

    const now = new Date().toISOString();
    const booking: Booking = {
      id: `BKG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: params.memberId,
      packageId: pkg.id,
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      studio: params.studio,
      photographer: params.photographer,
      status: "confirmed",
      createdAt: now
    };
    store.bookings[booking.id] = booking;

    if (consumeCredits) {
      store.creditsLedgers = store.creditsLedgers ?? {};
      const spend: CreditsLedgerEntry = {
        id: `CRD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        memberId: member.id,
        kind: "spend",
        credits: pkg.credits,
        titleZh: "拍摄配套下单",
        titleEn: "Credits spent",
        subtitleZh: `${pkg.titleZh} · ${booking.id}`,
        subtitleEn: `${pkg.titleEn} · ${booking.id}`,
        createdAt: now
      };
      store.creditsLedgers[spend.id] = spend;
    }

    this.addNotification(store, {
      memberId: member.id,
      type: "booking",
      title: "Booking confirmed / 预约成功",
      body: `${booking.startsAt.slice(0, 16).replace("T", " ")} · ${booking.studio} · ${pkg.titleEn}`
    });

    await this.persist();
    return { ok: true, booking };
  }

  private parseCancelPolicy(value?: string) {
    const fallback = [
      { cutoffHours: 48, refundRate: 1 },
      { cutoffHours: 24, refundRate: 0.5 },
      { cutoffHours: 0, refundRate: 0 }
    ];
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value) as Array<{ cutoffHours?: number; refundRate?: number }>;
      const normalized = (parsed ?? [])
        .map((t) => ({
          cutoffHours: Math.max(0, Number(t.cutoffHours ?? 0)),
          refundRate: Math.max(0, Math.min(1, Number(t.refundRate ?? 0)))
        }))
        .filter((t) => Number.isFinite(t.cutoffHours) && Number.isFinite(t.refundRate));
      return normalized.length ? normalized : fallback;
    } catch {
      return fallback;
    }
  }

  private getRescheduleMinHours(value?: string) {
    const v = Number(value ?? 24);
    return Number.isFinite(v) ? Math.max(0, v) : 24;
  }

  public async placeShootOrder(params: {
    memberId: string;
    packageId: string;
    startsAt: string;
    endsAt: string;
    studio: string;
    photographer: string;
  }): Promise<{ ok: true; order: ShootOrder } | { ok: false; reason: string }> {
    const pkg = getShootPackage(params.packageId);
    if (!pkg) return { ok: false, reason: "Invalid package" };
    const booking = await this.createBooking({ ...params, consumeCredits: true });
    if (!booking.ok) return booking;
    const store = await this.getStore();
    store.shootOrders = store.shootOrders ?? {};
    const now = new Date().toISOString();
    const order: ShootOrder = {
      id: `SHO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: params.memberId,
      packageId: pkg.id,
      creditsCost: pkg.credits,
      bookingId: booking.booking.id,
      status: "scheduled",
      createdAt: now
    };
    store.shootOrders[order.id] = order;
    await this.persist();
    return { ok: true, order };
  }

  public async cancelShootOrder(params: {
    memberId: string;
    shootOrderId: string;
  }): Promise<{ ok: true; order: ShootOrder } | { ok: false; reason: string }> {
    const store = await this.getStore();
    store.shootOrders = store.shootOrders ?? {};
    const order = store.shootOrders[params.shootOrderId];
    if (!order) return { ok: false, reason: "Order not found" };
    if (order.memberId !== params.memberId) return { ok: false, reason: "Forbidden" };
    if (order.status !== "scheduled") return { ok: false, reason: "Order not cancellable" };
    const booking = store.bookings[order.bookingId];
    if (!booking) return { ok: false, reason: "Booking not found" };

    const tiers = this.parseCancelPolicy(store.ruleConfigs?.r_cancel_policy_json?.value);
    const startMs = new Date(booking.startsAt).getTime();
    const hoursToStart = (startMs - Date.now()) / 3600000;
    const sorted = [...tiers].sort((a, b) => b.cutoffHours - a.cutoffHours);
    const chosen = sorted.find((t) => hoursToStart >= t.cutoffHours) ?? sorted[sorted.length - 1];
    const refundCredits = Math.max(0, Math.floor(order.creditsCost * chosen.refundRate));

    booking.status = "cancelled";
    store.bookings[booking.id] = booking;

    if (refundCredits > 0) {
      store.creditsLedgers = store.creditsLedgers ?? {};
      const now = new Date().toISOString();
      const refund: CreditsLedgerEntry = {
        id: `CRD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        memberId: params.memberId,
        kind: "adjust",
        credits: refundCredits,
        titleZh: "取消退回",
        titleEn: "Refund",
        subtitleZh: `${order.packageId} · ${order.id}`,
        subtitleEn: `${order.packageId} · ${order.id}`,
        createdAt: now
      };
      store.creditsLedgers[refund.id] = refund;
    }

    const cancelledAt = new Date().toISOString();
    const next: ShootOrder = { ...order, status: "cancelled", cancelledAt, refundCredits };
    store.shootOrders[order.id] = next;
    await this.persist();
    return { ok: true, order: next };
  }

  public async rescheduleShootOrder(params: {
    memberId: string;
    shootOrderId: string;
    startsAt: string;
    endsAt: string;
    studio: string;
    photographer: string;
  }): Promise<{ ok: true; order: ShootOrder } | { ok: false; reason: string }> {
    const store = await this.getStore();
    store.shootOrders = store.shootOrders ?? {};
    const order = store.shootOrders[params.shootOrderId];
    if (!order) return { ok: false, reason: "Order not found" };
    if (order.memberId !== params.memberId) return { ok: false, reason: "Forbidden" };
    if (order.status !== "scheduled") return { ok: false, reason: "Order not reschedulable" };
    const booking = store.bookings[order.bookingId];
    if (!booking) return { ok: false, reason: "Booking not found" };

    const minHours = this.getRescheduleMinHours(store.ruleConfigs?.r_reschedule_min_hours?.value);
    const startMs = new Date(booking.startsAt).getTime();
    const hoursToStart = (startMs - Date.now()) / 3600000;
    if (hoursToStart < minHours) return { ok: false, reason: "Reschedule window closed" };

    const nextBooking = await this.createBooking({
      memberId: params.memberId,
      packageId: order.packageId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      studio: params.studio,
      photographer: params.photographer,
      consumeCredits: false
    });
    if (!nextBooking.ok) return nextBooking;

    booking.status = "cancelled";
    store.bookings[booking.id] = booking;

    const rescheduledAt = new Date().toISOString();
    const next: ShootOrder = {
      ...order,
      bookingId: nextBooking.booking.id,
      previousBookingId: order.bookingId,
      rescheduledAt
    };
    store.shootOrders[order.id] = next;
    await this.persist();
    return { ok: true, order: next };
  }

  public async completeShootOrder(params: { shootOrderId: string }): Promise<ShootOrder> {
    const store = await this.getStore();
    store.shootOrders = store.shootOrders ?? {};
    const current = store.shootOrders[params.shootOrderId];
    if (!current) throw new Error("order not found");
    const next: ShootOrder = { ...current, status: "completed" };
    store.shootOrders[params.shootOrderId] = next;
    await this.persist();
    return next;
  }

  /**
   * Create a delivered album for a booking (demo upload).
   * Generates placeholder photo URLs and notifies member.
   */
  public async deliverAlbumFromBooking(params: { bookingId: string; retouchLimit?: number }): Promise<PhotoAlbum> {
    const store = await this.getStore();
    const booking = store.bookings[params.bookingId];
    if (!booking) throw new Error("booking not found");

    const shootDate = booking.startsAt.slice(0, 10);
    const retouchLimit = params.retouchLimit ?? 5;
    const now = new Date().toISOString();
    const album: PhotoAlbum = {
      id: `ALB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: booking.memberId,
      bookingId: booking.id,
      shootDate,
      title: `Shoot ${shootDate}`,
      status: "delivered",
      retouchLimit,
      retouchSelectedPhotoIds: [],
      createdAt: now,
      deliveredAt: now
    };
    store.albums[album.id] = album;

    // Generate 12 demo photos.
    for (let i = 1; i <= 12; i++) {
      const photo: Photo = {
        id: `P-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        albumId: album.id,
        url: `https://picsum.photos/seed/${album.id}_${i}/1200/900`,
        filename: `demo_${i}.jpg`,
        source: "remote",
        createdAt: now
      };
      store.photos[photo.id] = photo;
    }

    this.addNotification(store, {
      memberId: booking.memberId,
      type: "photos",
      title: "Photos ready / 照片已上传",
      body: `Album "${album.title}" is ready. You can preview/download and select retouch.`
    });

    await this.persist();
    return album;
  }

  /**
   * Member selects retouch photos for an album (limit enforced).
   */
  public async submitRetouchSelection(params: {
    memberId: string;
    albumId: string;
    selectedPhotoIds: string[];
  }): Promise<{ ok: true; album: PhotoAlbum } | { ok: false; reason: string }> {
    const store = await this.getStore();
    const album = store.albums[params.albumId];
    if (!album) return { ok: false, reason: "Album not found" };
    if (album.memberId !== params.memberId) return { ok: false, reason: "Forbidden" };
    if (album.status !== "delivered" && album.status !== "retouch_requested") {
      return { ok: false, reason: "Album not ready" };
    }

    // Ensure photos belong to this album.
    const photoSet = new Set(
      Object.values(store.photos)
        .filter((p) => p.albumId === album.id)
        .map((p) => p.id)
    );
    const selected = Array.from(new Set(params.selectedPhotoIds)).filter((id) => photoSet.has(id));
    if (selected.length > album.retouchLimit) {
      return { ok: false, reason: `Retouch limit is ${album.retouchLimit}` };
    }

    album.retouchSelectedPhotoIds = selected;
    album.status = "retouch_requested";
    store.albums[album.id] = album;

    this.addNotification(store, {
      memberId: album.memberId,
      type: "photos",
      title: "Retouch request submitted / 精修已提交",
      body: `Selected ${selected.length}/${album.retouchLimit} photos for retouch.`
    });

    await this.persist();
    return { ok: true, album };
  }

  /**
   * Admin marks retouch done (demo).
   */
  public async markRetouchDone(params: { albumId: string }): Promise<PhotoAlbum> {
    const store = await this.getStore();
    const album = store.albums[params.albumId];
    if (!album) throw new Error("album not found");

    album.status = "retouch_done";
    album.retouchDoneAt = new Date().toISOString();
    store.albums[album.id] = album;

    this.addNotification(store, {
      memberId: album.memberId,
      type: "photos",
      title: "Retouch completed / 精修完成",
      body: `Album "${album.title}" retouch is completed.`
    });

    await this.persist();
    return album;
  }

  /**
   * List albums for a member (or all if no memberId).
   */
  public async listAlbums(params?: { memberId?: string }): Promise<PhotoAlbum[]> {
    const store = await this.getStore();
    const all = Object.values(store.albums);
    const filtered = params?.memberId ? all.filter((a) => a.memberId === params.memberId) : all;
    return filtered.sort((a, b) => b.shootDate.localeCompare(a.shootDate));
  }

  /**
   * List photos for an album.
   */
  public async listPhotos(params: { albumId: string }): Promise<Photo[]> {
    const store = await this.getStore();
    return Object.values(store.photos).filter((p) => p.albumId === params.albumId);
  }

  /**
   * Add a photo record (used by admin upload in PoC).
   */
  public async addPhotoToAlbum(params: { albumId: string; url: string; filename: string; source: Photo["source"] }) {
    const store = await this.getStore();
    const album = store.albums[params.albumId];
    if (!album) throw new Error("album not found");
    const now = new Date().toISOString();
    const photo: Photo = {
      id: `P-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      albumId: params.albumId,
      url: params.url,
      filename: params.filename,
      source: params.source ?? "local",
      createdAt: now
    };
    store.photos[photo.id] = photo;
    await this.persist();
    return photo;
  }

  /**
   * List notifications for a member.
   */
  public async listNotifications(params: { memberId: string }): Promise<Notification[]> {
    const store = await this.getStore();
    return Object.values(store.notifications)
      .filter((n) => n.memberId === params.memberId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Mark a notification as read.
   */
  public async markNotificationRead(params: { memberId: string; notificationId: string }): Promise<void> {
    const store = await this.getStore();
    const n = store.notifications[params.notificationId];
    if (!n) return;
    if (n.memberId !== params.memberId) return;
    n.readAt = new Date().toISOString();
    store.notifications[n.id] = n;
    await this.persist();
  }

  /**
   * Internal helper: create a notification record.
   */
  private addNotification(
    store: DemoStore,
    payload: Omit<Notification, "id" | "createdAt" | "readAt">
  ): Notification {
    const createdAt = new Date().toISOString();
    const n: Notification = {
      id: `NTF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAt,
      ...payload
    };
    store.notifications[n.id] = n;
    return n;
  }

  /**
   * List members with derived membership status.
   */
  public async listMembers(): Promise<Array<Member & { membershipStatus: MembershipStatus }>> {
    const store = await this.getStore();
    return Object.values(store.members).map((m) => ({ ...m, membershipStatus: this.getMembershipStatus(m) }));
  }

  /**
   * List bookings (optionally by member).
   */
  public async listBookings(params?: { memberId?: string }): Promise<Booking[]> {
    const store = await this.getStore();
    const all = Object.values(store.bookings);
    const filtered = params?.memberId ? all.filter((b) => b.memberId === params.memberId) : all;
    return filtered.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  public async listPointsLedgers(params: { memberId: string }): Promise<PointsLedgerEntry[]> {
    const store = await this.getStore();
    const all = Object.values(store.pointsLedgers ?? {});
    return all
      .filter((p) => p.memberId === params.memberId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async listCreditsLedgers(params: { memberId: string }): Promise<CreditsLedgerEntry[]> {
    const store = await this.getStore();
    const all = Object.values(store.creditsLedgers ?? {});
    return all
      .filter((c) => c.memberId === params.memberId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async listTopupOrders(params?: { memberId?: string }): Promise<TopupOrder[]> {
    const store = await this.getStore();
    const all = Object.values(store.topupOrders ?? {});
    const filtered = params?.memberId ? all.filter((o) => o.memberId === params.memberId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async listShootOrders(params?: { memberId?: string }): Promise<ShootOrder[]> {
    const store = await this.getStore();
    store.shootOrders = store.shootOrders ?? {};
    const all = Object.values(store.shootOrders);
    const filtered = params?.memberId ? all.filter((o) => o.memberId === params.memberId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public getMemberLevelFromPoints(pointsEarnedTotal: number) {
    if (pointsEarnedTotal >= 500) return 3;
    if (pointsEarnedTotal >= 300) return 2;
    if (pointsEarnedTotal >= 100) return 1;
    return 0;
  }

  public async getMemberPointsSummary(params: { memberId: string }) {
    const store = await this.getStore();
    const member = store.members[params.memberId];
    if (!member) return { available: 0, expiringSoon: 0, earnedTotal: 0, level: 0 };
    const available = Math.max(0, member.pointsBalance ?? 0);
    const earnedTotal = Math.max(0, member.pointsEarnedTotal ?? member.pointsBalance ?? 0);
    const level = this.getMemberLevelFromPoints(earnedTotal);
    return { available, expiringSoon: 0, earnedTotal, level };
  }

  public async getMemberCreditsSummary(params: { memberId: string }) {
    const entries = await this.listCreditsLedgers({ memberId: params.memberId });
    const now = Date.now();
    const soonUntil = now + 30 * 24 * 60 * 60 * 1000;

    const grants = entries
      .filter((e) => e.kind === "grant" || e.kind === "adjust")
      .sort((a, b) => {
        const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.POSITIVE_INFINITY;
        const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.POSITIVE_INFINITY;
        if (aExp !== bExp) return aExp - bExp;
        return a.createdAt.localeCompare(b.createdAt);
      });

    let spendLeft = entries.filter((e) => e.kind === "spend").reduce((sum, e) => sum + e.credits, 0);
    const remainingById = new Map<string, number>();

    for (const g of grants) {
      const consume = Math.max(0, Math.min(g.credits, spendLeft));
      const remain = Math.max(0, g.credits - consume);
      remainingById.set(g.id, remain);
      spendLeft -= consume;
      if (spendLeft <= 0) break;
    }

    for (const g of grants) {
      if (!remainingById.has(g.id)) remainingById.set(g.id, g.credits);
    }

    const nonExpired = grants
      .map((g) => {
        const exp = g.expiresAt ? new Date(g.expiresAt).getTime() : Number.POSITIVE_INFINITY;
        const remaining = remainingById.get(g.id) ?? 0;
        return { g, exp, remaining };
      })
      .filter((x) => {
        if (!x.remaining) return false;
        if (!x.g.expiresAt) return true;
        return Number.isFinite(x.exp) && x.exp > now;
      });

    const balance = nonExpired.reduce((sum, x) => sum + x.remaining, 0);

    const expiringSoon = nonExpired
      .filter((x) => x.g.expiresAt && Number.isFinite(x.exp) && x.exp <= soonUntil)
      .sort((a, b) => a.exp - b.exp);

    const first = expiringSoon[0] ?? null;
    const nextExpiryAt = first?.g.expiresAt ?? null;
    const expiringCredits =
      first && nextExpiryAt
        ? expiringSoon.filter((x) => x.g.expiresAt === nextExpiryAt).reduce((sum, x) => sum + x.remaining, 0)
        : 0;

    return { balance, expiringCredits, nextExpiryAt };
  }

  public async createTopupOrder(params: {
    memberId: string;
    packageId: string;
    amount: number;
    currency: TopupOrder["currency"];
    proofUrl: string;
  }): Promise<TopupOrder> {
    const store = await this.getStore();
    store.topupOrders = store.topupOrders ?? {};
    const now = new Date().toISOString();
    const order: TopupOrder = {
      id: `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: params.memberId,
      packageId: params.packageId,
      amount: params.amount,
      currency: params.currency,
      proofUrl: params.proofUrl,
      status: "submitted",
      createdAt: now
    };
    store.topupOrders[order.id] = order;
    await this.persist();
    return order;
  }

  public async reviewTopupOrder(params: {
    orderId: string;
    status: TopupOrderStatus;
    grants?: { credits: number; creditsExpiresAt?: string; points: number; pointsExpiresAt?: string };
  }): Promise<TopupOrder> {
    const store = await this.getStore();
    store.topupOrders = store.topupOrders ?? {};
    const current = store.topupOrders[params.orderId];
    if (!current) throw new Error("order not found");
    const reviewedAt = new Date().toISOString();
    const next: TopupOrder = { ...current, status: params.status, reviewedAt };
    store.topupOrders[params.orderId] = next;

    if (params.status === "approved" && params.grants) {
      store.creditsLedgers = store.creditsLedgers ?? {};
      store.pointsLedgers = store.pointsLedgers ?? {};
      const createdAt = reviewedAt;
      const credits: CreditsLedgerEntry = {
        id: `CRD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        memberId: next.memberId,
        kind: "grant",
        credits: params.grants.credits,
        titleZh: "充值到账",
        titleEn: "Top-up granted",
        subtitleZh: `${next.amount} ${next.currency} · ${params.grants.credits} credits`,
        subtitleEn: `${next.amount} ${next.currency} · ${params.grants.credits} credits`,
        createdAt,
        expiresAt: params.grants.creditsExpiresAt
      };
      store.creditsLedgers[credits.id] = credits;

      const member = store.members?.[next.memberId];
      if (member) {
        const patch = member as unknown as { pointsBalance?: number; pointsEarnedTotal?: number };
        const baseBalance = patch.pointsBalance ?? 0;
        const baseEarned = patch.pointsEarnedTotal ?? baseBalance;
        patch.pointsBalance = baseBalance + params.grants.points;
        patch.pointsEarnedTotal = baseEarned + params.grants.points;
        store.members[next.memberId] = member;
      }

      const points: PointsLedgerEntry = {
        id: `PTS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        memberId: next.memberId,
        kind: "earn",
        points: params.grants.points,
        titleZh: "充值积分",
        titleEn: "Top-up points",
        subtitleZh: `${next.amount} ${next.currency}`,
        subtitleEn: `${next.amount} ${next.currency}`,
        createdAt,
        expiresAt: params.grants.pointsExpiresAt
      };
      store.pointsLedgers[points.id] = points;
    }

    await this.persist();
    return next;
  }

  /**
   * List payments (optionally by member).
   */
  public async listPayments(params?: { memberId?: string }): Promise<Payment[]> {
    const store = await this.getStore();
    const all = Object.values(store.payments);
    const filtered = params?.memberId ? all.filter((p) => p.memberId === params.memberId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * List active studios for selection.
   */
  public async listStudios(params?: { includeInactive?: boolean }): Promise<Studio[]> {
    const store = await this.getStore();
    const all = Object.values(store.studios ?? {});
    const filtered = params?.includeInactive ? all : all.filter((s) => s.active);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Create a studio (demo).
   */
  public async createStudio(params: { name: string; capacityPerSlot: number }): Promise<Studio> {
    const store = await this.getStore();
    store.studios = store.studios ?? {};
    const now = new Date().toISOString();
    const palette = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
    const used = new Set(Object.values(store.studios).map((s) => s.color).filter(Boolean));
    const color = palette.find((c) => !used.has(c)) ?? "#2563eb";
    const studio: Studio = {
      id: `s_${crypto.randomUUID().slice(0, 8)}`,
      name: params.name.trim() || "Studio",
      capacityPerSlot: Math.max(1, Math.floor(params.capacityPerSlot || 1)),
      active: true,
      color,
      createdAt: now
    };
    store.studios[studio.id] = studio;
    await this.persist();
    return studio;
  }

  /**
   * Update a studio (demo).
   */
  public async updateStudio(params: {
    id: string;
    name?: string;
    capacityPerSlot?: number;
    active?: boolean;
  }): Promise<Studio> {
    const store = await this.getStore();
    const current = store.studios?.[params.id];
    if (!current) throw new Error("studio not found");
    const next: Studio = {
      ...current,
      name: params.name !== undefined ? params.name.trim() || current.name : current.name,
      capacityPerSlot:
        params.capacityPerSlot !== undefined ? Math.max(1, Math.floor(params.capacityPerSlot)) : current.capacityPerSlot,
      active: params.active !== undefined ? params.active : current.active
    };
    store.studios[params.id] = next;
    await this.persist();
    return next;
  }

  /**
   * Delete a studio (demo). If referenced by bookings, we "deactivate" instead.
   */
  public async deleteStudio(params: { id: string }): Promise<void> {
    const store = await this.getStore();
    const current = store.studios?.[params.id];
    if (!current) return;
    const referenced = Object.values(store.bookings).some((b) => b.studio === params.id);
    if (referenced) {
      store.studios[params.id] = { ...current, active: false };
    } else {
      delete store.studios[params.id];
    }
    await this.persist();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __mmDemoStoreService: DemoStoreService | undefined;
}

/**
 * Singleton accessor (keeps state across HMR in dev).
 */
export function getDemoStoreService(): DemoStoreService {
  if (!globalThis.__mmDemoStoreService) globalThis.__mmDemoStoreService = new DemoStoreService();
  return globalThis.__mmDemoStoreService;
}

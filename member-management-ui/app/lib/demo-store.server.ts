import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { UserSession } from "~/lib/session.server";

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
  startsAt: string; // ISO
  endsAt: string; // ISO
  studio: string;
  photographer: string;
  status: "confirmed" | "cancelled";
  createdAt: string; // ISO
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
      createdAt: now
    };
    const memberB: Member = {
      id: "m_demo_b",
      name: "Member B",
      email: "member.b@example.com",
      phone: "+65 8123 4567",
      memberNo: "SG-2026-000045",
      country: "SG",
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
        }
      },
      studios: {
        // Default colors are stable so Studio1/Studio2 are easy to distinguish.
        s_a: { id: "s_a", name: "Studio A", capacityPerSlot: 2, active: true, color: "#2563eb", createdAt: now },
        s_b: { id: "s_b", name: "Studio B", capacityPerSlot: 2, active: true, color: "#10b981", createdAt: now }
      },
      bookings: {},
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
      if (b.studio === "Studio A") b.studio = "s_a";
      if (b.studio === "Studio B") b.studio = "s_b";
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
        }
      };
    })();

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
    startsAt: string;
    endsAt: string;
    studio: string;
    photographer: string;
  }): Promise<{ ok: true; booking: Booking } | { ok: false; reason: string }> {
    const store = await this.getStore();
    const member = store.members[params.memberId];
    if (!member) return { ok: false, reason: "Member not found" };

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

    const now = new Date().toISOString();
    const booking: Booking = {
      id: `BKG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      memberId: params.memberId,
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      studio: params.studio,
      photographer: params.photographer,
      status: "confirmed",
      createdAt: now
    };
    store.bookings[booking.id] = booking;

    this.addNotification(store, {
      memberId: member.id,
      type: "booking",
      title: "Booking confirmed / 预约成功",
      body: `${booking.startsAt.slice(0, 16).replace("T", " ")} · ${booking.studio}`
    });

    await this.persist();
    return { ok: true, booking };
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

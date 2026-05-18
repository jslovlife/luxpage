export type ShootPackage = {
  id: string;
  titleZh: string;
  titleEn: string;
  price: string;
  duration: string;
  credits: number;
  highlightsZh: string[];
  highlightsEn: string[];
  notesZh: string[];
  notesEn: string[];
  bannerUrl: string;
};

function imageUrl(prompt: string, image_size: string) {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${image_size}`;
}

export const SHOOT_PACKAGES: ShootPackage[] = [
  {
    id: "daily_portrait",
    titleZh: "日常肖像",
    titleEn: "Daily Portrait",
    price: "S$ 380",
    duration: "120 分",
    credits: 1,
    highlightsZh: ["影棚拍摄", "轻妆造建议", "精选精修 5 张"],
    highlightsEn: ["Studio session", "Light styling guidance", "5 retouched selects"],
    notesZh: ["交付时间：7–10 个工作日", "可加购精修"],
    notesEn: ["Delivery: 7–10 business days", "Extra retouch available"],
    bannerUrl: imageUrl(
      "luxury editorial photography studio cover image, warm beige and champagne palette, soft window light, minimal set, subtle film grain, shallow depth of field, no text, no logo, high-end lifestyle look, clean composition",
      "landscape_16_9"
    )
  },
  {
    id: "bridal_outdoor",
    titleZh: "婚纱外拍",
    titleEn: "Bridal Outdoor",
    price: "S$ 980",
    duration: "480 分",
    credits: 2,
    highlightsZh: ["户外场景", "多套造型", "精选精修 15 张"],
    highlightsEn: ["Outdoor locations", "Multiple looks", "15 retouched selects"],
    notesZh: ["交付时间：10–14 个工作日", "行程与天气需提前确认"],
    notesEn: ["Delivery: 10–14 business days", "Schedule & weather confirmation required"],
    bannerUrl: imageUrl(
      "high-end bridal outdoor photoshoot cover image, golden hour light, cinematic tone, elegant silhouette, soft bokeh, warm luxury color grading, subtle film grain, no text, no logo, editorial composition",
      "landscape_16_9"
    )
  },
  {
    id: "family_session",
    titleZh: "家庭合影",
    titleEn: "Family Session",
    price: "S$ 480",
    duration: "180 分",
    credits: 1,
    highlightsZh: ["适合 2–6 人", "自然互动引导", "精选精修 8 张"],
    highlightsEn: ["2–6 pax", "Guided interactions", "8 retouched selects"],
    notesZh: ["可选择影棚或户外", "建议着装色系统一"],
    notesEn: ["Studio or outdoor", "Suggested coordinated outfits"],
    bannerUrl: imageUrl(
      "warm family portrait studio cover image, neutral beige background, soft diffused light, gentle candid moment, premium lifestyle photography style, clean minimal composition, subtle film grain, no text, no logo",
      "landscape_16_9"
    )
  },
  {
    id: "couple_story",
    titleZh: "情侣故事",
    titleEn: "Couple Story",
    price: "S$ 520",
    duration: "150 分",
    credits: 1,
    highlightsZh: ["纪实叙事风格", "两套造型", "精选精修 10 张"],
    highlightsEn: ["Documentary storytelling", "Two looks", "10 retouched selects"],
    notesZh: ["可在影棚或城市街景拍摄", "建议提前沟通风格参考"],
    notesEn: ["Studio or city streets", "Share style references beforehand"],
    bannerUrl: imageUrl(
      "premium couple portrait cover image, urban evening bokeh, warm tungsten highlights, refined editorial fashion vibe, subtle film grain, no text, no logo, soft contrast, elegant composition",
      "landscape_16_9"
    )
  },
  {
    id: "personal_branding",
    titleZh: "个人形象",
    titleEn: "Personal Branding",
    price: "S$ 680",
    duration: "180 分",
    credits: 1,
    highlightsZh: ["商务形象 + 生活化两组", "多背景快速切换", "精选精修 12 张"],
    highlightsEn: ["Business + lifestyle sets", "Fast background swaps", "12 retouched selects"],
    notesZh: ["适合名片/LinkedIn/官网", "可加购发型造型"],
    notesEn: ["For LinkedIn / website / PR", "Optional hair styling add-on"],
    bannerUrl: imageUrl(
      "high-end personal branding portrait cover image, modern studio backdrop, soft directional light, premium editorial look, warm neutral palette, subtle film grain, no text, no logo, clean composition",
      "landscape_16_9"
    )
  },
  {
    id: "maternity_glow",
    titleZh: "孕期纪念",
    titleEn: "Maternity Glow",
    price: "S$ 580",
    duration: "160 分",
    credits: 1,
    highlightsZh: ["柔光氛围", "可含伴侣合影", "精选精修 10 张"],
    highlightsEn: ["Soft luminous mood", "Partner shots included", "10 retouched selects"],
    notesZh: ["建议孕 28–34 周拍摄", "提供基础姿势引导"],
    notesEn: ["Recommended week 28–34", "Posing guidance included"],
    bannerUrl: imageUrl(
      "luxury maternity portrait cover image, soft creamy beige tones, gentle rim light, serene mood, premium editorial lifestyle photography, subtle film grain, no text, no logo, clean minimal composition",
      "landscape_16_9"
    )
  }
];

export function getShootPackage(id: string) {
  return SHOOT_PACKAGES.find((p) => p.id === id) ?? null;
}


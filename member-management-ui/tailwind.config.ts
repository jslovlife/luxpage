import type { Config } from "tailwindcss";

/**
 * Tailwind 配置。
 * 说明：这里只做基础配置，颜色/字体等可后续按品牌再扩展。
 */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;


/** @type {import("@remix-run/dev").AppConfig} */
export default {
  ignoredRouteFiles: ["**/*.css"],
  // 交给 Remix 处理 PostCSS + Tailwind
  tailwind: true,
  postcss: true
};


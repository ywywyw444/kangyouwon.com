import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // 개발 환경에서 PWA 완전 비활성화 (HMR 문제 해결)
  disable: process.env.NODE_ENV === "development",
  // Service Worker 통신 문제 해결을 위한 추가 설정
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24시간
        },
      },
    },
  ],
  // Service Worker 파일명 커스터마이징
  sw: "sw.js",
  // 메시지 채널 타임아웃 설정
  buildExcludes: [/middleware-manifest\.json$/],
})({
  /* config options here */
});

export default nextConfig;

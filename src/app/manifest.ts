import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyFlow — Tài chính cá nhân & Tài sản ròng",
    short_name: "MoneyFlow",
    description:
      "Ghi thu chi trong 3 giây, kiểm soát Safe-to-Spend, theo dõi đầu tư tích lũy và sao lưu dữ liệu cục bộ bất kỳ lúc nào.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F8FAFC",
    theme_color: "#5B4FE9",
    lang: "vi",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Ghi khoản chi",
        short_name: "Ghi nhanh",
        description: "Mở bàn phím số & thanh lệnh ghi chi tiêu",
        url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Bảng điều hành",
        short_name: "Tổng quan",
        description: "Mở màn hình Safe-to-Spend & Tài sản ròng",
        url: "/dashboard",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}

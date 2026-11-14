import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyFlow v3.0 — La bàn Dòng tiền",
    short_name: "MoneyFlow",
    description:
      "La bàn dòng tiền cá nhân: Safe-to-Spend theo ngày, Quick Input 1.5s, Smart Split và di cư dữ liệu không mất mát.",
    start_url: "/",
    display: "standalone",
    background_color: "#070B14",
    theme_color: "#10B981",
    orientation: "any",
    lang: "vi",
    categories: ["finance", "productivity"],
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

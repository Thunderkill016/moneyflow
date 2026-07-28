import type { MetadataRoute } from "next";

/**
 * Web app manifest — PWA install + share_target (TASK-021).
 * Share POSTs multipart to /capture/share (rewritten to API bridge).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // G5: personal thu chi — not “inbox-first” brand
    name: "MoneyFlow — Quản lý thu chi cá nhân",
    short_name: "MoneyFlow",
    description:
      "Ghi thu chi nhanh, theo dõi nhiều ví, ngân sách và báo cáo tháng. Xuất CSV bất cứ lúc nào.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F4F7F5",
    theme_color: "#0B6B3A",
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
    share_target: {
      action: "/capture/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "files",
            accept: [
              "text/*",
              "text/csv",
              "text/plain",
              "application/csv",
              ".csv",
              ".txt",
              ".text",
              ".tsv",
            ],
          },
        ],
      },
    },
  };
}

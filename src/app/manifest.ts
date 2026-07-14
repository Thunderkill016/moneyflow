import type { MetadataRoute } from "next";

/**
 * Web app manifest — PWA install + share_target (TASK-021).
 * Share POSTs multipart to /capture/share (rewritten to API bridge).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Money Flow — Hộp thư giao dịch",
    short_name: "Money Flow",
    description:
      "Dán text, tải sao kê, chia sẻ từ app khác — duyệt trong Inbox trước khi ghi sổ.",
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#0f766e",
    lang: "vi",
    icons: [
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

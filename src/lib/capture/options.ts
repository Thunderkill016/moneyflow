/**
 * Capture chooser options (wireframes-inbox CaptureMenu §0 / §24).
 * Shared by Capture sheet (AppShell) and /capture page.
 * Daily manual entry is the primary path; paste/upload remain secondary bulk or
 * assisted-capture paths and never write straight to the ledger implicitly.
 */

export type CaptureOptionId = "paste" | "upload" | "quick";

export type CaptureOptionIcon = "paste" | "upload" | "plus";

export type CaptureOption = {
  id: CaptureOptionId;
  label: string;
  description: string;
  href: string;
  icon: CaptureOptionIcon;
};

export const CAPTURE_OPTIONS: CaptureOption[] = [
  {
    id: "quick",
    label: "Ghi nhanh",
    description: "Nhập số tiền trước, dùng lựa chọn gần nhất",
    href: "/capture/quick",
    icon: "plus",
  },
  {
    id: "paste",
    label: "Dán text / SMS",
    description: "Dán tin nhắn hoặc dòng ghi chép để duyệt",
    href: "/capture/paste",
    icon: "paste",
  },
  {
    id: "upload",
    label: "Tải sao kê / file",
    description: "CSV, Excel hoặc PDF sao kê để duyệt",
    href: "/capture/upload",
    icon: "upload",
  },
];

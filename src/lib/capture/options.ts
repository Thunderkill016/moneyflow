/**
 * Capture chooser options (wireframes-inbox CaptureMenu §0 / §24).
 * Shared by Capture sheet (AppShell) and /capture page.
 * Voice input is the primary path (fastest: speak -> confirm -> saved);
 * quick manual entry follows, then paste/upload bulk or assisted-capture
 * paths, which never write straight to the ledger implicitly.
 */

export type CaptureOptionId = "paste" | "upload" | "quick" | "voice";

export type CaptureOptionIcon = "paste" | "upload" | "plus" | "mic";

export type CaptureOption = {
  id: CaptureOptionId;
  label: string;
  description: string;
  href: string;
  icon: CaptureOptionIcon;
};

export const CAPTURE_OPTIONS: CaptureOption[] = [
  {
    id: "voice",
    label: "Nói để ghi",
    description: "Nhập bằng giọng nói, không cần gõ",
    href: "/capture/voice",
    icon: "mic",
  },
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

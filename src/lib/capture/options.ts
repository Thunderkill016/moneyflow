/**
 * Capture chooser options (wireframes-inbox CaptureMenu §0 / §24).
 * Shared by Capture sheet (AppShell) and /capture page.
 * Onboarding (TASK-102) no longer forces paste/upload as a primary step.
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
    id: "paste",
    label: "Dán text / SMS",
    description: "Dán tin nhắn hoặc dòng ghi chép",
    href: "/capture/paste",
    icon: "paste",
  },
  {
    id: "upload",
    label: "Tải sao kê / file",
    description: "CSV, Excel hoặc PDF sao kê",
    href: "/capture/upload",
    icon: "upload",
  },
  {
    id: "quick",
    label: "Thêm nhanh 1 khoản",
    description: "Nhập tay một giao dịch",
    href: "/capture/quick",
    icon: "plus",
  },
];

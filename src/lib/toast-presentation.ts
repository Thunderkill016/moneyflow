import type { IconName } from "@/components/icons";
import type { ToastTone } from "@/components/ui/toast";

export type ToastPresentation = {
  tone: ToastTone;
  icon: IconName;
};

export type ToastPresentationOptions = {
  /**
   * A notice carrying an action (undo, quick edit) always reads as a
   * restorable offer, so its icon stays "restore" whatever tone is declared.
   */
  hasAction?: boolean;
  /**
   * Caller-declared tone. When present it wins over the keyword heuristic —
   * the heuristic exists only as a fallback for notices that never declared a
   * tone, so copy edits cannot silently re-tone feedback and a neutral message
   * cannot mistone on an accidental substring.
   */
  tone?: ToastTone;
};

/**
 * Resolves how a shell notice renders: an explicit caller tone first, the
 * Vietnamese keyword heuristic only when no tone was declared.
 */
export function resolveToastPresentation(
  notice: string | undefined,
  options: ToastPresentationOptions = {},
): ToastPresentation {
  const { hasAction = false, tone } = options;

  if (hasAction) return { tone: tone ?? "info", icon: "restore" };
  if (tone) return { tone, icon: tone === "success" ? "check" : "bell" };

  const text = (notice || "").toLowerCase();

  if (
    text.includes("lỗi") ||
    text.includes("thất bại") ||
    text.includes("không thể") ||
    text.includes("không khôi phục") ||
    text.includes("chưa thể hoàn tác")
  ) {
    return { tone: "error", icon: "bell" };
  }
  if (
    text.includes("cảnh báo") ||
    text.includes("chưa") ||
    text.includes("yêu cầu")
  ) {
    return { tone: "warning", icon: "bell" };
  }
  if (
    text.includes("thông tin") ||
    text.includes("chi tiết") ||
    text.includes("đang") ||
    text.includes("khôi phục")
  ) {
    return { tone: "info", icon: "bell" };
  }
  return { tone: "success", icon: "check" };
}

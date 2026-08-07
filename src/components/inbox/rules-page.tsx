"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { ViewerSummary } from "@/components/user-chip";
import { getPendingCountForClient } from "@/hooks/client-inbox";
import {
  deleteRuleForClient,
  loadRulesForClient,
  reorderRulesForClient,
  saveRuleForClient,
} from "@/hooks/client-rules";
import type { CategorySummary } from "@/lib/categories";
import { previewRuleApplication } from "@/lib/inbox/apply-rules";
import {
  RULE_FIELD_LABELS,
  RULE_STAGE_LABELS,
  formatRuleSummary,
  sortRulesByPriority,
  type InboxRule,
  type RuleMatchField,
} from "@/lib/inbox/rules-store";
import styles from "./rules-page.module.css";

const FIELD_OPTIONS: RuleMatchField[] = ["any", "merchant", "note", "raw"];

type FormState = {
  id?: string;
  expectedVersion?: number;
  contains: string;
  categoryId: string;
  field: RuleMatchField;
  merchant: string;
  enabled: boolean;
};

function emptyForm(categories: CategorySummary[]): FormState {
  return {
    contains: "",
    categoryId: categories.find((category) => !category.isArchived)?.id ?? "",
    field: "any",
    merchant: "",
    enabled: true,
  };
}

function formFromRule(rule: InboxRule): FormState {
  return {
    id: rule.id,
    expectedVersion: rule.version,
    contains: rule.contains,
    categoryId: rule.categoryId ?? "",
    field: rule.field,
    merchant: rule.merchant ?? "",
    enabled: rule.enabled,
  };
}

export function RulesPage({
  viewer,
  initialRules,
  categories,
  featureAvailable,
  dataError,
}: {
  viewer: ViewerSummary;
  initialRules: InboxRule[];
  categories: CategorySummary[];
  featureAvailable: boolean;
  dataError: string | null;
}) {
  const containsRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(!viewer.isDemo);
  const [error, setError] = useState<string | null>(dataError);
  const [rules, setRules] = useState(() => sortRulesByPriority(initialRules));
  const [inboxCount, setInboxCount] = useState(0);
  const [form, setForm] = useState<FormState>(() => emptyForm(categories));
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InboxRule | null>(null);

  const availableCategories = useMemo(
    () => categories.filter((category) => !category.isArchived),
    [categories],
  );
  const categoryById = useMemo(
    () =>
      new Map(
        availableCategories.map((category) => [category.id, category] as const),
      ),
    [availableCategories],
  );
  const orderedRules = useMemo(() => sortRulesByPriority(rules), [rules]);
  const preview = useMemo(() => {
    if (!previewText.trim()) return null;
    return previewRuleApplication(
      {
        merchant: previewText,
        note: previewText,
        rawSnippet: previewText,
      },
      orderedRules,
      { force: true },
    );
  }, [orderedRules, previewText]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      void Promise.all([
        loadRulesForClient(viewer.isDemo),
        getPendingCountForClient(viewer.isDemo),
      ]).then(([ruleResult, count]) => {
        if (cancelled) return;
        if (ruleResult.ok) {
          setRules(ruleResult.rules);
          setError(dataError);
        } else {
          setError(ruleResult.message);
        }
        setInboxCount(count);
        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [dataError, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openAdd() {
    setForm(emptyForm(availableCategories));
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(rule: InboxRule) {
    setForm(formFromRule(rule));
    setFormError("");
    setFormOpen(true);
  }

  async function submitRule(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const contains = form.contains.trim();
    const category = categoryById.get(form.categoryId);
    setFormError("");

    if (!contains) {
      setFormError("Nhập chuỗi cần khớp, ví dụ HIGHLANDS.");
      containsRef.current?.focus();
      return;
    }
    if (!category) {
      setFormError("Chọn một danh mục đang hoạt động.");
      return;
    }

    setSaving(true);
    const result = await saveRuleForClient(viewer.isDemo, {
      id: form.id,
      expectedVersion: form.expectedVersion,
      enabled: form.enabled,
      field: form.field,
      contains,
      categoryId: category.id,
      category: category.name,
      categoryKind: category.kind,
      merchant: form.merchant.trim() || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setRules(result.rules);
    setFormOpen(false);
    setForm(emptyForm(availableCategories));
    setNotice(form.id ? "Đã cập nhật quy tắc." : "Đã thêm quy tắc.");
  }

  async function toggleEnabled(rule: InboxRule) {
    if (saving) return;
    setSaving(true);
    const result = await saveRuleForClient(viewer.isDemo, {
      id: rule.id,
      expectedVersion: rule.version,
      priority: rule.priority,
      enabled: !rule.enabled,
      field: rule.field,
      contains: rule.contains,
      categoryId: rule.categoryId,
      category: rule.category,
      categoryKind: rule.categoryKind ?? "expense",
      merchant: rule.merchant,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRules(result.rules);
    setNotice(rule.enabled ? "Đã tắt quy tắc." : "Đã bật quy tắc.");
  }

  async function deleteRule(rule: InboxRule) {
    if (saving) return;
    setSaving(true);
    const result = await deleteRuleForClient(viewer.isDemo, rule);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRules(result.rules);
    setDeleteTarget(null);
    setNotice("Đã xóa quy tắc. Bằng chứng cũ trên ứng viên vẫn được giữ nguyên.");
  }

  async function moveRule(ruleId: string, direction: -1 | 1) {
    if (saving) return;
    const index = orderedRules.findIndex((rule) => rule.id === ruleId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedRules.length) return;
    const ids = orderedRules.map((rule) => rule.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setSaving(true);
    const result = await reorderRulesForClient(viewer.isDemo, ids);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRules(result.rules);
    setNotice("Đã cập nhật thứ tự ưu tiên.");
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={
        featureAvailable && availableCategories.length > 0
          ? { label: "Thêm quy tắc", onClick: openAdd, icon: "plus" }
          : undefined
      }
      showPrimaryActionOnMobile={
        featureAvailable &&
        availableCategories.length > 0 &&
        orderedRules.length > 0
      }
    >
      <SecondaryWorkspace slot="rules-workspace">
        <SecondaryHeader
          section="Tự động hóa có kiểm soát"
          title="Quy tắc"
          description={
            <p>
              Quy tắc chạy theo thứ tự ưu tiên và chỉ chuẩn hóa ứng viên để bạn xem
              trước. Quy tắc không tự tạo giao dịch trong sổ.
            </p>
          }
          actions={
            <>
              <LinkButton href="/inbox" intent="secondary" targetSize="important">
                <Icon name="inbox" />
                Inbox
              </LinkButton>
              <LinkButton
                href="/capture/paste"
                intent="secondary"
                targetSize="important"
              >
                <Icon name="paste" />
                Mở trang dán
              </LinkButton>
            </>
          }
        />

        {!featureAvailable ? (
          <Alert tone="warning" live="polite">
            <AlertDescription>
              Quy tắc chưa được bật trên máy chủ. Inbox vẫn hoạt động bình thường;
              workspace này chỉ khả dụng khi hợp đồng lưu quy tắc được triển khai.
            </AlertDescription>
          </Alert>
        ) : null}

        {featureAvailable ? (
          <SecondarySection
            title="Thử một nội dung"
            description={
              <p>
                Xem quy tắc ưu tiên cao nhất sẽ khớp thế nào. Kết quả vẫn ở giai
                đoạn “{RULE_STAGE_LABELS.candidate}” và phải được duyệt trong Inbox.
              </p>
            }
            contained
            slot="rules-preview"
          >
            <TextField
              label="Nội dung mẫu"
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              placeholder="Ví dụ: HIGHLANDS 45K"
              autoComplete="off"
              targetSize="important"
            />
            {previewText.trim() ? (
              preview?.match ? (
                <Alert tone="info" live="polite">
                  <AlertDescription>
                    Khớp quy tắc ưu tiên v{preview.match.version}:{" "}
                    <strong>{formatRuleSummary(preview.match)}</strong>. Chưa có giao
                    dịch nào được tạo.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className={styles.hint}>
                  Không có quy tắc đang bật nào khớp nội dung này.
                </p>
              )
            ) : null}
          </SecondarySection>
        ) : null}

        {!ready ? (
          <section className={styles.loading} aria-busy="true" aria-label="Đang tải quy tắc">
            <span />
            <span />
          </section>
        ) : null}

        {ready && error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertAction}>
              <span>{error}</span>
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={() => window.location.reload()}
              >
                Tải lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {ready && !error && featureAvailable && orderedRules.length === 0 ? (
          <EmptyState
            icon={<Icon name="rules" />}
            title="Chưa có quy tắc"
            description="Thêm một quy tắc, thử nội dung và xem kết quả trước khi dùng trong Inbox."
            primaryAction={
              availableCategories.length > 0 ? (
                <Button
                  type="button"
                  intent="primary"
                  targetSize="important"
                  onClick={openAdd}
                >
                  Thêm quy tắc
                </Button>
              ) : undefined
            }
            secondaryAction={
              <LinkButton href="/inbox" intent="secondary" targetSize="important">
                Về Inbox
              </LinkButton>
            }
          />
        ) : null}

        {ready && !error && orderedRules.length > 0 ? (
          <SecondarySection
            title="Ưu tiên cao đến thấp"
            description={
              <p>
                Quy tắc đầu tiên khớp sẽ quyết định gợi ý. Phiên bản quy tắc được
                lưu cùng ứng viên để giữ dấu vết giải thích.
              </p>
            }
            action={
              <span className={styles.count}>
                {orderedRules.length} quy tắc ·{" "}
                {orderedRules.filter((rule) => rule.enabled).length} đang bật
              </span>
            }
            slot="rules-list"
          >
            <ol className={styles.list}>
              {orderedRules.map((rule, index) => (
                <li
                  key={rule.id}
                  className={rule.enabled ? styles.item : `${styles.item} ${styles.disabled}`}
                >
                  <span className={styles.priority} aria-label={`Ưu tiên ${index + 1}`}>
                    {index + 1}
                  </span>
                  <div className={styles.body}>
                    <strong>{formatRuleSummary(rule)}</strong>
                    <div className={styles.meta}>
                      <span>{RULE_FIELD_LABELS[rule.field]}</span>
                      <span>Phiên bản {rule.version}</span>
                      <span>{rule.enabled ? "Đang bật" : "Đã tắt"}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      intent="quiet"
                      targetSize="important"
                      disabled={saving || index === 0}
                      onClick={() => void moveRule(rule.id, -1)}
                      aria-label={`Tăng ưu tiên ${formatRuleSummary(rule)}`}
                    >
                      Lên
                    </Button>
                    <Button
                      type="button"
                      intent="quiet"
                      targetSize="important"
                      disabled={saving || index === orderedRules.length - 1}
                      onClick={() => void moveRule(rule.id, 1)}
                      aria-label={`Giảm ưu tiên ${formatRuleSummary(rule)}`}
                    >
                      Xuống
                    </Button>
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      disabled={saving}
                      onClick={() => openEdit(rule)}
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      intent="secondary"
                      targetSize="important"
                      disabled={saving}
                      onClick={() => void toggleEnabled(rule)}
                      aria-pressed={rule.enabled}
                    >
                      {rule.enabled ? "Tắt" : "Bật"}
                    </Button>
                    <Button
                      type="button"
                      intent="destructive"
                      targetSize="important"
                      disabled={saving}
                      onClick={() => setDeleteTarget(rule)}
                      aria-label={`Xóa quy tắc ${formatRuleSummary(rule)}`}
                    >
                      Xóa
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </SecondarySection>
        ) : null}
      </SecondaryWorkspace>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setFormOpen(false);
        }}
        title={form.id ? "Sửa quy tắc" : "Thêm quy tắc"}
        description="Chuỗi được khớp không phân biệt hoa thường. Nội dung gốc của ứng viên không bị thay đổi."
        dismissible={!saving}
        initialFocusRef={containsRef}
        className={styles.dialog}
        contentClassName={styles.dialogContent}
        footer={
          <div className={styles.dialogFooter}>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              disabled={saving}
              onClick={() => setFormOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="rule-form"
              intent="primary"
              targetSize="important"
              pending={saving}
              pendingLabel="Đang lưu…"
            >
              Lưu quy tắc
            </Button>
          </div>
        }
      >
        <form id="rule-form" className={styles.form} onSubmit={submitRule} noValidate>
          <TextField
            ref={containsRef}
            label="Nếu chứa"
            value={form.contains}
            onChange={(event) => {
              setForm((current) => ({ ...current, contains: event.target.value }));
              setFormError("");
            }}
            placeholder="HIGHLANDS, LUONG, GRAB…"
            maxLength={120}
            autoComplete="off"
            required
            disabled={saving}
            targetSize="important"
          />
          <SelectField
            label="Trong trường"
            value={form.field}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                field: event.target.value as RuleMatchField,
              }))
            }
            disabled={saving}
            targetSize="important"
          >
            {FIELD_OPTIONS.map((field) => (
              <option key={field} value={field}>
                {RULE_FIELD_LABELS[field]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Thì danh mục"
            value={form.categoryId}
            onChange={(event) =>
              setForm((current) => ({ ...current, categoryId: event.target.value }))
            }
            required
            disabled={saving || availableCategories.length === 0}
            targetSize="important"
          >
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} · {category.kind === "income" ? "Tiền vào" : "Tiền ra"}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Đổi tên nơi giao dịch (tùy chọn)"
            value={form.merchant}
            onChange={(event) =>
              setForm((current) => ({ ...current, merchant: event.target.value }))
            }
            placeholder="Highlands Coffee"
            maxLength={200}
            autoComplete="off"
            disabled={saving}
            targetSize="important"
          />
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, enabled: event.target.checked }))
              }
              disabled={saving}
            />
            <span>
              <strong>Bật quy tắc sau khi lưu</strong>
              <small>Quy tắc tắt vẫn giữ phiên bản nhưng không tham gia khớp.</small>
            </span>
          </label>
          {formError ? (
            <Alert tone="error" live="assertive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Dialog>

      <SecondaryReviewDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleteTarget(null);
        }}
        title="Xóa quy tắc?"
        description="Quy tắc sẽ ngừng áp dụng cho các ứng viên mới."
        details={
          deleteTarget
            ? [
                { label: "Quy tắc", value: formatRuleSummary(deleteTarget) },
                { label: "Phiên bản", value: `v${deleteTarget.version}` },
                { label: "Ứng viên cũ", value: "Giữ bằng chứng đã áp dụng" },
              ]
            : []
        }
        consequence="Ứng viên đã tạo vẫn giữ thông tin parser/rule cũ để giải thích. Không có giao dịch nào bị thay đổi hoặc xóa."
        confirmLabel="Xóa quy tắc"
        confirmIntent="destructive"
        pending={saving}
        onConfirm={() => (deleteTarget ? deleteRule(deleteTarget) : undefined)}
        slot="rule-delete-review"
      />
    </AppShell>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  deleteRuleForClient,
  loadRulesForClient,
  reorderRulesForClient,
  saveRuleForClient,
} from "@/hooks/client-rules";
import { getPendingCountForClient } from "@/hooks/client-inbox";
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
  const formId = useId();
  const [ready, setReady] = useState(!viewer.isDemo);
  const [error, setError] = useState<string | null>(dataError);
  const [rules, setRules] = useState(() => sortRulesByPriority(initialRules));
  const [inboxCount, setInboxCount] = useState(0);
  const [form, setForm] = useState<FormState>(() => emptyForm(categories));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewText, setPreviewText] = useState("");

  const availableCategories = useMemo(
    () => categories.filter((category) => !category.isArchived),
    [categories],
  );
  const categoryById = useMemo(
    () => new Map(availableCategories.map((category) => [category.id, category] as const)),
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
    setShowForm(true);
  }

  function openEdit(rule: InboxRule) {
    setForm(formFromRule(rule));
    setFormError("");
    setShowForm(true);
  }

  async function submitRule(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const contains = form.contains.trim();
    const category = categoryById.get(form.categoryId);
    if (!contains) {
      setFormError("Nhập chuỗi cần khớp, ví dụ HIGHLANDS.");
      return;
    }
    if (!category) {
      setFormError("Chọn một danh mục đang hoạt động.");
      return;
    }

    setSaving(true);
    setFormError("");
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
    setShowForm(false);
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
    >
      <main className="dashboard rules-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Tự động hóa có kiểm soát</p>
            <h1>Quy tắc</h1>
            <p>
              Cùng một nội dung và cùng phiên bản quy tắc luôn cho cùng kết quả.
              Quy tắc chỉ chuẩn hóa ứng viên để bạn xem trước; không tự ghi vào sổ.
            </p>
          </div>
          <div className="page-heading-actions">
            {featureAvailable && availableCategories.length > 0 ? (
              <button type="button" className="primary-button" onClick={openAdd}>
                <Icon name="plus" />
                Thêm quy tắc
              </button>
            ) : null}
            <Link className="secondary-button" href="/capture/paste">
              <Icon name="paste" />
              Mở trang dán
            </Link>
          </div>
        </section>

        {!featureAvailable ? (
          <section className="panel rules-error" role="status">
            <h2>Quy tắc chưa được bật trên máy chủ</h2>
            <p>
              Inbox vẫn hoạt động bình thường. Workspace này chỉ khả dụng sau khi
              hợp đồng cơ sở dữ liệu được triển khai riêng.
            </p>
          </section>
        ) : null}

        {featureAvailable ? (
          <section className="panel rules-form-panel" aria-labelledby="rules-preview-heading">
            <div className="rules-list-header">
              <div>
                <p className="eyebrow">Xem trước, không ghi sổ</p>
                <h2 id="rules-preview-heading">Thử một nội dung</h2>
              </div>
              <span className="preview-chip sm">{RULE_STAGE_LABELS.candidate}</span>
            </div>
            <label className="rules-field rules-field-wide">
              <span>Nội dung mẫu</span>
              <input
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
                placeholder="Ví dụ: HIGHLANDS 45K"
                autoComplete="off"
              />
            </label>
            {previewText.trim() ? (
              preview?.match ? (
                <div className="data-alert" role="status">
                  <Icon name="check" />
                  <span>
                    Khớp <strong>v{preview.match.version}</strong>: {formatRuleSummary(preview.match)}.
                    Kết quả này vẫn cần được duyệt trong Inbox.
                  </span>
                </div>
              ) : (
                <p className="rules-list-hint">Không có quy tắc đang bật nào khớp nội dung này.</p>
              )
            ) : null}
          </section>
        ) : null}

        {!ready ? (
          <section className="panel rules-loading" aria-busy="true" aria-label="Đang tải quy tắc">
            <div className="loading-line wide" />
            <div className="loading-line" />
          </section>
        ) : null}

        {ready && error ? (
          <section className="panel rules-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Tải lại
            </button>
          </section>
        ) : null}

        {ready && !error && showForm ? (
          <section className="panel rules-form-panel" aria-labelledby={`${formId}-heading`}>
            <h2 id={`${formId}-heading`}>{form.id ? "Sửa quy tắc" : "Thêm quy tắc"}</h2>
            <p className="rules-form-lead">
              Chuỗi được khớp không phân biệt hoa thường. Danh mục và tên nơi chi là
              dữ liệu chuẩn hóa; nội dung gốc không bị thay đổi.
            </p>
            <form className="rules-form" onSubmit={submitRule}>
              <div className="rules-form-grid">
                <label className="rules-field">
                  <span>Nếu chứa</span>
                  <input
                    value={form.contains}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, contains: event.target.value }))
                    }
                    placeholder="HIGHLANDS, LUONG, GRAB…"
                    maxLength={120}
                    autoComplete="off"
                    required
                    disabled={saving}
                  />
                </label>
                <label className="rules-field">
                  <span>Trong trường</span>
                  <select
                    value={form.field}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        field: event.target.value as RuleMatchField,
                      }))
                    }
                    disabled={saving}
                  >
                    {FIELD_OPTIONS.map((field) => (
                      <option key={field} value={field}>
                        {RULE_FIELD_LABELS[field]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rules-field">
                  <span>Thì danh mục</span>
                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, categoryId: event.target.value }))
                    }
                    required
                    disabled={saving}
                  >
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} · {category.kind === "income" ? "Tiền vào" : "Tiền ra"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rules-field rules-field-wide">
                  <span>Đổi tên nơi chi (tùy chọn)</span>
                  <input
                    value={form.merchant}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, merchant: event.target.value }))
                    }
                    placeholder="Highlands Coffee"
                    maxLength={200}
                    autoComplete="off"
                    disabled={saving}
                  />
                </label>
              </div>
              {formError ? <p className="rules-form-error" role="alert">{formError}</p> : null}
              <div className="rules-form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu quy tắc"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {ready && !error && featureAvailable && orderedRules.length === 0 && !showForm ? (
          <EmptyState
            icon="rules"
            title="Chưa có quy tắc"
            description="Thêm một quy tắc, thử nội dung và xem kết quả trước khi dùng trong Inbox."
            actionLabel="Thêm quy tắc"
            onAction={availableCategories.length > 0 ? openAdd : undefined}
            secondaryLabel="Về Inbox"
            secondaryHref="/inbox"
          />
        ) : null}

        {ready && !error && orderedRules.length > 0 ? (
          <section className="panel rules-list-panel" aria-labelledby="rules-list-heading">
            <div className="rules-list-header">
              <div>
                <h2 id="rules-list-heading">Ưu tiên cao → thấp</h2>
                <p className="rules-list-count">
                  {orderedRules.length} quy tắc · {orderedRules.filter((rule) => rule.enabled).length} bật
                </p>
              </div>
              <span className="preview-chip sm">Phiên bản được lưu trên ứng viên</span>
            </div>
            <ol className="rules-list">
              {orderedRules.map((rule, index) => (
                <li key={rule.id} className={`rules-list-item${rule.enabled ? "" : " is-disabled"}`}>
                  <span className="rules-list-priority font-mono" aria-label={`Ưu tiên ${index + 1}`}>
                    {index + 1}.
                  </span>
                  <div className="rules-list-body">
                    <p className="rules-list-summary">{formatRuleSummary(rule)}</p>
                    <p className="rules-list-meta">
                      <span className="preview-chip sm">{RULE_FIELD_LABELS[rule.field]}</span>
                      <span className="preview-chip sm">v{rule.version}</span>
                      {!rule.enabled ? <span className="preview-chip sm confidence-badge warning">Đã tắt</span> : null}
                    </p>
                  </div>
                  <div className="rules-list-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={saving || index === 0}
                      onClick={() => void moveRule(rule.id, -1)}
                      aria-label={`Tăng ưu tiên ${formatRuleSummary(rule)}`}
                    >
                      Lên
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={saving || index === orderedRules.length - 1}
                      onClick={() => void moveRule(rule.id, 1)}
                      aria-label={`Giảm ưu tiên ${formatRuleSummary(rule)}`}
                    >
                      Xuống
                    </button>
                    <button type="button" className="secondary-button" disabled={saving} onClick={() => openEdit(rule)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="secondary-button rules-toggle"
                      disabled={saving}
                      onClick={() => void toggleEnabled(rule)}
                      aria-pressed={rule.enabled}
                    >
                      {rule.enabled ? "Bật" : "Tắt"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button rules-delete"
                      disabled={saving}
                      onClick={() => void deleteRule(rule)}
                      aria-label={`Xóa quy tắc ${formatRuleSummary(rule)}`}
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="rules-list-hint">
              Quy tắc chỉ chuẩn hóa ứng viên đang chờ duyệt. Dữ liệu độ tin cậy thấp,
              giao dịch nghi chuyển khoản và mọi ứng viên chưa chắc chắn vẫn phải được
              người dùng xem trước.
            </p>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}

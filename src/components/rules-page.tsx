"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import {
  RULE_CATEGORY_OPTIONS,
  RULE_FIELD_LABELS,
  addStoredRule,
  formatRuleSummary,
  readStoredRules,
  removeStoredRule,
  updateStoredRule,
  type InboxRule,
  type RuleMatchField,
} from "@/lib/inbox/rules-store";

const FIELD_OPTIONS: RuleMatchField[] = ["any", "merchant", "note", "raw"];

type FormState = {
  contains: string;
  category: string;
  field: RuleMatchField;
  merchant: string;
};

const emptyForm = (): FormState => ({
  contains: "",
  category: RULE_CATEGORY_OPTIONS[0] ?? "Ăn uống",
  field: "any",
  merchant: "",
});

/**
 * Rules page stub (wireframes-inbox §14).
 * LocalStorage CRUD: contains → category; priority high → low.
 */
export function RulesPage({ viewer }: { viewer: ViewerSummary }) {
  const formId = useId();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<InboxRule[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  function reload() {
    try {
      setRules(readStoredRules());
      setInboxCount(countPending(readStoredCandidates()));
      setError(null);
    } catch {
      setError("Không đọc được quy tắc từ trình duyệt. Thử tải lại trang.");
      setRules([]);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      reload();
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openAdd() {
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  }

  function submitRule(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const contains = form.contains.trim();
    const category = form.category.trim();
    if (!contains) {
      setFormError("Nhập chuỗi cần khớp (vd: HIGHLANDS).");
      return;
    }
    if (!category) {
      setFormError("Chọn hoặc nhập danh mục.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      addStoredRule({
        contains,
        category,
        field: form.field,
        merchant: form.merchant.trim() || undefined,
      });
      reload();
      setShowForm(false);
      setForm(emptyForm());
      setNotice("Đã thêm quy tắc.");
    } catch {
      setFormError("Không lưu được quy tắc. Thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function toggleEnabled(rule: InboxRule) {
    try {
      updateStoredRule({ id: rule.id, enabled: !rule.enabled });
      reload();
    } catch {
      setError("Không cập nhật được quy tắc.");
    }
  }

  function deleteRule(id: string) {
    try {
      removeStoredRule(id);
      reload();
      setNotice("Đã xóa quy tắc.");
    } catch {
      setError("Không xóa được quy tắc.");
    }
  }

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
      notice={notice}
      primaryAction={{
        label: "Thêm",
        onClick: openAdd,
        icon: "plus",
      }}
    >
      <main className="dashboard rules-workspace">
        <section className="transactions-title-row">
          <div>
            <p className="eyebrow">Tự động gợi ý</p>
            <h1>Quy tắc</h1>
            <p>
              Nếu text chứa chuỗi → gán danh mục. Ưu tiên cao thắng khi trùng.
              Áp dụng tùy chọn khi dán / phân tích.
            </p>
          </div>
          <div className="page-heading-actions">
            <button type="button" className="primary-button" onClick={openAdd}>
              <Icon name="plus" />
              Thêm
            </button>
            <Link className="secondary-button" href="/capture/paste">
              <Icon name="paste" />
              Thử dán
            </Link>
          </div>
        </section>

        {!ready && (
          <section className="panel rules-loading" aria-busy="true" aria-label="Đang tải quy tắc">
            <div className="loading-line wide" />
            <div className="loading-line" />
            <div className="loading-line" />
          </section>
        )}

        {ready && error && (
          <section className="panel rules-error" role="alert">
            <p>{error}</p>
            <button type="button" className="secondary-button" onClick={reload}>
              Thử lại
            </button>
          </section>
        )}

        {ready && !error && showForm && (
          <section className="panel rules-form-panel" aria-labelledby={`${formId}-heading`}>
            <h2 id={`${formId}-heading`}>Thêm quy tắc</h2>
            <p className="rules-form-lead">
              Khớp không phân biệt hoa thường. Ví dụ: contains <strong>HIGHLANDS</strong> →{" "}
              <strong>Ăn uống</strong>.
            </p>
            <form className="rules-form" onSubmit={submitRule}>
              <div className="rules-form-grid">
                <label className="rules-field">
                  <span>Nếu chứa</span>
                  <input
                    type="text"
                    value={form.contains}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, contains: e.target.value }))
                    }
                    placeholder="HIGHLANDS, LUONG, GRAB…"
                    autoComplete="off"
                    required
                    disabled={saving}
                  />
                </label>
                <label className="rules-field">
                  <span>Trong trường</span>
                  <select
                    value={form.field}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        field: e.target.value as RuleMatchField,
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
                    value={
                      RULE_CATEGORY_OPTIONS.includes(
                        form.category as (typeof RULE_CATEGORY_OPTIONS)[number],
                      )
                        ? form.category
                        : "__custom__"
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__custom__") {
                        setForm((prev) => ({ ...prev, category: "" }));
                        return;
                      }
                      setForm((prev) => ({ ...prev, category: value }));
                    }}
                    disabled={saving}
                  >
                    {RULE_CATEGORY_OPTIONS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__custom__">Khác…</option>
                  </select>
                </label>
                {!RULE_CATEGORY_OPTIONS.includes(
                  form.category as (typeof RULE_CATEGORY_OPTIONS)[number],
                ) && (
                  <label className="rules-field">
                    <span>Tên danh mục</span>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="Tên danh mục"
                      disabled={saving}
                      required
                    />
                  </label>
                )}
                <label className="rules-field rules-field-wide">
                  <span>Đổi tên nơi chi (tuỳ chọn)</span>
                  <input
                    type="text"
                    value={form.merchant}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, merchant: e.target.value }))
                    }
                    placeholder="Highlands Coffee"
                    autoComplete="off"
                    disabled={saving}
                  />
                </label>
              </div>
              {formError && (
                <p className="rules-form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="rules-form-actions">
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu quy tắc"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => {
                    setShowForm(false);
                    setFormError("");
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </section>
        )}

        {ready && !error && rules.length === 0 && !showForm && (
          <EmptyState
            icon="rules"
            title="Chưa có quy tắc"
            description="Thêm quy tắc đơn giản: nếu text chứa chuỗi thì gợi ý danh mục khi dán / phân tích."
            actionLabel="Thêm quy tắc"
            onAction={openAdd}
            secondaryLabel="Về Inbox"
            secondaryHref="/inbox"
          />
        )}

        {ready && !error && rules.length > 0 && (
          <section className="panel rules-list-panel" aria-labelledby="rules-list-heading">
            <div className="rules-list-header">
              <h2 id="rules-list-heading">Ưu tiên cao → thấp</h2>
              <p className="rules-list-count">
                {rules.length} quy tắc · {rules.filter((r) => r.enabled).length} bật
              </p>
            </div>
            <ol className="rules-list">
              {rules.map((rule, index) => (
                <li
                  key={rule.id}
                  className={`rules-list-item${rule.enabled ? "" : " is-disabled"}`}
                >
                  <span className="rules-list-priority font-mono" aria-label={`Ưu tiên ${rule.priority}`}>
                    {index + 1}.
                  </span>
                  <div className="rules-list-body">
                    <p className="rules-list-summary">{formatRuleSummary(rule)}</p>
                    <p className="rules-list-meta">
                      <span className="preview-chip sm">
                        {RULE_FIELD_LABELS[rule.field]}
                      </span>
                      <span className="rules-list-priority-label">
                        Ưu tiên {rule.priority}
                      </span>
                      {!rule.enabled && (
                        <span className="preview-chip sm confidence-badge warning">Tắt</span>
                      )}
                    </p>
                  </div>
                  <div className="rules-list-actions">
                    <button
                      type="button"
                      className="secondary-button rules-toggle"
                      onClick={() => toggleEnabled(rule)}
                      aria-pressed={rule.enabled}
                    >
                      {rule.enabled ? "Bật" : "Tắt"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button rules-delete"
                      onClick={() => deleteRule(rule.id)}
                      aria-label={`Xóa quy tắc ${formatRuleSummary(rule)}`}
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="rules-list-hint">
              Khi dán text, bật “Áp dụng quy tắc danh mục” để gán gợi ý — bạn vẫn
              duyệt trong Inbox trước khi vào sổ.
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}

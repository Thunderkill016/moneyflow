"use client";

import {
  FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { findMatchingRule, resolveCategoryIdForRuleMatch } from "@/lib/inbox/apply-rules";
import { readStoredRules, type InboxRule } from "@/lib/inbox/rules-store";
import { formatMoneyInput, moneyKindPrefix, parseMoneyInput } from "@/lib/money";
import {
  isRecentCategoryId,
  orderCategoriesByRecent,
  pickCategoryForKind,
  pushRecentCategoryId,
  readQuickAddPrefs,
  writeQuickAddPrefs,
} from "@/lib/quick-add-prefs";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type TransactionKind,
} from "@/lib/sample-data";
import { todayInVietnam } from "@/lib/vietnam-date";
import styles from "./transactions/transaction-form.module.css";

const KEEP_OPEN_SUCCESS = "Đã lưu · nhập khoản tiếp";

export function AddTransactionDialog({
  open,
  onClose,
  onAdd,
  accounts,
  categories,
  disabled = false,
  embedded = false,
  title = "Ghi chi tiêu",
  eyebrow = "Nhập nhanh",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: CreateTransactionInput) => Promise<{ ok: boolean; message?: string }>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  disabled?: boolean;
  embedded?: boolean;
  title?: string;
  eyebrow?: string;
}) {
  const formId = useId();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const prefsHydratedRef = useRef(false);
  const savedFlashTimerRef = useRef<number | null>(null);

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayInVietnam());
  const [keepOpen, setKeepOpen] = useState(false);
  const [keepOpenSession, setKeepOpenSession] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [rules, setRules] = useState<InboxRule[]>([]);
  const [autoRuleHint, setAutoRuleHint] = useState<string | null>(null);
  const categoryTouchedRef = useRef(false);
  const effectiveOpen = open || keepOpenSession;

  const availableCategories = useMemo(() => {
    const filtered = categories.filter((item) => item.kind === kind);
    return orderCategoriesByRecent(filtered, recentCategoryIds);
  }, [categories, kind, recentCategoryIds]);
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedCategoryId = availableCategories.some(
    (item) => item.id === categoryId,
  )
    ? categoryId
    : pickCategoryForKind(availableCategories, recentCategoryIds);
  const hasRecentForKind = availableCategories.some((item) =>
    isRecentCategoryId(item.id, recentCategoryIds),
  );
  const kindSign = moneyKindPrefix(kind);
  const amountLabel =
    kind === "expense" ? "Số tiền chi (₫)" : "Số tiền thu (₫)";

  function focusAmount(select = true) {
    const input = amountInputRef.current;
    if (!input) return;
    input.focus();
    if (select && input.value) input.select();
  }

  function clearSavedFlashTimer() {
    if (savedFlashTimerRef.current != null) {
      window.clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = null;
    }
  }

  function showKeepOpenSuccess() {
    clearSavedFlashTimer();
    setSavedFlash(KEEP_OPEN_SUCCESS);
    savedFlashTimerRef.current = window.setTimeout(() => {
      setSavedFlash("");
      savedFlashTimerRef.current = null;
    }, 2200);
  }

  useEffect(() => {
    if (prefsHydratedRef.current) return;
    prefsHydratedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const prefs = readQuickAddPrefs();
      setKind(prefs.kind);
      setKeepOpen(prefs.keepOpen);
      if (prefs.accountId) setAccountId(prefs.accountId);
      if (prefs.recentCategoryIds?.length) {
        setRecentCategoryIds(prefs.recentCategoryIds);
      }
      const forKind = categories.filter((item) => item.kind === prefs.kind);
      const preferred = pickCategoryForKind(
        forKind,
        prefs.recentCategoryIds,
        prefs.categoryId || undefined,
      );
      if (preferred) setCategoryId(preferred);
      setOccurredOn(todayInVietnam());
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot prefs hydrate
  }, []);

  useEffect(() => {
    if (!effectiveOpen && !embedded) return;
    const frame = window.requestAnimationFrame(() => focusAmount(false));
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveOpen, embedded]);

  useEffect(() => () => clearSavedFlashTimer(), []);

  useEffect(() => {
    if (!effectiveOpen) return;
    const frame = window.requestAnimationFrame(() => setRules(readStoredRules()));
    return () => window.cancelAnimationFrame(frame);
  }, [effectiveOpen]);

  function applyNoteChange(value: string) {
    setNote(value);
    markInputChanged();
    if (categoryTouchedRef.current || !value.trim()) {
      if (!value.trim()) setAutoRuleHint(null);
      return;
    }
    const match = findMatchingRule(rules, {
      merchant: "",
      note: value,
      rawSnippet: "",
    });
    const targetId = resolveCategoryIdForRuleMatch(match, categories, kind);
    if (!match || !targetId) {
      setAutoRuleHint(null);
      return;
    }
    setCategoryId(targetId);
    setAutoRuleHint(
      `tự động theo quy tắc “${match.contains}” → ${match.category}`,
    );
  }

  function handleRequestClose() {
    clearSavedFlashTimer();
    setKeepOpenSession(false);
    setSavedFlash("");
    onClose();
  }

  function markInputChanged() {
    idempotencyKeyRef.current = null;
    setError("");
    if (savedFlash) setSavedFlash("");
  }

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    const forKind = categories.filter((item) => item.kind === nextKind);
    setCategoryId(pickCategoryForKind(forKind, recentCategoryIds));
    categoryTouchedRef.current = false;
    setAutoRuleHint(null);
    markInputChanged();
    window.requestAnimationFrame(() => focusAmount(false));
  }

  function persistPrefs(next: {
    kind: TransactionKind;
    accountId: string;
    categoryId: string;
    keepOpen: boolean;
  }) {
    const recentCategoryIdsNext = pushRecentCategoryId(
      recentCategoryIds,
      next.categoryId,
    );
    setRecentCategoryIds(recentCategoryIdsNext);
    writeQuickAddPrefs({ ...next, recentCategoryIds: recentCategoryIdsNext });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      focusAmount(false);
      return;
    }
    if (!selectedAccountId || !selectedCategoryId) {
      setError("Bạn cần có ít nhất một tài khoản và danh mục phù hợp.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Chọn ngày giao dịch hợp lệ.");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    if (keepOpen) setKeepOpenSession(true);
    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onAdd({
        kind,
        categoryId: selectedCategoryId,
        note: note.trim(),
        accountId: selectedAccountId,
        amount: parsedAmount,
        occurredOn,
        idempotencyKey,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu. Hãy thử lại." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể lưu giao dịch. Hãy thử lại.");
      return;
    }

    persistPrefs({
      kind,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      keepOpen,
    });
    idempotencyKeyRef.current = null;
    setAmount("");
    setNote("");
    setError("");
    categoryTouchedRef.current = false;
    setAutoRuleHint(null);

    if (keepOpen) {
      showKeepOpenSuccess();
      window.requestAnimationFrame(() => focusAmount(false));
      return;
    }
    handleRequestClose();
  }

  const submitDisabled =
    disabled || !accounts.length || !availableCategories.length;
  const footer = (
    <div className={styles.footerActions}>
      <Button
        type="button"
        intent="secondary"
        targetSize="important"
        onClick={handleRequestClose}
        disabled={submitting}
      >
        Hủy
      </Button>
      <Button
        form={formId}
        type="submit"
        intent="primary"
        targetSize="important"
        pending={submitting}
        pendingLabel="Đang lưu..."
        disabled={submitDisabled}
        data-keep-open={keepOpen ? "true" : undefined}
      >
        <Icon name="check" /> {keepOpen ? "Lưu & thêm tiếp" : "Lưu"}
      </Button>
    </div>
  );

  const form = (
    <form
      id={formId}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className={styles.segmented} role="group" aria-label="Loại giao dịch">
        <Button
          type="button"
          unstyled
          targetSize="important"
          className={`${styles.segment}${
            kind === "expense" ? ` ${styles.segmentActive}` : ""
          }`}
          onClick={() => changeKind("expense")}
          aria-pressed={kind === "expense"}
        >
          Khoản chi (−)
        </Button>
        <Button
          type="button"
          unstyled
          targetSize="important"
          className={`${styles.segment}${
            kind === "income" ? ` ${styles.segmentActive}` : ""
          }`}
          onClick={() => changeKind("income")}
          aria-pressed={kind === "income"}
        >
          Khoản thu (+)
        </Button>
      </div>

      <TextField
        id="add-tx-amount"
        inputRef={amountInputRef}
        label={amountLabel}
        description={
          kind === "expense"
            ? "Số tiền khoản chi, đơn vị đồng Việt Nam."
            : "Số tiền khoản thu, đơn vị đồng Việt Nam."
        }
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={amount}
        required
        prefix={kindSign}
        suffix="₫"
        targetSize="important"
        inputClassName={styles.amountInput}
        error={error.startsWith("Nhập số tiền") ? error : undefined}
        onChange={(event) => {
          setAmount(formatMoneyInput(event.target.value));
          markInputChanged();
        }}
      />

      {error && !error.startsWith("Nhập số tiền") ? (
        <Alert tone="error" live="assertive" className={styles.formAlert}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {savedFlash && !error ? (
        <Alert tone="success" live="polite" className={styles.formStatus}>
          <AlertDescription>{savedFlash}</AlertDescription>
        </Alert>
      ) : null}

      <fieldset className={styles.categoryFieldset}>
        <legend>
          Danh mục
          {autoRuleHint ? (
            <span className={styles.legendHint}> · {autoRuleHint}</span>
          ) : hasRecentForKind ? (
            <span className={styles.legendHint}> · hay dùng trước lên trước</span>
          ) : null}
        </legend>
        <div className={styles.categoryGrid}>
          {availableCategories.map((item) => {
            const meta =
              categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
            const recent = isRecentCategoryId(item.id, recentCategoryIds);
            return (
              <Button
                type="button"
                unstyled
                targetSize="important"
                key={item.id}
                className={`${styles.categoryChoice}${
                  selectedCategoryId === item.id
                    ? ` ${styles.categorySelected}`
                    : ""
                }${recent ? ` ${styles.categoryRecent}` : ""}`}
                onClick={() => {
                  setCategoryId(item.id);
                  categoryTouchedRef.current = true;
                  setAutoRuleHint(null);
                  markInputChanged();
                  window.requestAnimationFrame(() => focusAmount(false));
                }}
                aria-pressed={selectedCategoryId === item.id}
                data-recent={recent ? "true" : undefined}
              >
                <span className={styles.categoryIcon}>
                  <Icon name={meta.icon as IconName} />
                </span>
                <span className={styles.categoryLabel}>
                  {item.name}
                  {recent ? (
                    <span className={styles.recentBadge} aria-label="Gần đây">
                      Gần đây
                    </span>
                  ) : null}
                </span>
              </Button>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.formGrid}>
        <SelectField
          label="Tài khoản"
          value={selectedAccountId}
          targetSize="important"
          disabled={submitting}
          onChange={(event) => {
            setAccountId(event.target.value);
            markInputChanged();
          }}
        >
          {accounts.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Ngày"
          type="date"
          value={occurredOn}
          targetSize="important"
          disabled={submitting}
          onChange={(event) => {
            setOccurredOn(event.target.value);
            markInputChanged();
          }}
        />
        <TextField
          label="Ghi chú"
          rootClassName={styles.spanFull}
          value={note}
          targetSize="important"
          disabled={submitting}
          onChange={(event) => applyNoteChange(event.target.value)}
          placeholder="Ví dụ: Cơm trưa"
          maxLength={500}
        />
      </div>

      <label className={styles.keepOpenRow} htmlFor="add-tx-keep-open">
        <input
          id="add-tx-keep-open"
          type="checkbox"
          checked={keepOpen}
          onChange={(event) => {
            const next = event.target.checked;
            setKeepOpen(next);
            persistPrefs({
              kind,
              accountId: selectedAccountId,
              categoryId: selectedCategoryId,
              keepOpen: next,
            });
          }}
        />
        <span className={styles.keepOpenCopy}>
          <strong>Lưu xong thêm tiếp</strong>
          <span>Giữ form mở, focus lại số tiền sau mỗi lần lưu</span>
        </span>
      </label>

      {embedded ? footer : null}
    </form>
  );

  if (embedded) {
    if (!effectiveOpen) return null;
    return (
      <section
        className={styles.embedded}
        aria-labelledby="transaction-embedded-title"
        data-slot="quick-capture-form"
      >
        <header className={styles.embeddedHeading}>
          <p className={styles.embeddedEyebrow}>{eyebrow}</p>
          <h2 id="transaction-embedded-title">{title}</h2>
        </header>
        {form}
      </section>
    );
  }

  return (
    <Dialog
      open={effectiveOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) handleRequestClose();
      }}
      title={title}
      description={eyebrow}
      dismissible={!submitting}
      initialFocusRef={amountInputRef}
      className={styles.dialog}
      contentClassName={styles.dialogContent}
      footer={footer}
    >
      {form}
    </Dialog>
  );
}

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
import {
  MONEY_FRACTION_ENTRY_MESSAGE,
  formatMoneyInput,
  isFractionAttempt,
  moneyKindPrefix,
  parseMoneyInput,
} from "@/lib/money";
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
  initialKind,
  onTransferRequested,
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
  initialKind?: TransactionKind;
  onTransferRequested?: () => void;
}) {
  const formId = useId();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const prefsHydratedRef = useRef(false);
  const savedFlashTimerRef = useRef<number | null>(null);

  const [kind, setKind] = useState<TransactionKind>(initialKind ?? "expense");
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
  const today = todayInVietnam();

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
  const selectedAccount = accounts.find((item) => item.id === selectedAccountId);
  const selectedCategory = availableCategories.find(
    (item) => item.id === selectedCategoryId,
  );
  const selectedCategoryMeta = selectedCategory
    ? categoryMeta[selectedCategory.name] ?? categoryMeta["Thu nhập khác"]
    : categoryMeta["Thu nhập khác"];
  const hasRecentForKind = availableCategories.some((item) =>
    isRecentCategoryId(item.id, recentCategoryIds),
  );
  const kindSign = moneyKindPrefix(kind);
  const amountLabel =
    kind === "expense" ? "Số tiền chi (₫)" : "Số tiền thu (₫)";
  const dateSummary = occurredOn === today ? "Hôm nay" : occurredOn;
  const optionalSummary = note.trim()
    ? `${dateSummary} · ${note.trim()}`
    : `${dateSummary} · Ghi chú & tùy chọn`;
  const visibleSaveLabel = keepOpen
    ? "Lưu & thêm tiếp"
    : amount.trim()
      ? `Lưu ${amount} ₫`
      : "Lưu";

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
      const resolvedKind = initialKind ?? prefs.kind;
      setKind(resolvedKind);
      setKeepOpen(prefs.keepOpen);
      if (prefs.accountId) setAccountId(prefs.accountId);
      if (prefs.recentCategoryIds?.length) {
        setRecentCategoryIds(prefs.recentCategoryIds);
      }
      const forKind = categories.filter((item) => item.kind === resolvedKind);
      const preferred = pickCategoryForKind(
        forKind,
        prefs.recentCategoryIds,
        prefs.kind === resolvedKind ? prefs.categoryId || undefined : undefined,
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
      setError(
        isFractionAttempt(amount)
          ? MONEY_FRACTION_ENTRY_MESSAGE
          : "Nhập số tiền lớn hơn 0.",
      );
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
        aria-label={keepOpen ? "Lưu & thêm tiếp" : "Lưu"}
      >
        <Icon name="check" /> {visibleSaveLabel}
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
      <section className={styles.amountFirst} data-slot="capture-amount-step">
        <TextField
          id="add-tx-amount"
          inputRef={amountInputRef}
          label={amountLabel}
          description="Nhập số tiền trước; MoneyFlow dùng lựa chọn gần nhất bên dưới nếu bạn không đổi."
          inputMode="numeric"
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
      </section>

      <div
        className={`${styles.segmented}${
          onTransferRequested ? ` ${styles.segmentedThree}` : ""
        }`}
        role="group"
        aria-label="Loại giao dịch"
        data-slot="capture-type-step"
      >
        <Button
          type="button"
          unstyled
          targetSize="important"
          className={`${styles.segment}${
            kind === "expense" ? ` ${styles.segmentActive}` : ""
          }`}
          onClick={() => changeKind("expense")}
          aria-pressed={kind === "expense"}
          aria-label="Khoản chi"
        >
          Chi
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
          aria-label="Khoản thu"
        >
          Thu
        </Button>
        {onTransferRequested ? (
          <Button
            type="button"
            unstyled
            targetSize="important"
            className={styles.segment}
            onClick={onTransferRequested}
            aria-label="Chuyển tiền"
          >
            Chuyển
          </Button>
        ) : null}
      </div>

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

      <section
        className={styles.quickConfirmations}
        data-slot="capture-required-choices"
        aria-label="Lựa chọn đang dùng"
      >
        <details className={styles.quickChoice} data-slot="capture-account-choice">
          <summary
            className={styles.quickChoiceSummary}
            aria-label={`Tài khoản, ${selectedAccount?.name ?? "chưa chọn"}`}
          >
            <span className={styles.quickChoiceIcon}>
              <Icon name="wallet" aria-hidden="true" />
            </span>
            <span className={styles.quickChoiceCopy}>
              <small>Tài khoản</small>
              <strong>{selectedAccount?.name ?? "Chưa có tài khoản"}</strong>
            </span>
            <Icon
              name="arrowRight"
              aria-hidden="true"
              className={styles.quickChoiceChevron}
            />
          </summary>
          <div className={styles.quickChoicePanel}>
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
          </div>
        </details>

        <details className={styles.quickChoice} data-slot="capture-category-choice">
          <summary
            className={styles.quickChoiceSummary}
            aria-label={`Danh mục, ${selectedCategory?.name ?? "chưa chọn"}`}
          >
            <span className={styles.quickChoiceIcon}>
              <Icon
                name={selectedCategoryMeta.icon as IconName}
                aria-hidden="true"
              />
            </span>
            <span className={styles.quickChoiceCopy}>
              <small>Danh mục</small>
              <strong>{selectedCategory?.name ?? "Chưa có danh mục"}</strong>
            </span>
            <Icon
              name="arrowRight"
              aria-hidden="true"
              className={styles.quickChoiceChevron}
            />
          </summary>
          <div className={styles.quickChoicePanel}>
            <fieldset className={styles.categoryFieldset}>
              <legend>
                Chọn danh mục
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
          </div>
        </details>
      </section>

      <details className={styles.optionalDisclosure} data-slot="capture-optional-details">
        <summary className={styles.optionalSummary}>
          <span className={styles.quickChoiceIcon}>
            <Icon name="calendar" aria-hidden="true" />
          </span>
          <span className={styles.quickChoiceCopy}>
            <small>Chi tiết</small>
            <strong>{optionalSummary}</strong>
          </span>
          <Icon
            name="arrowRight"
            aria-hidden="true"
            className={styles.quickChoiceChevron}
          />
        </summary>
        <div className={styles.optionalBody}>
          <div className={styles.formGrid}>
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
        </div>
      </details>

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

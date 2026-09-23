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
import { useConnectionState } from "@/hooks/use-connection-state";
import { saveFailureMessage } from "@/lib/connectivity";
import { trackProductEvent } from "@/lib/safe-analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { resolveRuleCategoryFill } from "@/lib/inbox/apply-rules";
import { readStoredRules, type InboxRule } from "@/lib/inbox/rules-store";
import {
  MONEY_FRACTION_ENTRY_MESSAGE,
  formatMoneyInput,
  isFractionAttempt,
  moneyKindPrefix,
  parseMoneyInput,
} from "@/lib/money";
import {
  deriveCanonicalPayeeOffer,
  deriveFrequentLedgerPatterns,
  derivePayeeCategorySuggestion,
  derivePayeeSuggestions,
  deriveRecentPayees,
  deriveStableLedgerPreset,
  type FrequentLedgerPattern,
} from "@/lib/quick-add-defaults";
import {
  isRecentCategoryId,
  orderCategoriesByRecent,
  pickKnownCategoryForKind,
  pushRecentCategoryId,
  pushRecentPreset,
  readQuickAddPrefs,
  writeQuickAddPrefs,
  type QuickAddPreset,
  type QuickAddPrefs,
} from "@/lib/quick-add-prefs";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
  type TransactionKind,
} from "@/lib/sample-data";
import {
  clearUnsentCaptureDraft,
  readUnsentCaptureDraft,
  writeUnsentCaptureDraft,
} from "@/lib/unsent-draft";
import { todayInVietnam } from "@/lib/vietnam-date";
import fastStyles from "./transactions/capture-fast-path.module.css";
import styles from "./transactions/transaction-form.module.css";

const KEEP_OPEN_SUCCESS = "Đã lưu · nhập khoản tiếp";
// Four chips fit one wrapped row inside the optional-details body without
// crowding out the note field; the datalist still covers the long tail.
const RECENT_PAYEE_CHIP_LIMIT = 4;

export function AddTransactionDialog({
  open,
  onClose,
  onAdd,
  accounts,
  categories,
  transactions = [],
  disabled = false,
  embedded = false,
  title = "Ghi chi tiêu",
  eyebrow = "Nhập nhanh",
  initialKind,
  onTransferRequested,
  onFrequentPatternSelectionChange,
  showFrequentPatterns = false,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: CreateTransactionInput) => Promise<{ ok: boolean; message?: string }>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  transactions?: Transaction[];
  disabled?: boolean;
  embedded?: boolean;
  title?: string;
  eyebrow?: string;
  initialKind?: TransactionKind;
  onTransferRequested?: () => void;
  onFrequentPatternSelectionChange?: (rank: 1 | 2 | null) => void;
  showFrequentPatterns?: boolean;
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
  const [payee, setPayee] = useState("");
  const [accountId, setAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayInVietnam());
  const [keepOpen, setKeepOpen] = useState(false);
  const [keepOpenSession, setKeepOpenSession] = useState(false);
  const connectionState = useConnectionState();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [recentPresets, setRecentPresets] = useState<QuickAddPreset[]>([]);
  const [rules, setRules] = useState<InboxRule[]>([]);
  const [autoRuleHint, setAutoRuleHint] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const categoryTouchedRef = useRef(false);
  /*
   * Set by markInputChanged, which only user-initiated edits call. The
   * mount-time draft restore checks it so a form the reader already touched
   * is never silently overwritten by a retained draft.
   */
  const formTouchedRef = useRef(false);
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
    : "";
  const selectedAccount = accounts.find((item) => item.id === selectedAccountId);
  const selectedCategory = availableCategories.find(
    (item) => item.id === selectedCategoryId,
  );
  /*
   * The payee suggestion is an offer, not a default: it renders as a chip the
   * reader taps, and it is excluded from the generic quick chips so the same
   * category can never appear twice in the row.
   */
  const payeeCategorySuggestion = useMemo(
    () =>
      derivePayeeCategorySuggestion({
        transactions,
        payee,
        kind,
        accounts,
        categories,
      }),
    [accounts, categories, kind, payee, transactions],
  );
  const quickCategories = useMemo(
    () =>
      availableCategories
        .filter(
          (item) =>
            item.id !== selectedCategoryId &&
            item.id !== payeeCategorySuggestion?.categoryId,
        )
        .slice(0, 2),
    [availableCategories, payeeCategorySuggestion, selectedCategoryId],
  );
  const frequentPatterns = useMemo(
    () =>
      showFrequentPatterns
        ? deriveFrequentLedgerPatterns({ transactions, accounts, categories })
        : [],
    [accounts, categories, showFrequentPatterns, transactions],
  );
  const payeeSuggestions = useMemo(
    () => derivePayeeSuggestions(transactions),
    [transactions],
  );
  /*
   * Quick-pick chips are the reliable counterpart to the payee datalist
   * (unreliable tap-to-fill on iOS Safari): the user's own most-recent
   * spellings, applied through the same applyPayeeChange path as typing, so a
   * tap also re-evaluates saved deterministic rules. The canonical offer
   * folds case/diacritics — typed "grab" may be offered stored "Grab" so
   * "Chi theo nơi" keeps one spelling per merchant — and stays silent while
   * the field already holds one of the offered chip spellings.
   */
  const recentPayees = useMemo(
    () => deriveRecentPayees(transactions, RECENT_PAYEE_CHIP_LIMIT),
    [transactions],
  );
  const canonicalPayeeOffer = useMemo(
    () => deriveCanonicalPayeeOffer(transactions, payee),
    [payee, transactions],
  );
  const showCanonicalPayeeOffer =
    canonicalPayeeOffer !== null &&
    !recentPayees.some((name) => name === payee.trim());
  const hasRecentForKind = availableCategories.some((item) =>
    isRecentCategoryId(item.id, recentCategoryIds),
  );
  const kindSign = moneyKindPrefix(kind);
  const amountLabel =
    kind === "expense" ? "Số tiền chi (₫)" : "Số tiền thu (₫)";
  const dateSummary = occurredOn === today ? "Hôm nay" : occurredOn;
  const resolvedTitle =
    title === "Ghi chi tiêu"
      ? kind === "expense"
        ? "Ghi khoản chi"
        : "Ghi khoản thu"
      : title;
  const visibleSaveLabel = keepOpen
    ? "Lưu & thêm tiếp"
    : amount.trim()
      ? `Lưu ${amount} ₫`
      : "Lưu";
  const showOneTimeContinue = !keepOpen;

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

  function validPresetForKind(
    presets: QuickAddPreset[] | undefined,
    nextKind: TransactionKind,
  ): QuickAddPreset | undefined {
    return presets?.find(
      (preset) =>
        preset.kind === nextKind &&
        accounts.some((item) => item.id === preset.accountId) &&
        categories.some(
          (item) => item.kind === nextKind && item.id === preset.categoryId,
        ),
    );
  }

  function applyDefaultForKind(
    nextKind: TransactionKind,
    prefs: Pick<
      QuickAddPrefs,
      "accountId" | "categoryId" | "kind" | "recentCategoryIds" | "recentPresets"
    >,
  ) {
    const ledgerPreset = deriveStableLedgerPreset({
      transactions,
      kind: nextKind,
      accounts,
      categories,
    });
    if (ledgerPreset) {
      setAccountId(ledgerPreset.accountId);
      setCategoryId(ledgerPreset.categoryId);
      return;
    }

    const learnedPreset = validPresetForKind(prefs.recentPresets, nextKind);
    if (learnedPreset) {
      setAccountId(learnedPreset.accountId);
      setCategoryId(learnedPreset.categoryId);
      return;
    }

    if (prefs.accountId && accounts.some((item) => item.id === prefs.accountId)) {
      setAccountId(prefs.accountId);
    }
    const forKind = categories.filter((item) => item.kind === nextKind);
    setCategoryId(
      pickKnownCategoryForKind(
        forKind,
        prefs.recentCategoryIds,
        prefs.kind === nextKind ? prefs.categoryId || undefined : undefined,
      ),
    );
  }

  useEffect(() => {
    if (prefsHydratedRef.current) return;
    prefsHydratedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const prefs = readQuickAddPrefs();
      const resolvedKind = initialKind ?? prefs.kind;
      setKind(resolvedKind);
      setKeepOpen(prefs.keepOpen);
      if (prefs.recentCategoryIds?.length) {
        setRecentCategoryIds(prefs.recentCategoryIds);
      }
      if (prefs.recentPresets?.length) {
        setRecentPresets(prefs.recentPresets);
      }

      applyDefaultForKind(resolvedKind, prefs);
      setOccurredOn(todayInVietnam());

      /*
       * A draft left by a failed save outlives the dialog that held it, so it
       * is offered back on the next mount. It only hydrates a fresh form —
       * once the reader has touched any field, their current input wins. ids
       * that no longer resolve (deleted account/category since the failure)
       * fall back to the defaults applied above rather than inventing one.
       */
      const draft = readUnsentCaptureDraft();
      if (draft && !formTouchedRef.current) {
        /*
         * The restored payee goes through applyPayeeChange like every other
         * payee write so saved deterministic rules still see it. When the
         * draft's own category still resolves it counts as the reader's
         * explicit choice — categoryTouchedRef stops a rule fill from
         * overriding it, the same protection chooseCategory gives a tap.
         */
        const draftCategoryResolves = categories.some(
          (item) => item.kind === draft.kind && item.id === draft.categoryId,
        );
        categoryTouchedRef.current = draftCategoryResolves;
        setKind(draft.kind);
        setAmount(formatMoneyInput(String(draft.amount)));
        applyPayeeChange(draft.payee);
        setNote(draft.note);
        setOccurredOn(draft.occurredOn);
        if (accounts.some((item) => item.id === draft.accountId)) {
          setAccountId(draft.accountId);
        }
        if (draftCategoryResolves) {
          setCategoryId(draft.categoryId);
        }
        setDraftRestored(true);
      }
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

  /*
   * A saved deterministic rule evaluates the whole draft — the typed payee is
   * the merchant haystack, the note draft the note haystack — so rules saved
   * from Inbox review as "Nơi chi = X → Y" fire here too. The fill touches
   * only the draft category with visible attribution: a rule's merchant
   * normalization never rewrites typed text, and an explicit category choice
   * (categoryTouchedRef) is never overridden.
   */
  function applyRuleFill(draft: { merchant: string; note: string }) {
    if (categoryTouchedRef.current) return;
    const fill = resolveRuleCategoryFill(
      rules,
      { merchant: draft.merchant, note: draft.note, kind },
      categories,
    );
    if (!fill) {
      setAutoRuleHint(null);
      return;
    }
    setCategoryId(fill.categoryId);
    setAutoRuleHint(fill.hint);
  }

  /*
   * Typing a payee updates the payee plus any explicit saved rule it
   * triggers. The learned category suggestion it may unlock is still applied
   * exclusively through the chip's explicit tap below.
   */
  function applyPayeeChange(value: string) {
    setPayee(value);
    markInputChanged();
    applyRuleFill({ merchant: value, note });
  }

  function applyNoteChange(value: string) {
    setNote(value);
    markInputChanged();
    applyRuleFill({ merchant: payee, note: value });
  }

  function handleRequestClose() {
    clearSavedFlashTimer();
    setKeepOpenSession(false);
    setSavedFlash("");
    onClose();
  }

  function markInputChanged() {
    idempotencyKeyRef.current = null;
    formTouchedRef.current = true;
    setError("");
    if (savedFlash) setSavedFlash("");
    if (draftRestored) setDraftRestored(false);
  }

  function chooseCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    categoryTouchedRef.current = true;
    setAutoRuleHint(null);
    onFrequentPatternSelectionChange?.(null);
    markInputChanged();
    window.requestAnimationFrame(() => focusAmount(false));
  }

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    applyDefaultForKind(nextKind, {
      kind,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      recentCategoryIds,
      recentPresets,
    });
    categoryTouchedRef.current = false;
    setAutoRuleHint(null);
    onFrequentPatternSelectionChange?.(null);
    markInputChanged();
    window.requestAnimationFrame(() => focusAmount(false));
  }

  function chooseFrequentPattern(pattern: FrequentLedgerPattern, rank: 1 | 2) {
    setKind(pattern.kind);
    setAccountId(pattern.accountId);
    setCategoryId(pattern.categoryId);
    categoryTouchedRef.current = true;
    setAutoRuleHint(null);
    markInputChanged();
    onFrequentPatternSelectionChange?.(rank);
    window.requestAnimationFrame(() => focusAmount(false));
  }

  function persistPrefs(
    next: {
      kind: TransactionKind;
      accountId: string;
      categoryId: string;
      keepOpen: boolean;
    },
    learnSuccessfulPreset = false,
  ) {
    const recentCategoryIdsNext = learnSuccessfulPreset
      ? pushRecentCategoryId(recentCategoryIds, next.categoryId)
      : recentCategoryIds;
    const recentPresetsNext = learnSuccessfulPreset
      ? pushRecentPreset(recentPresets, {
          kind: next.kind,
          accountId: next.accountId,
          categoryId: next.categoryId,
        })
      : recentPresets;

    if (learnSuccessfulPreset) {
      setRecentCategoryIds(recentCategoryIdsNext);
      setRecentPresets(recentPresetsNext);
    }
    writeQuickAddPrefs({
      ...next,
      recentCategoryIds: recentCategoryIdsNext,
      recentPresets: recentPresetsNext,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedForNext =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
        "data-capture-continue",
      ) === "true";
    const shouldKeepOpen = keepOpen || submittedForNext;
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
      setError("Chọn tài khoản và danh mục trước khi lưu.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Chọn ngày giao dịch hợp lệ.");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    if (shouldKeepOpen) setKeepOpenSession(true);
    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onAdd({
        kind,
        categoryId: selectedCategoryId,
        note: note.trim(),
        payee: payee.trim(),
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
      /*
       * Offline, "hãy thử lại" is the one recommendation guaranteed not to
       * work. The form keeps everything the reader typed either way, so the
       * message says that instead of sending them into a dead network. The
       * same input is also retained as a draft so a closed tab or navigation
       * no longer discards it — retention only, nothing sends it later.
       */
      writeUnsentCaptureDraft({
        kind,
        amount: parsedAmount,
        note: note.trim(),
        payee: payee.trim(),
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        occurredOn,
        savedAt: new Date().toISOString(),
      });
      setError(
        saveFailureMessage(
          connectionState,
          result.message || "Không thể lưu giao dịch. Hãy thử lại.",
        ),
      );
      return;
    }

    persistPrefs(
      {
        kind,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        keepOpen,
      },
      true,
    );
    clearUnsentCaptureDraft();
    idempotencyKeyRef.current = null;
    setAmount("");
    setNote("");
    setPayee("");
    setError("");
    setDraftRestored(false);
    categoryTouchedRef.current = false;
    setAutoRuleHint(null);

    trackProductEvent("manual_transaction_saved", {
      kind,
      keep_open: shouldKeepOpen,
    });

    if (shouldKeepOpen) {
      showKeepOpenSuccess();
      window.requestAnimationFrame(() => focusAmount(false));
      return;
    }
    handleRequestClose();
  }

  const submitDisabled =
    disabled ||
    !accounts.length ||
    !availableCategories.length ||
    !selectedAccountId ||
    !selectedCategoryId;
  const footer = (
    <div
      className={`${styles.footerActions} ${fastStyles.footerActions}${
        embedded ? ` ${fastStyles.footerActionsEmbedded}` : ""
      }${
        showOneTimeContinue ? ` ${fastStyles.footerActionsWithContinue}` : ""
      }`}
    >
      {embedded ? (
        <Button
          type="button"
          intent="secondary"
          targetSize="important"
          onClick={handleRequestClose}
          disabled={submitting}
        >
          Hủy
        </Button>
      ) : null}
      {showOneTimeContinue ? (
        <Button
          form={formId}
          type="submit"
          intent="secondary"
          targetSize="important"
          disabled={submitDisabled}
          data-capture-continue="true"
        >
          Lưu & thêm tiếp
        </Button>
      ) : null}
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
      className={`${styles.form} ${fastStyles.form}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <section className={styles.amountFirst} data-slot="capture-amount-step">
        <TextField
          id="add-tx-amount"
          inputRef={amountInputRef}
          label={amountLabel}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={amount}
          required
          prefix={kindSign}
          suffix="₫"
          targetSize="important"
          rootClassName={fastStyles.amountField}
          inputClassName={styles.amountInput}
          error={error.startsWith("Nhập số tiền") ? error : undefined}
          onChange={(event) => {
            setAmount(formatMoneyInput(event.target.value));
            markInputChanged();
          }}
        />
      </section>

      <div
        className={`${styles.segmented} ${fastStyles.typeSwitch}${
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

      {frequentPatterns.length ? (
        <section
          className={fastStyles.frequentPatterns}
          aria-labelledby={`${formId}-frequent-patterns`}
          data-slot="capture-frequent-patterns"
        >
          <div className={fastStyles.frequentPatternsHeading}>
            <strong id={`${formId}-frequent-patterns`}>Thường dùng</strong>
            <span>Chỉ đổi loại, tài khoản và danh mục</span>
          </div>
          <div className={fastStyles.frequentPatternGrid}>
            {frequentPatterns.map((pattern, index) => {
              const patternAccount = accounts.find(
                (account) => account.id === pattern.accountId,
              );
              const patternCategory = categories.find(
                (category) => category.id === pattern.categoryId,
              );
              const selected =
                kind === pattern.kind &&
                selectedAccountId === pattern.accountId &&
                selectedCategoryId === pattern.categoryId;
              if (!patternAccount || !patternCategory) return null;
              return (
                <Button
                  type="button"
                  unstyled
                  targetSize="important"
                  key={`${pattern.kind}-${pattern.accountId}-${pattern.categoryId}`}
                  className={fastStyles.frequentPattern}
                  onClick={() =>
                    chooseFrequentPattern(pattern, (index + 1) as 1 | 2)
                  }
                  aria-pressed={selected}
                  aria-label={`Dùng mẫu ${pattern.kind === "expense" ? "chi" : "thu"}, ${patternCategory.name}, ${patternAccount.name}`}
                >
                  <strong>{patternCategory.name}</strong>
                  <span>
                    {pattern.kind === "expense" ? "Chi" : "Thu"} · {patternAccount.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      ) : null}

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
      {draftRestored && !error && !savedFlash ? (
        <Alert
          tone="info"
          live="polite"
          className={styles.formStatus}
          data-slot="capture-draft-restored"
        >
          <AlertDescription>Đã khôi phục nháp chưa gửi</AlertDescription>
        </Alert>
      ) : null}

      <section
        className={fastStyles.fastDefaults}
        data-slot="capture-required-choices"
        aria-label="Danh mục và tài khoản đang dùng"
      >
        <div className={fastStyles.currentChoice} data-slot="capture-fast-defaults">
          <span className={fastStyles.currentCopy}>
            <strong>{selectedCategory?.name ?? "Chọn danh mục"}</strong>
            <small>{selectedAccount?.name ?? "Chưa có tài khoản"}</small>
          </span>
          <span className={fastStyles.currentStatus}>
            {selectedCategory ? "Đang dùng" : "Cần chọn"}
          </span>
        </div>

        <div
          className={fastStyles.categoryActions}
          role="group"
          aria-label="Đổi nhanh danh mục"
          data-slot="capture-category-suggestions"
        >
          {!autoRuleHint &&
          payeeCategorySuggestion &&
          payeeCategorySuggestion.categoryId !== selectedCategoryId ? (
            <Button
              type="button"
              unstyled
              targetSize="important"
              className={fastStyles.categoryChip}
              onClick={() =>
                chooseCategory(payeeCategorySuggestion.categoryId)
              }
              aria-label={`Dùng danh mục gợi ý ${payeeCategorySuggestion.categoryName} cho ${payeeCategorySuggestion.matchedPayee}`}
              data-payee-suggestion="true"
            >
              <Icon name="spark" aria-hidden="true" />
              <span>Gợi ý · {payeeCategorySuggestion.categoryName}</span>
            </Button>
          ) : null}
          {quickCategories.map((item) => {
            const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
            return (
              <Button
                type="button"
                unstyled
                targetSize="important"
                key={item.id}
                className={fastStyles.categoryChip}
                onClick={() => chooseCategory(item.id)}
                aria-label={`Chọn danh mục ${item.name}`}
              >
                <Icon name={meta.icon as IconName} aria-hidden="true" />
                <span>{item.name}</span>
              </Button>
            );
          })}

          <details
            className={fastStyles.moreDisclosure}
            data-slot="capture-category-choice"
          >
            <summary
              className={fastStyles.moreSummary}
              aria-label="Đổi tài khoản hoặc xem tất cả danh mục"
            >
              <span>Khác</span>
              <Icon name="arrowRight" aria-hidden="true" />
            </summary>
            <div className={fastStyles.morePanel}>
              <SelectField
                label="Tài khoản"
                value={selectedAccountId}
                targetSize="important"
                disabled={submitting}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  onFrequentPatternSelectionChange?.(null);
                  markInputChanged();
                }}
              >
                {accounts.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectField>

              <fieldset className={styles.categoryFieldset}>
                <legend>
                  Tất cả danh mục
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
                        onClick={() => chooseCategory(item.id)}
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
        </div>
      </section>

      <details
        className={`${styles.optionalDisclosure} ${fastStyles.secondaryDisclosure}`}
        data-slot="capture-optional-details"
      >
        <summary className={`${styles.optionalSummary} ${fastStyles.secondarySummary}`}>
          <span>{dateSummary}</span>
          <span className={fastStyles.secondaryAction}>
            {note.trim() ? "Sửa ghi chú" : "+ Ghi chú"}
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
              label="Nơi giao dịch (không bắt buộc)"
              rootClassName={styles.spanFull}
              value={payee}
              targetSize="important"
              disabled={submitting}
              onChange={(event) => applyPayeeChange(event.target.value)}
              placeholder="Ví dụ: Highlands Coffee"
              maxLength={200}
              list={`${formId}-payees`}
            />
            {payeeSuggestions.length > 0 ? (
              <datalist id={`${formId}-payees`}>
                {payeeSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            ) : null}
            {recentPayees.length > 0 || showCanonicalPayeeOffer ? (
              <div
                className={`${styles.spanFull} ${fastStyles.payeeChipRow}`}
                role="group"
                aria-label="Nơi giao dịch gần đây"
                data-slot="capture-payee-chips"
              >
                {recentPayees.map((name) => (
                  <Button
                    type="button"
                    unstyled
                    targetSize="important"
                    key={name}
                    className={fastStyles.categoryChip}
                    onClick={() => applyPayeeChange(name)}
                    aria-label={`Dùng nơi giao dịch ${name}`}
                    aria-pressed={payee === name}
                  >
                    <span>{name}</span>
                  </Button>
                ))}
                {showCanonicalPayeeOffer ? (
                  <Button
                    type="button"
                    unstyled
                    targetSize="important"
                    className={fastStyles.categoryChip}
                    onClick={() => applyPayeeChange(canonicalPayeeOffer)}
                    aria-label={`Dùng chính tả ${canonicalPayeeOffer}`}
                    data-payee-canonical="true"
                  >
                    <Icon name="spark" aria-hidden="true" />
                    <span>Dùng “{canonicalPayeeOffer}”?</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
            <TextField
              label="Ghi chú (không bắt buộc)"
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
          <h2 id="transaction-embedded-title">{resolvedTitle}</h2>
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
      title={resolvedTitle}
      dismissible={!submitting}
      initialFocusRef={amountInputRef}
      className={`${styles.dialog} ${fastStyles.compactDialog}`}
      contentClassName={`${styles.dialogContent} ${fastStyles.compactDialogContent}`}
      footer={footer}
    >
      {form}
    </Dialog>
  );
}

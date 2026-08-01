import { readFileSync } from "node:fs";

const path = "src/components/inbox/inbox-page.tsx";

function replaceOnce(
  source: string,
  before: string | RegExp,
  after: string,
  label: string,
): string {
  const next = source.replace(before, after);
  if (next === source) throw new Error(`codemod_missing_${label}`);
  return next;
}

export function emitAtomicInboxPagePatch(): never {
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    'import { useTransactions } from "@/hooks/use-transactions";',
    'import { approveInboxCandidateAction } from "@/app/actions/inbox-approval";\nimport { useTransactions } from "@/hooks/use-transactions";',
    "action_import",
  );

  source = replaceOnce(
    source,
    '  const [bulkBusy, setBulkBusy] = useState(false);',
    '  const [bulkBusy, setBulkBusy] = useState(false);\n  const [approvalBusy, setApprovalBusy] = useState(false);',
    "approval_state",
  );

  source = replaceOnce(
    source,
    `      if (!result.ok) {
        setErrorMessage(result.message || "Không tải được inbox");
        setLoadState("error");
        return;
      }
      setCandidates(result.candidates);
      setErrorMessage("");
      setLoadState("ready");`,
    `      if (!result.ok) {
        setErrorMessage(result.message || "Không tải được inbox");
        setLoadState("error");
        return false;
      }
      setCandidates(result.candidates);
      setErrorMessage("");
      setLoadState("ready");
      return true;`,
    "load_result",
  );

  source = replaceOnce(
    source,
    /  async function postOne\([\s\S]*?\n  async function handleReject\(candidateId: string\) \{/,
    `  async function postOne(
    payload: ReviewSubmitPayload,
    options?: { allowHeuristicDuplicate?: boolean },
  ): Promise<{ ok: boolean; message?: string }> {
    const post = payload.post;

    if (!viewer.isDemo) {
      setApprovalBusy(true);
      try {
        const result = await approveInboxCandidateAction({
          candidateId: payload.candidateId,
          kind: payload.draft.kind,
          accountId:
            post.mode === "money" ? post.input.accountId : post.input.sourceAccountId,
          categoryId: post.mode === "money" ? post.input.categoryId : null,
          destinationAccountId:
            post.mode === "transfer" ? post.input.destinationAccountId : null,
          amount: post.input.amount,
          occurredOn: post.input.occurredOn,
          note: post.input.note,
          idempotencyKey: post.input.idempotencyKey,
          allowHeuristicDuplicate: options?.allowHeuristicDuplicate === true,
        });
        if (!result.ok) return result;

        const loaded = await load({ showLoading: false });
        if (!loaded) {
          router.refresh();
          return {
            ok: false,
            message: "Đã duyệt nhưng chưa tải lại được Inbox. Hãy làm mới trang.",
          };
        }
        setSelectedIds((current) => current.filter((id) => id !== payload.candidateId));
        setNotice(
          safeUserNotice(
            \`Đã duyệt “\${payload.draft.merchant.trim() || "giao dịch"}” vào sổ.\`,
            "Đã duyệt giao dịch vào sổ.",
          ),
        );
        router.refresh();
        return { ok: true };
      } catch {
        return { ok: false, message: "Mất kết nối khi duyệt Inbox. Hãy thử lại." };
      } finally {
        setApprovalBusy(false);
      }
    }

    const accountId =
      post.mode === "money" ? post.input.accountId : post.input.sourceAccountId;
    const account = workspace.accounts.find((item) => item.id === accountId);
    const category =
      post.mode === "money"
        ? workspace.categories.find((item) => item.id === post.input.categoryId)
        : undefined;

    let result: { ok: boolean; message?: string };
    try {
      if (post.mode === "transfer") {
        result = await addTransfer(post.input);
      } else {
        result = await addTransaction(post.input);
      }
    } catch {
      return { ok: false, message: "Mất kết nối khi ghi sổ. Hãy thử lại." };
    }

    if (!result.ok) {
      return { ok: false, message: result.message || "Không thể ghi sổ." };
    }

    const next = markCandidatesStatus(
      candidatesRef.current,
      [payload.candidateId],
      "approved",
      {
        kind: payload.draft.kind,
        amount: payload.draft.amount,
        merchant: payload.draft.merchant.trim() || "Không rõ",
        note: payload.draft.note.trim(),
        occurredOn: payload.draft.occurredOn,
        categoryId: category?.id,
        category: category?.name,
        accountId: account?.id,
        account: account?.name,
        possibleDuplicate: payload.draft.possibleDuplicate,
      },
    );
    const saved = await persist(next, [payload.candidateId]);
    if (!saved) {
      return { ok: false, message: "Đã ghi sổ nhưng chưa cập nhật được trạng thái Inbox." };
    }
    candidatesRef.current = next;
    setSelectedIds((current) => current.filter((id) => id !== payload.candidateId));
    setNotice(
      safeUserNotice(
        \`Đã duyệt “\${payload.draft.merchant.trim() || "giao dịch"}” vào sổ.\`,
        "Đã duyệt giao dịch vào sổ.",
      ),
    );
    return { ok: true };
  }

  async function handleApproveReview(
    payload: ReviewSubmitPayload,
  ): Promise<{ ok: boolean; message?: string }> {
    return postOne(payload, {
      allowHeuristicDuplicate: payload.draft.possibleDuplicate === true,
    });
  }

  async function handleReject(candidateId: string) {`,
    "post_one",
  );

  source = replaceOnce(
    source,
    `        const result = await postOne({
          candidateId: candidate.id,
          draft,
          post,
        });`,
    `        const result = await postOne(
          {
            candidateId: candidate.id,
            draft,
            post,
          },
          { allowHeuristicDuplicate: false },
        );`,
    "bulk_call",
  );

  source = replaceOnce(
    source,
    '  const isMutatingRef = useRef(isMutating);',
    '  const isMutatingRef = useRef(isMutating);\n  const approvalBusyRef = useRef(approvalBusy);',
    "busy_ref",
  );

  source = replaceOnce(
    source,
    '    isMutatingRef.current = isMutating;\n    reviewOpenRef.current = reviewOpen;',
    '    isMutatingRef.current = isMutating;\n    approvalBusyRef.current = approvalBusy;\n    reviewOpenRef.current = reviewOpen;',
    "busy_ref_update",
  );

  source = replaceOnce(
    source,
    '        if (bulkBusyRef.current || isMutatingRef.current) return;',
    '        if (bulkBusyRef.current || isMutatingRef.current || approvalBusyRef.current) return;',
    "shortcut_guard",
  );

  source = source.replaceAll(
    'busy={bulkBusy || isMutating}',
    'busy={bulkBusy || isMutating || approvalBusy}',
  );
  source = replaceOnce(
    source,
    '          busy={isMutating}',
    '          busy={isMutating || approvalBusy}',
    "review_busy",
  );

  const encoded = Buffer.from(source, "utf8").toString("base64");
  console.log(`ATOMIC_INBOX_PAGE_BASE64_BEGIN\n${encoded}\nATOMIC_INBOX_PAGE_BASE64_END`);
  throw new Error("atomic_inbox_page_artifact_ready");
}

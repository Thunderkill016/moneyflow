"use client";

import { useEffect, useMemo, useState } from "react";
import { archiveCommitmentAction, payCommitmentAction, saveCommitmentAction, undoCommitmentPaymentAction } from "@/app/actions/commitments";
import { CommitmentDialog } from "@/components/commitment-dialog";
import { Icon, type IconName } from "@/components/icons";
import { type ViewerSummary } from "@/components/user-chip";
import { commitmentTotals, dueDateForMonth, type RecurringCommitment, type SaveCommitmentInput } from "@/lib/commitments";
import { formatMoney } from "@/lib/money";
import { categoryMeta, type AccountOption, type CategoryOption } from "@/lib/sample-data";
import { AppShell } from "@/components/layout/app-shell";

function daysBetween(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000); }
function dueLabel(item: RecurringCommitment, today: string) { if (item.isPaid) return "Đã thanh toán"; const days = daysBetween(today, item.dueDate); if (days === 0) return "Đến hạn hôm nay"; if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`; return `Còn ${days} ngày`; }

export function CommitmentsPage({ viewer, initialCommitments, accounts, categories, monthStart, today, dataError }: { viewer: ViewerSummary; initialCommitments: RecurringCommitment[]; accounts: AccountOption[]; categories: CategoryOption[]; monthStart: string; today: string; dataError: string | null }) {
  const [items, setItems] = useState(initialCommitments); const [editing, setEditing] = useState<RecurringCommitment | null>(null); const [dialogOpen, setDialogOpen] = useState(false); const [version, setVersion] = useState(0); const [busyId, setBusyId] = useState<string | null>(null); const [notice, setNotice] = useState(""); const [showArchived, setShowArchived] = useState(false);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4000); return () => window.clearTimeout(timer); }, [notice]);
  const active = useMemo(() => items.filter((item) => !item.isArchived).sort((a, b) => Number(a.isPaid) - Number(b.isPaid) || a.dueDay - b.dueDay), [items]); const visible = showArchived ? items.filter((item) => item.isArchived) : active; const totals = commitmentTotals(items);
  function open(item: RecurringCommitment | null) { setEditing(item); setVersion((value) => value + 1); setDialogOpen(true); }
  async function save(input: SaveCommitmentInput) {
    if (viewer.isDemo) { const category = categories.find((item) => item.id === input.categoryId); const account = accounts.find((item) => item.id === input.accountId); if (!category || !account) return { ok: false, message: "Tài khoản hoặc danh mục không hợp lệ." }; const existing = items.find((item) => item.id === input.id); const dueDate = dueDateForMonth(monthStart, input.dueDay); const next: RecurringCommitment = { ...input, id: existing?.id ?? crypto.randomUUID(), dueDate, accountName: account.name, categoryName: category.name, categoryIcon: category.icon, categoryColor: category.color, isArchived: false, isPaid: existing?.isPaid ?? false, transactionId: existing?.transactionId ?? null }; setItems((current) => existing ? current.map((item) => item.id === existing.id ? next : item) : [...current, next]); setDialogOpen(false); setNotice(existing ? "Đã cập nhật khoản định kỳ demo." : "Đã thêm khoản định kỳ demo."); return { ok: true }; }
    const result = await saveCommitmentAction(input, monthStart); if (result.ok && result.commitment) { setItems((current) => current.some((item) => item.id === result.commitment!.id) ? current.map((item) => item.id === result.commitment!.id ? result.commitment! : item) : [...current, result.commitment!]); setDialogOpen(false); setNotice("Đã lưu khoản định kỳ."); } return result;
  }
  async function archive(item: RecurringCommitment) { const verb = item.isArchived ? "khôi phục" : "lưu trữ"; if (!window.confirm(`${item.isArchived ? "Khôi phục" : "Lưu trữ"} “${item.name}”? Giao dịch đã ghi vẫn được giữ nguyên.`)) return; setBusyId(item.id); const result = viewer.isDemo ? { ok: true as const } : await archiveCommitmentAction(item.id, !item.isArchived); setBusyId(null); if (!result.ok) { setNotice(result.message); return; } setItems((current) => current.map((value) => value.id === item.id ? { ...value, isArchived: !value.isArchived } : value)); setNotice(`Đã ${verb} khoản định kỳ.`); }
  async function pay(item: RecurringCommitment) { if (!window.confirm(`Xác nhận đã thanh toán “${item.name}” ${formatMoney(item.amount)}? MoneyFlow sẽ tạo một giao dịch chi thật từ ${item.accountName}.`)) return; setBusyId(item.id); const result = viewer.isDemo ? { ok: true as const, transactionId: crypto.randomUUID() } : await payCommitmentAction(item.id, monthStart, today, crypto.randomUUID()); setBusyId(null); if (!result.ok) { setNotice(result.message); return; } setItems((current) => current.map((value) => value.id === item.id ? { ...value, isPaid: true, transactionId: result.transactionId ?? "demo-paid" } : value)); setNotice(`Đã ghi thanh toán ${formatMoney(item.amount)} vào sổ giao dịch.`); }
  async function undo(item: RecurringCommitment) { if (!window.confirm(`Hoàn tác thanh toán “${item.name}”? Giao dịch chi vừa liên kết sẽ bị xóa khỏi số dư.`)) return; setBusyId(item.id); const result = viewer.isDemo ? { ok: true as const } : await undoCommitmentPaymentAction(item.id, monthStart); setBusyId(null); if (!result.ok) { setNotice(result.message); return; } setItems((current) => current.map((value) => value.id === item.id ? { ...value, isPaid: false, transactionId: null } : value)); setNotice("Đã hoàn tác thanh toán."); }
  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm khoản định kỳ",
        onClick: () => open(null),
        disabled: Boolean(dataError) || !accounts.length,
      }}
      fabAction={{
        label: "Thêm khoản định kỳ",
        onClick: () => open(null),
        disabled: Boolean(dataError),
      }}
      notice={notice}
    >
      <main className="dashboard commitments-workspace">
        {dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{dataError}</span></div>}
        <section className="budgets-heading">
          <div>
            <p className="eyebrow">Tiền phải trả</p>
            <h1>Khoản định kỳ</h1>
            <p>Giữ trước tiền hóa đơn để con số “có thể chi” luôn thực tế.</p>
          </div>
        </section>
        <section className="budget-overview commitment-overview">
          <div>
            <span>Đang giữ trước</span>
            <strong className="font-mono">{formatMoney(totals.reserved)}</strong>
          </div>
          <div>
            <span>Đã thanh toán</span>
            <strong className="positive font-mono">{formatMoney(totals.paid)}</strong>
          </div>
          <div>
            <span>Chưa thanh toán</span>
            <strong>{active.filter((item) => !item.isPaid).length} khoản</strong>
          </div>
        </section>
        <div className="commitment-list-heading">
          <div>
            <h2>{showArchived ? "Đã lưu trữ" : "Lịch thanh toán tháng này"}</h2>
            <p>Ngày 31 sẽ tự chuyển thành ngày cuối tháng nếu tháng ngắn hơn.</p>
          </div>
          <button onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "Xem đang hoạt động" : `Đã lưu trữ (${items.filter((item) => item.isArchived).length})`}
          </button>
        </div>
        {visible.length ? (
          <section className="commitment-card-grid">
            {visible.map((item) => {
              const meta = categoryMeta[item.categoryName] ?? { icon: "receipt", color: "cyan" };
              const overdue = !item.isPaid && item.dueDate < today;
              return (
                <article className={`commitment-card${item.isPaid ? " paid" : overdue ? " overdue" : ""}`} key={item.id}>
                  <div className="commitment-main">
                    <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                    <div>
                      <div className="commitment-title">
                        <h3>{item.name}</h3>
                        <span>{dueLabel(item, today)}</span>
                      </div>
                      <p>{item.categoryName} · {item.accountName} · hạn ngày {item.dueDay}</p>
                    </div>
                    <strong className="font-mono">{formatMoney(item.amount)}</strong>
                  </div>
                  <div className="commitment-actions">
                    {!item.isArchived && (
                      item.isPaid ? (
                        <button onClick={() => undo(item)} disabled={busyId === item.id}><Icon name="restore" />Hoàn tác</button>
                      ) : (
                        <button className="commitment-pay" onClick={() => pay(item)} disabled={busyId === item.id}><Icon name="check" />Đã thanh toán</button>
                      )
                    )}
                    {!item.isArchived && (
                      <button onClick={() => open(item)} disabled={busyId === item.id}><Icon name="edit" />Sửa</button>
                    )}
                    <button onClick={() => archive(item)} disabled={busyId === item.id}>
                      <Icon name={item.isArchived ? "restore" : "archive"} />
                      {item.isArchived ? "Khôi phục" : "Lưu trữ"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="budget-page-empty">
            <span><Icon name="calendar" /></span>
            <h2>{showArchived ? "Không có khoản đã lưu trữ" : "Chưa có khoản định kỳ"}</h2>
            <p>{showArchived ? "Các khoản bạn lưu trữ sẽ xuất hiện tại đây." : "Thêm tiền nhà hoặc hóa đơn để MoneyFlow giữ trước cho bạn."}</p>
            {!showArchived && <button className="primary-button" onClick={() => open(null)}><Icon name="plus" />Thêm khoản đầu tiên</button>}
          </section>
        )}
      </main>
      <CommitmentDialog key={`${editing?.id ?? "new"}-${version}`} open={dialogOpen} commitment={editing} accounts={accounts} categories={categories} onClose={() => setDialogOpen(false)} onSave={save} />
    </AppShell>
  );
}

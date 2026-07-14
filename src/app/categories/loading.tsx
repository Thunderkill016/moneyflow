import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell
      viewer={{ email: null, displayName: null, isDemo: true }}
      primaryAction={{ label: "Thêm danh mục", disabled: true }}
    >
      <main className="dashboard accounts-workspace categories-workspace">
        <section className="accounts-heading" aria-busy="true" aria-label="Đang tải danh mục">
          <div>
            <div className="loading-line" style={{ width: 88 }} />
            <div className="loading-line wide" style={{ width: 160, marginTop: 10 }} />
            <div className="loading-line" style={{ width: 280, marginTop: 10 }} />
          </div>
        </section>
        <div className="account-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="account-card" key={index}>
              <div className="loading-line" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div>
                <div className="loading-line wide" />
                <div className="loading-line" style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}

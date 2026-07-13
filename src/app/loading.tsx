export default function Loading() {
  return (
    <main className="dashboard route-loading" aria-label="Đang tải dữ liệu tài chính">
      <section className="welcome-row">
        <div>
          <div className="loading-line" style={{ width: "120px", height: "14px" }} />
          <div className="loading-line wide" style={{ width: "240px", height: "32px", marginTop: "12px" }} />
          <div className="loading-line" style={{ width: "320px", height: "16px", marginTop: "8px" }} />
        </div>
      </section>

      <section className="hero-grid">
        <div className="loading-card" style={{ height: "180px", borderRadius: "18px", marginTop: "0" }} />
        <div className="loading-card" style={{ height: "180px", borderRadius: "18px", marginTop: "0" }} />
      </section>

      <section className="content-grid">
        <div className="loading-card tall" style={{ height: "420px", borderRadius: "18px", marginTop: "0" }} />
        <div className="right-stack">
          <div className="loading-card" style={{ height: "120px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "80px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "120px", borderRadius: "18px", marginTop: "0" }} />
        </div>
      </section>
    </main>
  );
}

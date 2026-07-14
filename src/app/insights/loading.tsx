export default function Loading() {
  return (
    <main className="dashboard route-loading" aria-label="Đang tải Tổng quan" aria-busy="true">
      <section className="welcome-row">
        <div>
          <div className="loading-line" style={{ width: "100px", height: "14px" }} />
          <div
            className="loading-line wide"
            style={{ width: "220px", height: "32px", marginTop: "12px" }}
          />
          <div
            className="loading-line"
            style={{ width: "300px", height: "16px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className="insights-kpi" aria-hidden="true">
        <article>
          <div className="loading-line" style={{ width: "70px", height: "10px" }} />
          <div className="loading-line" style={{ width: "110px", height: "22px", marginTop: "10px" }} />
        </article>
        <article>
          <div className="loading-line" style={{ width: "70px", height: "10px" }} />
          <div className="loading-line" style={{ width: "100px", height: "22px", marginTop: "10px" }} />
        </article>
        <article>
          <div className="loading-line" style={{ width: "70px", height: "10px" }} />
          <div className="loading-line" style={{ width: "100px", height: "22px", marginTop: "10px" }} />
        </article>
        <article>
          <div className="loading-line" style={{ width: "50px", height: "10px" }} />
          <div className="loading-line" style={{ width: "90px", height: "22px", marginTop: "10px" }} />
        </article>
      </section>

      <section className="content-grid insights-main-grid">
        <div className="insights-main-stack">
          <div className="loading-card" style={{ height: "240px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "320px", borderRadius: "18px", marginTop: "0" }} />
        </div>
        <div className="right-stack">
          <div className="loading-card" style={{ height: "140px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "120px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "80px", borderRadius: "18px", marginTop: "0" }} />
          <div className="loading-card" style={{ height: "120px", borderRadius: "18px", marginTop: "0" }} />
        </div>
      </section>
    </main>
  );
}

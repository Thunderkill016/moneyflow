export default function Loading() {
  return (
    <main
      className="dashboard route-loading reports-workspace"
      aria-label="Đang tải báo cáo"
      aria-busy="true"
    >
      <section className="reports-heading">
        <div>
          <div className="loading-line" style={{ width: "120px", height: "12px" }} />
          <div
            className="loading-line wide"
            style={{ width: "140px", height: "28px", marginTop: "10px" }}
          />
          <div
            className="loading-line"
            style={{ width: "280px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <div
        className="report-periods"
        aria-hidden="true"
        style={{ display: "flex", gap: "8px", marginTop: "16px" }}
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="loading-line"
            key={index}
            style={{ width: "88px", height: "36px", borderRadius: "999px", marginTop: 0 }}
          />
        ))}
      </div>

      <section
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="loading-card"
            key={index}
            style={{ height: "88px", borderRadius: "16px", marginTop: 0 }}
          />
        ))}
      </section>

      <div
        className="loading-card"
        aria-hidden="true"
        style={{ height: "220px", borderRadius: "18px", marginTop: "16px" }}
      />
      <div
        className="loading-card"
        aria-hidden="true"
        style={{ height: "160px", borderRadius: "18px", marginTop: "12px" }}
      />
    </main>
  );
}

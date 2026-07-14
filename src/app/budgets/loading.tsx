export default function Loading() {
  return (
    <main
      className="dashboard route-loading budgets-workspace"
      aria-label="Đang tải ngân sách"
      aria-busy="true"
    >
      <section className="budgets-heading">
        <div>
          <div className="loading-line" style={{ width: "140px", height: "12px" }} />
          <div
            className="loading-line wide"
            style={{ width: "160px", height: "28px", marginTop: "10px" }}
          />
          <div
            className="loading-line"
            style={{ width: "260px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section aria-hidden="true" style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="loading-card"
            key={index}
            style={{ height: "96px", borderRadius: "16px", marginTop: 0 }}
          />
        ))}
      </section>
    </main>
  );
}

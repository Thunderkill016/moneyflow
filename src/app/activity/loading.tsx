export default function Loading() {
  return (
    <main
      className="dashboard route-loading transactions-workspace"
      aria-label="Đang tải hoạt động"
      aria-busy="true"
    >
      <section className="transactions-title-row">
        <div>
          <div className="loading-line" style={{ width: "110px", height: "12px" }} />
          <div
            className="loading-line wide"
            style={{ width: "180px", height: "30px", marginTop: "10px" }}
          />
          <div
            className="loading-line"
            style={{ width: "320px", maxWidth: "100%", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className="transaction-summary" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>
            <div className="loading-line" style={{ width: "58px", height: "24px" }} />
            <div className="loading-line" style={{ width: "82px", height: "12px", marginTop: "8px" }} />
          </div>
        ))}
      </section>

      <section className="transaction-manager panel" aria-hidden="true">
        <div className="loading-line wide" style={{ width: "100%", maxWidth: "420px", height: "42px" }} />
        <div style={{ marginTop: "18px" }}>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="loading-line"
              style={{
                width: "100%",
                height: "68px",
                marginTop: index === 0 ? 0 : "10px",
                borderRadius: "12px",
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

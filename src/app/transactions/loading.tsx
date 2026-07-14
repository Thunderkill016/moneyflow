export default function Loading() {
  return (
    <main
      className="dashboard route-loading transactions-workspace"
      aria-label="Đang tải giao dịch"
      aria-busy="true"
    >
      <section className="transactions-title-row">
        <div>
          <div className="loading-line" style={{ width: "120px", height: "12px" }} />
          <div
            className="loading-line wide"
            style={{ width: "200px", height: "28px", marginTop: "10px" }}
          />
          <div
            className="loading-line"
            style={{ width: "280px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className="transaction-summary" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}>
            <div className="loading-line" style={{ width: "64px", height: "22px" }} />
            <div className="loading-line" style={{ width: "72px", height: "12px", marginTop: "8px" }} />
          </div>
        ))}
      </section>

      <section className="transaction-manager panel" aria-hidden="true">
        <div className="loading-line wide" style={{ width: "100%", maxWidth: "360px", height: "40px" }} />
        <div style={{ marginTop: "18px" }}>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="loading-line"
              style={{
                width: "100%",
                height: "52px",
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

export default function Loading() {
  return (
    <main
      className="dashboard route-loading accounts-workspace"
      aria-label="Đang tải tài khoản"
      aria-busy="true"
    >
      <section className="accounts-heading">
        <div>
          <div className="loading-line" style={{ width: "100px", height: "12px" }} />
          <div
            className="loading-line wide"
            style={{ width: "160px", height: "28px", marginTop: "10px" }}
          />
          <div
            className="loading-line"
            style={{ width: "300px", height: "14px", marginTop: "8px" }}
          />
        </div>
      </section>

      <section className="accounts-summary" aria-hidden="true">
        <div>
          <div className="loading-line" style={{ width: "80px", height: "12px" }} />
          <div
            className="loading-line"
            style={{ width: "140px", height: "28px", marginTop: "10px" }}
          />
        </div>
      </section>

      <section className="account-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="loading-card" key={index} style={{ height: "140px", borderRadius: "18px" }} />
        ))}
      </section>
    </main>
  );
}

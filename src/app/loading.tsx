/** Root loading while resolving public landing vs redirect. */
export default function Loading() {
  return (
    <main className="route-loading" aria-label="Đang tải" aria-busy="true">
      <div className="loading-line wide" style={{ width: "200px", height: "20px" }} />
      <div
        className="loading-line"
        style={{ width: "280px", height: "14px", marginTop: "12px" }}
      />
    </main>
  );
}

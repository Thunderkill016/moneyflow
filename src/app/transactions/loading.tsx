export default function Loading() {
  return (
    <main className="route-loading" aria-label="Đang tải giao dịch" aria-busy="true">
      <div className="loading-line wide" /><div className="loading-line" />
      <div className="loading-card" /><div className="loading-card tall" />
    </main>
  );
}

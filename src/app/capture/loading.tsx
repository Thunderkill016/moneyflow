export default function Loading() {
  return (
    <main className="route-loading capture-route-loading" aria-label="Đang tải Capture" aria-busy="true">
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-skeleton-block">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="capture-skeleton-row" key={index}>
            <span className="loading-line capture-skel-icon" />
            <span className="loading-line capture-skel-label" />
            <span className="loading-line capture-skel-desc" />
          </div>
        ))}
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="route-loading rules-route-loading" aria-label="Đang tải Quy tắc" aria-busy="true">
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="rules-skeleton-block">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rules-skeleton-row" key={index}>
            <span className="loading-line rules-skel-pri" />
            <span className="loading-line rules-skel-body" />
            <span className="loading-line rules-skel-btn" />
          </div>
        ))}
      </div>
    </main>
  );
}

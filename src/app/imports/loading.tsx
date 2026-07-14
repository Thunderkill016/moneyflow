export default function Loading() {
  return (
    <main
      className="route-loading imports-route-loading"
      aria-label="Đang tải Lịch sử import"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="imports-skeleton-block">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="imports-skeleton-row" key={index}>
            <span className="loading-line imports-skel-date" />
            <span className="loading-line imports-skel-body" />
            <span className="loading-line imports-skel-btn" />
          </div>
        ))}
      </div>
    </main>
  );
}

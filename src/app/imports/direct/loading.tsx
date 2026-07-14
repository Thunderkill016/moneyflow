export default function Loading() {
  return (
    <div
      className="route-loading imports-route-loading"
      aria-busy="true"
      aria-label="Đang tải import CSV thẳng vào sổ"
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
    </div>
  );
}

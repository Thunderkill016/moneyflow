export default function Loading() {
  return (
    <main
      className="route-loading capture-route-loading"
      aria-label="Đang tải nhận chia sẻ"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-skeleton-block">
        <div className="capture-skeleton-row">
          <span className="loading-line capture-skel-label" />
          <span className="loading-line capture-skel-desc" />
        </div>
      </div>
    </main>
  );
}

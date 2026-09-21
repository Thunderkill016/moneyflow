export default function Loading() {
  return (
    <main
      className="route-loading privacy-route-loading"
      aria-label="Đang tải cài đặt ứng dụng"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="privacy-skeleton-block">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="privacy-skeleton-card" key={index}>
            <span className="loading-line privacy-skel-title" />
            <span className="loading-line privacy-skel-body" />
            <span className="loading-line privacy-skel-body" />
          </div>
        ))}
      </div>
    </main>
  );
}

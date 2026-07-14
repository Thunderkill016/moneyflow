export default function Loading() {
  return (
    <main
      className="route-loading privacy-route-loading"
      aria-label="Đang tải Cài đặt"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="settings-hub-skeleton">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="settings-hub-skel-row" key={index}>
            <span className="loading-line settings-hub-skel-icon" />
            <span className="loading-line settings-hub-skel-text" />
          </div>
        ))}
      </div>
    </main>
  );
}

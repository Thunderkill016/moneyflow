export default function Loading() {
  return (
    <main className="route-loading inbox-route-loading" aria-label="Đang tải Inbox" aria-busy="true">
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="inbox-skeleton-block">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="inbox-skeleton-row" key={index}>
            <span className="loading-line inbox-skel-date" />
            <span className="loading-line inbox-skel-merchant" />
            <span className="loading-line inbox-skel-money" />
            <span className="loading-line inbox-skel-badge" />
            <span className="loading-line inbox-skel-badge" />
          </div>
        ))}
      </div>
    </main>
  );
}

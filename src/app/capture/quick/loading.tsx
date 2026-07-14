export default function Loading() {
  return (
    <main
      className="route-loading capture-route-loading"
      aria-label="Đang tải Thêm nhanh"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-quick-skeleton">
        <div className="loading-line" />
        <div className="loading-line capture-quick-skel-amount" />
        <div className="loading-line" />
        <div className="loading-line short" />
      </div>
    </main>
  );
}

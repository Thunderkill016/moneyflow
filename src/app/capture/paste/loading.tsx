export default function Loading() {
  return (
    <main
      className="route-loading capture-route-loading"
      aria-label="Đang tải Dán text"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-paste-skeleton">
        <div className="loading-line capture-paste-skel-area" />
        <div className="loading-line" />
        <div className="loading-line short" />
      </div>
    </main>
  );
}

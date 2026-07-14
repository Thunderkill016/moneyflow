export default function Loading() {
  return (
    <main
      className="route-loading import-preview-route-loading"
      aria-label="Đang tải Import Preview"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="import-preview-skeleton">
        <div className="loading-line" />
        <div className="loading-line short" />
        <div className="loading-line import-preview-skel-table" />
      </div>
    </main>
  );
}

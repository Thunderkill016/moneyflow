export default function Loading() {
  return (
    <main
      className="route-loading capture-route-loading"
      aria-label="Đang tải Tải sao kê"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-upload-skeleton">
        <div className="loading-line capture-upload-skel-drop" />
        <div className="loading-line" />
        <div className="loading-line short" />
      </div>
    </main>
  );
}

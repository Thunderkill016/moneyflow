export default function Loading() {
  return (
    <main
      className="route-loading privacy-route-loading"
      aria-label="Đang tải thông báo"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="loading-line" />
      <div className="panel privacy-loading" style={{ marginTop: 16 }}>
        <div className="loading-line wide" />
        <div className="loading-line" />
        <div className="loading-line" />
      </div>
    </main>
  );
}

export default function DashboardLoading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-background px-5 text-foreground"
      aria-busy="true"
      aria-label="Đang tải tổng quan"
    >
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Đang tải sổ thu chi…
      </p>
    </main>
  );
}

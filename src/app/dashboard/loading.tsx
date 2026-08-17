export default function DashboardLoading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-background px-5 text-foreground"
      aria-label="Đang tải tổng quan"
    >
      {/*
       * `role="status"` already implies `aria-live="polite"`, so it carries the
       * announcement on its own. `aria-busy` deliberately does NOT sit on this
       * element or any ancestor: it tells assistive tech to withhold updates from
       * the busy subtree, and this boundary only ever unmounts rather than
       * flipping back to `false`, so an ancestor `aria-busy` could suppress the
       * one message the boundary exists to convey.
       */}
      <p className="text-sm text-muted-foreground" role="status">
        Đang tải sổ thu chi…
      </p>
    </main>
  );
}

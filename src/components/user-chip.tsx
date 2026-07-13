"use client";

import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";

export type ViewerSummary = { email: string | null; displayName: string | null; isDemo: boolean };

export function viewerLabel(viewer: ViewerSummary) {
  return viewer.displayName || (viewer.isDemo ? "Minh Anh" : viewer.email) || "Tài khoản MoneyFlow";
}

export function viewerInitial(viewer: ViewerSummary) {
  return viewerLabel(viewer).slice(0, 1).toLocaleUpperCase("vi");
}

function ChipContent({ viewer }: { viewer: ViewerSummary }) {
  const name = viewerLabel(viewer);
  return (
    <>
      <span className="avatar">{viewerInitial(viewer)}</span>
      <span><strong>{name}</strong><small>{viewer.isDemo ? "Chế độ demo" : viewer.email || "Đăng xuất an toàn"}</small></span>
      <Icon name="arrowRight" />
    </>
  );
}

export function UserChip({ viewer }: { viewer: ViewerSummary }) {
  if (viewer.isDemo) return <div className="profile-chip"><ChipContent viewer={viewer} /></div>;
  return (
    <form action={signOut}>
      <button className="profile-chip profile-chip-button" type="submit" aria-label={`Đăng xuất tài khoản ${viewerLabel(viewer)}`}>
        <ChipContent viewer={viewer} />
      </button>
    </form>
  );
}

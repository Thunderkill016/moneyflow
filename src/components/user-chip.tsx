"use client";

import "@/app/ui-refresh.css";
import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <Icon name="arrowDown" />
    </>
  );
}

export function UserChip({ viewer }: { viewer: ViewerSummary }) {
  if (viewer.isDemo) return <div className="profile-chip"><ChipContent viewer={viewer} /></div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="profile-chip profile-chip-button" type="button" aria-label={`Mở menu tài khoản ${viewerLabel(viewer)}`}>
          <ChipContent viewer={viewer} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="profile-menu">
        <DropdownMenuLabel>
          <span>Tài khoản đang dùng</span>
          <strong>{viewerLabel(viewer)}</strong>
          <small>{viewer.email}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings"><Icon name="settings" />Cài đặt tài khoản</a>
        </DropdownMenuItem>
        <form action={signOut}>
          <DropdownMenuItem asChild className="danger">
            <button type="submit"><Icon name="arrowRight" />Đăng xuất</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

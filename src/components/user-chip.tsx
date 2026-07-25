"use client";

import Link from "next/link";
import { useRef } from "react";
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

export type ViewerSummary = {
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
};

export function viewerLabel(viewer: ViewerSummary) {
  return (
    viewer.displayName ||
    (viewer.isDemo ? "Minh Anh" : viewer.email) ||
    "Tài khoản MoneyFlow"
  );
}

export function viewerInitial(viewer: ViewerSummary) {
  return viewerLabel(viewer).slice(0, 1).toLocaleUpperCase("vi");
}

function ChipContent({ viewer }: { viewer: ViewerSummary }) {
  const name = viewerLabel(viewer);
  return (
    <>
      <span className="avatar">{viewerInitial(viewer)}</span>
      <span className="profile-chip-copy">
        <strong>{name}</strong>
        <small>
          {viewer.isDemo
            ? "Chế độ demo"
            : viewer.email || "Mở menu tài khoản"}
        </small>
      </span>
      <Icon name="arrowDown" />
    </>
  );
}

export function UserChip({ viewer }: { viewer: ViewerSummary }) {
  const logoutFormRef = useRef<HTMLFormElement>(null);

  if (viewer.isDemo) {
    return (
      <div className="profile-chip">
        <ChipContent viewer={viewer} />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="profile-chip profile-chip-button"
          type="button"
          aria-label={`Mở menu tài khoản ${viewerLabel(viewer)}`}
        >
          <ChipContent viewer={viewer} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={12}
        className="profile-menu"
      >
        <DropdownMenuLabel>
          <span>Tài khoản đang dùng</span>
          <strong>{viewerLabel(viewer)}</strong>
          <small>{viewer.email}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Icon name="settings" />
            <span>Cài đặt tài khoản</span>
          </Link>
        </DropdownMenuItem>
        <form
          ref={logoutFormRef}
          action={signOut}
          className="profile-menu-logout-form"
        >
          <DropdownMenuItem
            className="danger"
            onSelect={(event) => {
              event.preventDefault();
              logoutFormRef.current?.requestSubmit();
            }}
          >
            <Icon name="arrowRight" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

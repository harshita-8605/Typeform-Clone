"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/" })}
      className="text-left text-[13px] text-[#6b636c] transition hover:text-[#242424]"
    >
      Sign out
    </button>
  );
}

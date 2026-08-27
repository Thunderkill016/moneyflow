"use client";

import { useEffect, useState } from "react";
import { readConnectionState, type ConnectionState } from "@/lib/connectivity";

/**
 * The browser's connectivity claim, kept current.
 *
 * Starts at `assumed-online` rather than reading `navigator` during render:
 * the server has no navigator, so reading it at render time would produce a
 * different first paint on the client and a hydration mismatch. The real value
 * is read in an effect, which runs only after mount.
 */
export function useConnectionState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>("assumed-online");

  useEffect(() => {
    const sync = () => setState(readConnectionState());
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return state;
}

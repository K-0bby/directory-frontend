import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthProvider } from "@/context/auth-context";
import { BookmarkProvider } from "@/context/bookmark-context";

/**
 * All app-wide context/state providers, composed in one place so the root
 * shell doesn't accumulate a deepening nest of wrappers as new ones are
 * added. Order matters: NuqsAdapter has no dependency on auth/bookmark
 * state, but keeping it outermost means URL-state hooks are available to
 * every provider below it too, should one ever need them.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <AuthProvider>
        <BookmarkProvider>{children}</BookmarkProvider>
      </AuthProvider>
    </NuqsAdapter>
  );
}

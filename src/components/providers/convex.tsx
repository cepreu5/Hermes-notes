import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCallback } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convex = new ConvexReactClient(convexUrl);

function useAuthFromHercules() {
  const { user, isLoading } = useAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // @ts-expect-error - access id_token from oidc user object
      const token = user?.id_token as string | undefined;
      if (forceRefreshToken) return token ?? null;
      return token ?? null;
    },
    [user]
  );

  return {
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken,
  };
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromHercules}>
      {children}
    </ConvexProviderWithAuth>
  );
}

import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import { useCallback } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convex = new ConvexReactClient(convexUrl);

function useAuthFromOidc() {
  const auth = useOidcAuth();

  const fetchAccessToken = useCallback(
    async (_opts: { forceRefreshToken: boolean }) => {
      return auth.user?.id_token ?? null;
    },
    [auth.user]
  );

  return {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    fetchAccessToken,
  };
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromOidc}>
      {children}
    </ConvexProviderWithAuth>
  );
}

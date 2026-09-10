import { useAuth as useOidcAuth } from "react-oidc-context";
import type { UserProfile } from "@usehercules/auth";

export function useAuth() {
  const auth = useOidcAuth();

  return {
    user: auth.user
      ? {
          profile: auth.user.profile as unknown as UserProfile,
        }
      : null,
    isLoading: auth.isLoading,
    error: auth.error,
    signinRedirect: () => auth.signinRedirect(),
    signout: () => auth.removeUser(),
  };
}

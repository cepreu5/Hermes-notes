import { AuthProvider as OidcAuthProvider } from "react-oidc-context";

const authority = import.meta.env.VITE_HERCULES_OIDC_AUTHORITY as string;
const clientId = import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID as string;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <OidcAuthProvider
      authority={authority}
      client_id={clientId}
      redirect_uri={`${window.location.origin}/auth/callback`}
      onSigninCallback={() => {
        // Remove OIDC params from URL after successful signin
        window.history.replaceState({}, document.title, "/auth/callback");
      }}
    >
      {children}
    </OidcAuthProvider>
  );
}

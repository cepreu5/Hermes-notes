import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";

// Check if we arrived here from an OIDC redirect (has code + state params)
function hasOidcParams() {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") && params.has("state");
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const synced = useRef(false);
  // Remember if we had OIDC params on mount — if not, redirect immediately
  const hadOidcParams = useRef(hasOidcParams());

  // No OIDC params means direct visit — go home
  useEffect(() => {
    if (!hadOidcParams.current) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Once Convex confirms auth, sync user to DB and redirect home
  useEffect(() => {
    if (isConvexAuthenticated && !synced.current) {
      synced.current = true;
      updateCurrentUser()
        .finally(() => navigate("/", { replace: true }));
    }
  }, [isConvexAuthenticated, updateCurrentUser, navigate]);

  if (auth.error) {
    return (
      <div className="flex flex-col items-center justify-center h-svh gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-destructive font-medium">Authentication failed</p>
          <p className="text-sm text-muted-foreground max-w-md">{auth.error.message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate("/", { replace: true })}>
            Return home
          </Button>
          <Button onClick={() => auth.signinRedirect()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Signing in...</p>
    </div>
  );
}

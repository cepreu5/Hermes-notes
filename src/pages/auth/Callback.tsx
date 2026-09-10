import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const synced = useRef(false);

  useEffect(() => {
    // Wait for react-oidc-context to finish processing the callback
    if (auth.isLoading) return;

    // If auth failed with no error and not authenticated, go home
    if (!auth.isAuthenticated && !auth.error) {
      navigate("/", { replace: true });
      return;
    }

    // Authenticated in OIDC — now wait for Convex (handled below)
  }, [auth.isLoading, auth.isAuthenticated, auth.error, navigate]);

  // Once Convex confirms auth, sync user to DB and go home
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

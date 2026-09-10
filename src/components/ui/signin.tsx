import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "./button.tsx";
import { cn } from "@/lib/utils.ts";

interface SignInButtonProps {
  className?: string;
}

export function SignInButton({ className }: SignInButtonProps) {
  const { signinRedirect } = useAuth();
  return (
    <Button
      onClick={() => signinRedirect()}
      className={cn("cursor-pointer", className)}
    >
      Sign In
    </Button>
  );
}

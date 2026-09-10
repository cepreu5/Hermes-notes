import * as React from "react";
import { cn } from "@/lib/utils.ts";

// Simple tooltip provider and components without external dependency
const TooltipContext = React.createContext<null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipContext.Provider value={null}>{children}</TooltipContext.Provider>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild: _asChild, ...props }: React.HTMLAttributes<HTMLSpanElement> & { asChild?: boolean }) {
  return <span {...props}>{children}</span>;
}

export function TooltipContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "z-50 hidden rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

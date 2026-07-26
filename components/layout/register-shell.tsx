import { ExecutiveAccessShell } from "@/components/layout/executive-access-shell";

interface RegisterShellProps {
  children: React.ReactNode;
}

export function RegisterShell({ children }: RegisterShellProps) {
  return <ExecutiveAccessShell variant="register">{children}</ExecutiveAccessShell>;
}

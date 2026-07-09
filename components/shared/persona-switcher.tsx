"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDemoPersona } from "@/context/demo-persona-context";
import type { DemoPersona } from "@/lib/types";
import { User } from "lucide-react";

const PERSONAS: { value: DemoPersona; label: string }[] = [
  { value: "public", label: "Public Visitor" },
  { value: "registered", label: "Registered Investor" },
  { value: "qualified", label: "Qualified Investor" },
  { value: "government", label: "Ministry / Gov (Demo)" },
  { value: "admin", label: "ZIDA Admin (Demo)" },
  { value: "super_admin", label: "Afronovation Super Admin" },
];

export function PersonaSwitcher() {
  const { persona, setPersona } = useDemoPersona();
  const current = PERSONAS.find((p) => p.value === persona);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs max-w-[160px] truncate text-white/80 hover:text-white hover:bg-white/10"
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate hidden sm:inline">{current?.label ?? "Persona"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Demo Persona</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERSONAS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => setPersona(p.value)}
            className={persona === p.value ? "bg-zim-off-white font-medium" : ""}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

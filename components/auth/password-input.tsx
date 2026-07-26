"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  executiveFieldClassName,
  executiveFieldStyle,
} from "@/components/auth/executive-field-styles";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  showLabel: string;
  hideLabel: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  required = true,
  autoComplete = "current-password",
  showLabel,
  hideLabel,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${executiveFieldClassName} pr-10`}
        style={executiveFieldStyle(!!value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
        aria-label={visible ? hideLabel : showLabel}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

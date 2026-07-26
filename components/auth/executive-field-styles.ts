export const EXECUTIVE_FIELD_FILLED_BG = "#FFD300";
export const EXECUTIVE_FIELD_EMPTY_BG = "rgba(255,255,255,0.03)";
export const EXECUTIVE_FIELD_BORDER = "1px solid rgba(255,255,255,0.1)";

export function executiveFieldStyle(hasValue: boolean) {
  return {
    backgroundColor: hasValue ? EXECUTIVE_FIELD_FILLED_BG : EXECUTIVE_FIELD_EMPTY_BG,
    color: hasValue ? "#000" : "var(--color-text-primary)",
    border: EXECUTIVE_FIELD_BORDER,
  };
}

export const executiveFieldClassName =
  "w-full px-3 py-2.5 rounded text-sm transition-colors outline-none focus:bg-[#FFD300] focus:text-black";

export const executiveLabelClassName =
  "block text-[10px] font-mono tracking-widest uppercase mb-1";

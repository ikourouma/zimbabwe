interface SectionHeaderProps {
  overline?: string;
  heading: string;
  lead?: string;
  align?: "left" | "center";
  headingAs?: "h1" | "h2" | "h3";
  accentLine?: boolean;
  dark?: boolean;
}

export function SectionHeader({
  overline,
  heading,
  lead,
  align = "left",
  headingAs: Heading = "h2",
  accentLine = true,
  dark = true,
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {accentLine && <span className="gold-accent-line" aria-hidden="true" />}
      {overline && <p className="section-overline">{overline}</p>}
      <Heading
        className={dark ? "text-3xl md:text-4xl font-bold text-white" : "text-3xl md:text-4xl font-bold text-zim-charcoal"}
        style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
      >
        {heading}
      </Heading>
      {lead && (
        <p
          className={dark ? "text-base max-w-2xl" : "text-base text-zim-muted max-w-2xl"}
          style={dark ? { color: "var(--color-text-secondary)" } : undefined}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

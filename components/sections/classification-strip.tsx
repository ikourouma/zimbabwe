import { classificationStrip } from "@/content/zimbabwe-site";

export function ClassificationStrip() {
  return (
    <div style={{ backgroundColor: "var(--color-sovereign-panel)", borderBottom: "1px solid var(--color-sovereign-border)" }}>
      <div className="page-container">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
          {classificationStrip.map((item) => (
            <div key={item.label} className="py-4 px-4 first:pl-0">
              <p className="text-[0.6rem] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

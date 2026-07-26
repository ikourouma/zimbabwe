"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "@/context/locale-context";

export function GatewayStrategicDirectory() {
  const t = useTranslations();
  const matrixNodes = t.matrixNodes;
  return (
    <section className="relative py-24 z-20" style={{ backgroundColor: "#050805" }}>
      <div className="page-container">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: "var(--color-gold)" }} />
            <p className="section-overline m-0">{t.home.strategicDirectory.overline}</p>
          </div>
          <h2 className="text-3xl font-light text-white" style={{ letterSpacing: "var(--type-heading-tracking)" }}>
            {t.home.strategicDirectory.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matrixNodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link href={node.href} className="group block h-full">
                <div
                  className="h-full p-8 rounded-xl border transition-all duration-300 flex flex-col relative overflow-hidden hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "isSpecial" in node && node.isSpecial ? "rgba(255, 211, 0, 0.05)" : "rgba(255,255,255,0.02)",
                    borderColor: "isSpecial" in node && node.isSpecial ? "var(--color-gold)" : "var(--color-sovereign-border)",
                  }}
                >
                  <div className="mb-auto">
                    <h3
                      className="text-xl font-medium mb-3 text-white group-hover:text-[var(--color-gold)] transition-colors"
                      style={{ letterSpacing: "var(--type-heading-tracking)" }}
                    >
                      {node.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {node.desc}
                    </p>
                  </div>
                  <div
                    className="mt-8 pt-6 flex items-end gap-3"
                    style={{ borderTop: `1px solid ${"isSpecial" in node && node.isSpecial ? "rgba(255,211,0,0.2)" : "rgba(255,255,255,0.05)"}` }}
                  >
                    <span
                      className="text-3xl font-light font-mono leading-none"
                      style={{ color: "isSpecial" in node && node.isSpecial ? "var(--color-gold)" : "var(--color-zim-accent-pale)" }}
                    >
                      {node.metric}
                    </span>
                    <span
                      className="text-xs uppercase tracking-widest font-semibold pb-1"
                      style={{ color: "isSpecial" in node && node.isSpecial ? "rgba(255,211,0,0.8)" : "var(--color-text-muted)" }}
                    >
                      {node.metricLabel}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

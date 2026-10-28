"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  highlight?: boolean;
  icon?: ReactNode;
}

export function StatCard({ label, value, prefix, suffix, format, highlight, icon }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setDisplayed(Math.min(value, Math.round(increment * step)));
      if (step >= steps) {
        setDisplayed(value);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  const formatted = format ? format(displayed) : displayed.toLocaleString("pt-BR");

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`min-w-0 rounded-2xl border p-4 md:p-6 transition-colors ${
        highlight
          ? "border-late/40 bg-late-soft hover:border-late"
          : "border-line bg-card hover:border-line"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className={highlight ? "text-late-ink" : "text-muted"}>
            {icon}
          </span>
        )}
        <p className={`text-xs font-medium uppercase tracking-wider ${
          highlight ? "text-late-ink" : "text-muted"
        }`}>
          {label}
        </p>
      </div>
      <p className={`text-[1.4rem] leading-tight sm:text-3xl md:text-4xl font-bold tracking-tight tabular-nums ${
        highlight ? "text-late-ink" : "text-ink"
      }`}>
        {prefix}{formatted}{suffix}
      </p>
    </motion.div>
  );
}

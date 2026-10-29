"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button, ButtonProps } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

const numberFormat = new Intl.NumberFormat("ru-RU");
const compactFormat = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const fmt = (v: number | null | undefined) =>
  numberFormat.format(v ?? 0);
export const fmtCompact = (v: number) =>
  Math.abs(v) < 10_000 ? fmt(v) : compactFormat.format(v);
const percentFormat = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 1,
});
export const fmtPercent = (v: number | null | undefined) =>
  v == null ? "—" : percentFormat.format(v);

export function fmtDate(v: unknown, withTime = true) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("flex overflow-hidden rounded-md border", className)}
      role="radiogroup"
    >
      {options.map((opt) => (
        <Button
          key={String(opt.value)}
          type="button"
          variant="ghost"
          size="sm"
          role="radio"
          aria-checked={value === opt.value}
          disabled={disabled}
          onClick={() => value !== opt.value && onChange(opt.value)}
          className={cn(
            "flex-1 rounded-none",
            value === opt.value &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function Tag({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "good" | "warn" | "bad" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    muted: "border-border text-muted-foreground",
    good: "border-green-500/30 bg-green-500/10 text-green-400",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    bad: "border-red-500/30 bg-red-500/10 text-red-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-10", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** A button that asks first. For anything that is hard to take back. */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Подтвердить",
  onConfirm,
  pending,
  children,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        {...props}
        disabled={props.disabled || pending}
        onClick={() => setOpen(true)}
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              variant={
                props.variant === "destructive" ? "destructive" : "default"
              }
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const textareaClass =
  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

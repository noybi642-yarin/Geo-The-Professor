"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { copyText, formatTyped } from "@/lib/finance";

// ─── Toast ─────────────────────────────────────────────────────

export const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

// ─── שמירת מצב ב-localStorage (שמירת החישוב האחרון) ────────────

export function usePersistentState<T extends object>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setState((prev) => ({ ...prev, ...JSON.parse(s) }));
    } catch {}
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

// ─── שדה קלט מספרי ─────────────────────────────────────────────

export type Unit = "amount" | "percent";

export function NumField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  hint,
  unit,
  onUnitChange,
  chips,
  chipSuffix = "",
  onChip,
  activeChip,
  allowNegative,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  unit?: Unit;
  onUnitChange?: (u: Unit) => void;
  chips?: number[];
  chipSuffix?: string;
  onChip?: (v: number) => void;
  activeChip?: number;
  allowNegative?: boolean;
}) {
  return (
    <div className="field">
      <div className="field-head">
        <label className="field-label">{label}</label>
        {unit && onUnitChange && (
          <div className="unit-toggle" role="group" aria-label="יחידה">
            <button
              type="button"
              className={unit === "amount" ? "on" : ""}
              onClick={() => onUnitChange("amount")}
            >
              ₪
            </button>
            <button
              type="button"
              className={unit === "percent" ? "on" : ""}
              onClick={() => onUnitChange("percent")}
            >
              %
            </button>
          </div>
        )}
      </div>
      <div className="field-box">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder ?? "0"}
          onChange={(e) => onChange(formatTyped(e.target.value, allowNegative))}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {chips && chips.length > 0 && (
        <div className="chips">
          {chips.map((c) => (
            <button
              type="button"
              key={c}
              className={`chip${activeChip === c ? " on" : ""}`}
              onClick={() => onChip?.(c)}
            >
              {c}
              {chipSuffix}
            </button>
          ))}
        </div>
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// ─── שורת תוצאה עם העתקה בלחיצה ────────────────────────────────

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function ResultRow({
  label,
  value,
  sub,
  strong,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  strong?: boolean;
  good?: boolean;
}) {
  const notify = useToast();
  return (
    <div className={`result-row${strong ? " strong" : ""}${good ? " good" : ""}`}>
      <span className="result-label">{label}</span>
      <span className="result-value">
        <span>{value}</span>
        {sub && <small>{sub}</small>}
        <button
          type="button"
          className="copy-btn"
          aria-label={`העתקת ${label}`}
          onClick={async () => {
            if (await copyText(value)) notify("הועתק ✓");
          }}
        >
          <CopyIcon />
        </button>
      </span>
    </div>
  );
}

// ─── כרטיס תוצאה ראשית (Hero) ─────────────────────────────────

export function ResultHero({
  label,
  value,
  sub,
  flash,
}: {
  label: string;
  value: string;
  sub?: string;
  flash?: number;
}) {
  const notify = useToast();
  return (
    <button
      type="button"
      key={flash}
      className="result-hero"
      onClick={async () => {
        if (value !== "—" && (await copyText(value))) notify("הועתק ✓");
      }}
      title="לחיצה מעתיקה"
    >
      <span className="hero-label">{label}</span>
      <span className="hero-value" dir="auto">
        {value}
      </span>
      {sub && <span className="hero-sub">{sub}</span>}
    </button>
  );
}

// ─── סרגל פעולות: חשב / העתק ללקוח / נקה ──────────────────────

export function ActionBar({
  onCalc,
  onCopy,
  onClear,
  children,
}: {
  onCalc: () => void;
  onCopy: () => void;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="actions">
      <button type="button" className="btn btn-primary" onClick={onCalc}>
        🧮 חשב
      </button>
      <button type="button" className="btn btn-success" onClick={onCopy}>
        📋 העתק ללקוח
      </button>
      {children}
      <button type="button" className="btn btn-ghost" onClick={onClear}>
        ✨ נקה
      </button>
    </div>
  );
}

// ─── חלון קופץ ─────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" aria-label="סגירה" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  parseNum,
  toInput,
  formatTyped,
  type Settings,
} from "@/lib/finance";
import { Modal, ToastContext } from "./shared";
import LoanCalc from "./LoanCalc";
import { BalloonCalc, DownCalc, FinPctCalc, InterestCalc } from "./SimpleCalcs";

type CalcId = "loan" | "interest" | "finpct" | "down" | "balloon";

const CALCS: { id: CalcId; icon: string; title: string; desc: string }[] = [
  { id: "loan", icon: "🚗", title: "החזר חודשי", desc: "חישוב מלא של עסקת מימון — כולל בלון ולוח סילוקין" },
  { id: "interest", icon: "💰", title: "מחשבון ריבית", desc: "כמה ריבית וכמה קרן ישולמו בהלוואה" },
  { id: "finpct", icon: "📈", title: "אחוז מימון", desc: "אחוז המימון לפי מחיר הרכב והמקדמה" },
  { id: "down", icon: "💵", title: "מחשבון מקדמה", desc: "כמה מקדמה צריך לפי אחוז המימון" },
  { id: "balloon", icon: "📊", title: "מחשבון בלון", desc: "סכום הבלון וההלוואה לאחר המקדמה" },
];

const SETTINGS_KEY = "sn.settings.v1";

export default function CalcApp() {
  const [screen, setScreen] = useState<CalcId | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsLoaded = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
    } catch {}
    settingsLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!settingsLoaded.current) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const notify = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const accent = ACCENTS[settings.accent] ?? ACCENTS.blue;
  const accentVars = {
    "--accent": accent.accent,
    "--accent-dark": accent.dark,
    "--accent-soft": accent.soft,
    "--accent-ring": accent.ring,
  } as CSSProperties;

  const active = CALCS.find((c) => c.id === screen);

  return (
    <ToastContext.Provider value={notify}>
      <div className="sn-app" style={accentVars}>
        <header className="sn-header">
          <div className="sn-header-inner">
            <div className="sn-header-row">
              {active ? (
                <button type="button" className="head-btn" onClick={() => setScreen(null)} aria-label="חזרה">
                  → חזרה
                </button>
              ) : (
                <span className="head-hello">היי נוי 👋</span>
              )}
              <button
                type="button"
                className="head-btn"
                onClick={() => setShowSettings(true)}
                aria-label="הגדרות"
              >
                ⚙️
              </button>
            </div>
            <h1 className="sn-title">
              {active ? `${active.icon} ${active.title}` : "שלום נוי"}
            </h1>
            <p className="sn-subtitle">{active ? active.desc : "בואי נחשב יחד 💙"}</p>
          </div>
        </header>

        <main className="sn-container">
          {!active && (
            <div className="sn-grid" key="home">
              {CALCS.map((c, idx) => (
                <button
                  type="button"
                  key={c.id}
                  className="sn-tile"
                  style={{ animationDelay: `${idx * 45}ms` }}
                  onClick={() => setScreen(c.id)}
                >
                  <span className="tile-icon">{c.icon}</span>
                  <span className="tile-title">{c.title}</span>
                  <span className="tile-desc">{c.desc}</span>
                </button>
              ))}
              <button
                type="button"
                className="sn-tile tile-settings"
                style={{ animationDelay: `${CALCS.length * 45}ms` }}
                onClick={() => setShowSettings(true)}
              >
                <span className="tile-icon">⚙️</span>
                <span className="tile-title">הגדרות</span>
                <span className="tile-desc">עמלת הקמה, ריבית, צבעים ואחוזי מימון</span>
              </button>
            </div>
          )}

          {screen === "loan" && <LoanCalc settings={settings} />}
          {screen === "interest" && <InterestCalc settings={settings} />}
          {screen === "finpct" && <FinPctCalc />}
          {screen === "down" && <DownCalc settings={settings} />}
          {screen === "balloon" && <BalloonCalc />}
        </main>

        <footer className="sn-footer">נבנה באהבה עבור נוי 💙</footer>

        {showSettings && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
            notify={notify}
          />
        )}

        {toast && (
          <div className="toast" key={toast.key} role="status">
            {toast.msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

// ─── ⚙️ הגדרות ─────────────────────────────────────────────────

function SettingsModal({
  settings,
  onChange,
  onClose,
  notify,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}) {
  const [fee, setFee] = useState(toInput(settings.fee));
  const [rate, setRate] = useState(toInput(settings.defaultRate));
  const [pcts, setPcts] = useState(settings.commonPcts.join(", "));

  const commit = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const parsePcts = (s: string) =>
    Array.from(
      new Set(
        s
          .split(/[,\s]+/)
          .map((x) => parseNum(x))
          .filter((n) => n > 0 && n <= 100)
      )
    ).sort((a, b) => a - b);

  return (
    <Modal title="⚙️ הגדרות" onClose={onClose}>
      <div className="settings">
        <div className="field">
          <label className="field-label">עמלת הקמה (ברירת מחדל)</label>
          <div className="field-box">
            <input
              type="text"
              inputMode="decimal"
              value={fee}
              onChange={(e) => {
                const v = formatTyped(e.target.value);
                setFee(v);
                commit({ fee: parseNum(v) });
              }}
            />
            <span className="field-suffix">₪</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label">ריבית שנתית (ברירת מחדל)</label>
          <div className="field-box">
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(e) => {
                const v = formatTyped(e.target.value);
                setRate(v);
                commit({ defaultRate: parseNum(v) });
              }}
            />
            <span className="field-suffix">%</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label">שיטת חישוב ריבית חודשית</label>
          <div className="seg">
            <button
              type="button"
              className={settings.rateMethod === "nominal" ? "on" : ""}
              onClick={() => commit({ rateMethod: "nominal" })}
            >
              נומינלית (שנתי ÷ 12)
            </button>
            <button
              type="button"
              className={settings.rateMethod === "effective" ? "on" : ""}
              onClick={() => commit({ rateMethod: "effective" })}
            >
              אפקטיבית (ריבית דריבית)
            </button>
          </div>
          <div className="field-hint">רוב חברות המימון בישראל מחשבות בשיטה הנומינלית</div>
        </div>

        <div className="field">
          <label className="field-label">צבעי המערכת</label>
          <div className="swatches">
            {Object.entries(ACCENTS).map(([id, a]) => (
              <button
                type="button"
                key={id}
                className={`swatch${settings.accent === id ? " on" : ""}`}
                style={{ background: `linear-gradient(135deg, ${a.dark}, ${a.accent})` }}
                title={a.name}
                aria-label={a.name}
                onClick={() => commit({ accent: id })}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">אחוזי מימון נפוצים</label>
          <div className="field-box">
            <input
              type="text"
              inputMode="decimal"
              value={pcts}
              placeholder="50, 60, 70, 80, 90, 100"
              onChange={(e) => {
                setPcts(e.target.value);
                const list = parsePcts(e.target.value);
                if (list.length) commit({ commonPcts: list });
              }}
            />
          </div>
          <div className="field-hint">מופרדים בפסיקים — יופיעו כקיצורי דרך במחשבונים</div>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            onChange({ ...DEFAULT_SETTINGS });
            setFee(toInput(DEFAULT_SETTINGS.fee));
            setRate(toInput(DEFAULT_SETTINGS.defaultRate));
            setPcts(DEFAULT_SETTINGS.commonPcts.join(", "));
            notify("ההגדרות אופסו ✨");
          }}
        >
          שחזור ברירות מחדל
        </button>
      </div>
    </Modal>
  );
}

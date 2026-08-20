"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  PRODUCT_INFO,
  parseNum,
  toInput,
  formatTyped,
  type ProductType,
  type Settings,
} from "@/lib/finance";
import AppShell from "@/components/shell/AppShell";
import {
  DATA_ROUTES,
  KNOWLEDGE_SCREEN,
  PRIMARY_CALCS,
  QUICK_CALCS,
  TOOL_SCREENS,
  getScreen,
  sectionLabelFor,
  type ScreenId,
  type ScreenMeta,
} from "@/components/shell/screens";
import { ICON_MD, ICON_SM, ICON_STROKE, IconSettings } from "@/components/ui/icons";
import Link from "next/link";
import { Modal, PageHead, ToastContext } from "./shared";
import LoanCalc from "./LoanCalc";
import BalloonSpreadCalc from "./BalloonSpreadCalc";
import IndexCalc from "./IndexCalc";
import KnowledgeCenter from "./KnowledgeCenter";
import LiveDataCard from "./LiveDataCard";
import SetupFeeCalc from "./SetupFeeCalc";
import SubsidyCalc from "./SubsidyCalc";
import TracksInfo from "./TracksInfo";
import { BalloonCalc, DownCalc, FinPctCalc, InterestCalc } from "./SimpleCalcs";

const SETTINGS_KEY = "sn.settings.v1";

/** אריח ניווט אל מסך קיים */
function ScreenTile({ meta, onOpen }: { meta: ScreenMeta; onOpen: () => void }) {
  const Icon = meta.icon;
  return (
    <button type="button" className="sn-tile" onClick={onOpen}>
      <span className="tile-icon" aria-hidden>
        <Icon size={ICON_MD} strokeWidth={ICON_STROKE} />
      </span>
      <span className="tile-body">
        <span className="tile-title">{meta.title}</span>
        <span className="tile-desc">{meta.desc}</span>
      </span>
    </button>
  );
}

/** אריח ניווט אל נתיב אמיתי */
function RouteTile({ href, icon: Icon, title, desc }: (typeof DATA_ROUTES)[number]) {
  return (
    <Link href={href} className="sn-tile">
      <span className="tile-icon" aria-hidden>
        <Icon size={ICON_MD} strokeWidth={ICON_STROKE} />
      </span>
      <span className="tile-body">
        <span className="tile-title">{title}</span>
        <span className="tile-desc">{desc}</span>
      </span>
    </Link>
  );
}

export default function CalcApp() {
  const [screen, setScreen] = useState<ScreenId>("home");
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

  // מעבר ישיר למסך מתוך סרגל הצד של עמוד אחר (?calc=...).
  // נקרא מה-URL ולא דרך useSearchParams, כדי שהעמוד יישאר סטטי.
  useEffect(() => {
    try {
      const want = new URLSearchParams(window.location.search).get("calc");
      if (want && getScreen(want as ScreenId).id === want) setScreen(want as ScreenId);
    } catch {}
  }, []);

  useEffect(() => {
    if (!settingsLoaded.current) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // מעבר בין מסכים מחזיר לראש העמוד — אחרת נוחתים באמצע תוכן
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const notify = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const accent = ACCENTS[settings.accent] ?? ACCENTS.forest;
  const accentVars = {
    "--accent": accent.accent,
    "--accent-dark": accent.dark,
    "--accent-soft": accent.soft,
    "--accent-ring": accent.ring,
  } as CSSProperties;

  const meta = getScreen(screen);
  const isIndex = screen === "home" || screen === "calculators" || screen === "tools";

  return (
    <ToastContext.Provider value={notify}>
      <div className="sn-app" style={accentVars}>
        <AppShell
          activeScreen={screen}
          onNavigate={setScreen}
          onOpenSettings={() => setShowSettings(true)}
          title={sectionLabelFor(screen)}
          actions={
            <button
              type="button"
              className="head-btn"
              onClick={() => setShowSettings(true)}
            >
              <IconSettings size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
              הגדרות
            </button>
          }
        >
          {!isIndex && <PageHead icon={meta.icon} title={meta.title} sub={meta.desc} />}

          {screen === "home" && (
            <div className="calc-screen">
              <PageHead
                title="שלום נוי — בואי נחשב יחד"
                sub="נתוני שוק עדכניים, מחשבוני מימון וספריית הידע המקצועית"
              />
              <LiveDataCard />

              <div>
                <h2 className="section-head">מחשבונים מרכזיים</h2>
                <div className="sn-grid">
                  {PRIMARY_CALCS.map((c) => (
                    <ScreenTile key={c.id} meta={c} onOpen={() => setScreen(c.id)} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="section-head">ידע מקצועי</h2>
                <div className="sn-grid grid-fit">
                  <ScreenTile
                    meta={KNOWLEDGE_SCREEN}
                    onOpen={() => setScreen(KNOWLEDGE_SCREEN.id)}
                  />
                  {TOOL_SCREENS.map((t) => (
                    <ScreenTile key={t.id} meta={t} onOpen={() => setScreen(t.id)} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="section-head">מחשבונים מהירים</h2>
                <div className="sn-grid grid-compact">
                  {QUICK_CALCS.map((c) => (
                    <ScreenTile key={c.id} meta={c} onOpen={() => setScreen(c.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {screen === "calculators" && (
            <div className="calc-screen">
              <PageHead
                icon={meta.icon}
                title="מחשבונים"
                sub="כל מחשבוני המימון במקום אחד"
              />
              <div>
                <h2 className="section-head">מחשבונים מרכזיים</h2>
                <div className="sn-grid">
                  {PRIMARY_CALCS.map((c) => (
                    <ScreenTile key={c.id} meta={c} onOpen={() => setScreen(c.id)} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="section-head">מחשבונים מהירים</h2>
                <div className="sn-grid grid-compact">
                  {QUICK_CALCS.map((c) => (
                    <ScreenTile key={c.id} meta={c} onOpen={() => setScreen(c.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {screen === "tools" && (
            <div className="calc-screen">
              <PageHead
                icon={meta.icon}
                title="כלים ל-BDM"
                sub="מסלולי מימון, היסטוריית נתונים רשמיים והגדרות החישוב"
              />
              <div>
                <h2 className="section-head">מידע מקצועי</h2>
                <div className="sn-grid grid-fit">
                  <ScreenTile
                    meta={KNOWLEDGE_SCREEN}
                    onOpen={() => setScreen(KNOWLEDGE_SCREEN.id)}
                  />
                  {TOOL_SCREENS.map((t) => (
                    <ScreenTile key={t.id} meta={t} onOpen={() => setScreen(t.id)} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="section-head">נתונים רשמיים</h2>
                <div className="sn-grid grid-fit">
                  {DATA_ROUTES.map((r) => (
                    <RouteTile key={r.href} {...r} />
                  ))}
                </div>
              </div>
              <div>
                <h2 className="section-head">הגדרות</h2>
                <div className="sn-grid grid-fit">
                  <button
                    type="button"
                    className="sn-tile"
                    onClick={() => setShowSettings(true)}
                  >
                    <span className="tile-icon" aria-hidden>
                      <IconSettings size={ICON_MD} strokeWidth={ICON_STROKE} />
                    </span>
                    <span className="tile-body">
                      <span className="tile-title">הגדרות החישוב</span>
                      <span className="tile-desc">
                        עמלת הקמה, ריבית ברירת מחדל, פריים, מדד ואחוזי מימון
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {screen === "loan" && <LoanCalc settings={settings} />}
          {screen === "subsidy" && <SubsidyCalc settings={settings} />}
          {screen === "index" && <IndexCalc />}
          {screen === "spread" && <BalloonSpreadCalc settings={settings} />}
          {screen === "tracks" && <TracksInfo />}
          {screen === "knowledge" && <KnowledgeCenter />}
          {screen === "interest" && <InterestCalc settings={settings} />}
          {screen === "finpct" && <FinPctCalc />}
          {screen === "down" && <DownCalc settings={settings} />}
          {screen === "balloon" && <BalloonCalc />}
          {screen === "setupfee" && <SetupFeeCalc />}
        </AppShell>

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

// ─── הגדרות ────────────────────────────────────────────────────

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
  const [primeBase, setPrimeBase] = useState(toInput(settings.primeBase));
  const [primeMargin, setPrimeMargin] = useState(toInput(settings.primeMargin));
  const [cpi, setCpi] = useState(toInput(settings.defaultCpi));
  const [spreadRate, setSpreadRate] = useState(toInput(settings.spreadRate));

  const commit = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const numField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    key: keyof Settings,
    suffix: string,
    opts?: { allowNegative?: boolean; hint?: string }
  ) => (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="field-box">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = formatTyped(e.target.value, opts?.allowNegative);
            setValue(v);
            commit({ [key]: parseNum(v) } as Partial<Settings>);
          }}
        />
        <span className="field-suffix">{suffix}</span>
      </div>
      {opts?.hint && <div className="field-hint">{opts.hint}</div>}
    </div>
  );

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
    <Modal title="הגדרות" icon={IconSettings} onClose={onClose}>
      <div className="settings">
        {numField("עמלת הקמה (ברירת מחדל)", fee, setFee, "fee", "₪")}
        {numField("ריבית שנתית (ברירת מחדל)", rate, setRate, "defaultRate", "%")}

        <div className="field">
          <label className="field-label">מוצר מימון ברירת מחדל</label>
          <div className="seg seg-3">
            {(Object.keys(PRODUCT_INFO) as ProductType[]).map((p) => (
              <button
                key={p}
                type="button"
                className={settings.defaultProduct === p ? "on" : ""}
                onClick={() => commit({ defaultProduct: p })}
              >
                {PRODUCT_INFO[p].label}
              </button>
            ))}
          </div>
          <div className="field-hint">
            שיטת הסילוקין נגזרת מהמוצר: פריים — קרן שווה; קבועה וצמודת מדד — שפיצר
          </div>
        </div>

        {numField("ריבית הפריים הבסיסית", primeBase, setPrimeBase, "primeBase", "%")}
        {numField("מרווח מהפריים", primeMargin, setPrimeMargin, "primeMargin", "%", {
          allowNegative: true,
          hint: `הריבית במוצר פריים = פריים בסיסי + מרווח (לדוגמה: פריים מינוס 0.5% = ‎-0.5). כרגע: ${toInput(settings.primeBase) || "0"}% + ${toInput(settings.primeMargin) || "0"}%`,
        })}
        {numField("הנחת מדד שנתית (ברירת מחדל)", cpi, setCpi, "defaultCpi", "%", {
          hint: "משמשת את התחזית במוצר צמוד מדד",
        })}
        {numField("ריבית ברירת מחדל לפריסת בלון", spreadRate, setSpreadRate, "spreadRate", "%")}

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
          <label className="field-label">גוון הממשק</label>
          <div className="swatches">
            {Object.entries(ACCENTS).map(([id, a]) => (
              <button
                type="button"
                key={id}
                className={`swatch${settings.accent === id ? " on" : ""}`}
                style={{ background: a.accent }}
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
            setPrimeBase(toInput(DEFAULT_SETTINGS.primeBase));
            setPrimeMargin(toInput(DEFAULT_SETTINGS.primeMargin));
            setCpi(toInput(DEFAULT_SETTINGS.defaultCpi));
            setSpreadRate(toInput(DEFAULT_SETTINGS.spreadRate));
            notify("ההגדרות אופסו");
          }}
        >
          שחזור ברירות מחדל
        </button>
      </div>
    </Modal>
  );
}

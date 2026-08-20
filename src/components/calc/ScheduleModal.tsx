"use client";

import { useEffect } from "react";
import {
  copyText,
  fmtMoney,
  round2,
  scheduleColumns,
  scheduleToCsv,
  type ScheduleRow,
} from "@/lib/finance";
import { Modal, useToast } from "./shared";
import { ICON_SM, ICON_STROKE, IconBalloon, IconCopyToClient, IconPrint, IconSchedule } from "@/components/ui/icons";

/**
 * לוח סילוקין משותף לכל המחשבונים: טבלה עם שורת סיכום,
 * הדפסה, הורדת CSV והעתקת סיכום — מותאם גם למובייל.
 */
export default function ScheduleModal({
  meta,
  schedule,
  withIndexation,
  summaryText,
  note,
  onClose,
}: {
  meta: { label: string; value: string }[];
  schedule: ScheduleRow[];
  withIndexation?: boolean;
  summaryText: string;
  note?: string;
  onClose: () => void;
}) {
  const notify = useToast();
  const cols = scheduleColumns(!!withIndexation);

  // מצב הדפסה: מסתיר את שאר העמוד ומדפיס את הלוח בלבד
  useEffect(() => {
    document.documentElement.classList.add("print-schedule");
    return () => document.documentElement.classList.remove("print-schedule");
  }, []);

  const totals = schedule.reduce(
    (t, r) => ({
      payment: t.payment + r.payment,
      principal: t.principal + r.principal,
      interest: t.interest + r.interest,
      indexation: t.indexation + (r.indexation ?? 0),
    }),
    { payment: 0, principal: 0, interest: 0, indexation: 0 }
  );

  const downloadCsv = () => {
    const csv = scheduleToCsv(schedule, !!withIndexation);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // שם לטיני — שמות קבצים בעברית אינם נתמכים בהורדת Blob בחלק מהדפדפנים
    a.download = "luach-silukin.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify("קובץ CSV ירד");
  };

  const cell = (r: ScheduleRow, key: (typeof cols)[number]["key"]) => {
    if (key === "month") return r.isBalloon ? "בלון" : r.month;
    const v = r[key];
    return v === undefined ? "—" : fmtMoney(v);
  };

  return (
    <Modal title="לוח סילוקין" icon={IconSchedule} onClose={onClose} wide>
      <div className="schedule-meta">
        {meta.map((m) => (
          <span key={m.label}>
            {m.label}: <b>{m.value}</b>
          </span>
        ))}
      </div>

      <div className="modal-actions">
        <button type="button" className="mini-btn" onClick={() => window.print()}>
          <IconPrint size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          הדפסה
        </button>
        <button type="button" className="mini-btn" onClick={downloadCsv}>
          הורדה כ-CSV
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={async () => {
            if (await copyText(summaryText)) notify("הסיכום הועתק");
          }}
        >
          <IconCopyToClient size={ICON_SM} strokeWidth={ICON_STROKE} aria-hidden />
          העתקת סיכום
        </button>
      </div>

      {note && <div className="note">{note}</div>}

      <div className="table-wrap">
        <table className="schedule">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((r, idx) => (
              <tr key={idx} className={r.isBalloon ? "balloon-row" : undefined}>
                {cols.map((c) => (
                  <td key={c.key}>{cell(r, c.key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {cols.map((c) => {
                if (c.key === "month") return <td key={c.key}>סה״כ</td>;
                if (c.key === "opening" || c.key === "closing") return <td key={c.key}>—</td>;
                return <td key={c.key}>{fmtMoney(round2(totals[c.key]))}</td>;
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}

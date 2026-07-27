"use client";

import {
  TRACKS,
  TRACK_ORDER,
  balloonDescription,
  feeDescription,
  monthsDescription,
} from "@/lib/tracks";

/** אזור "הכרת המסלולים" — כרטיס קצר לכל מסלול */
export default function TracksInfo() {
  return (
    <div className="calc-screen">
      {TRACK_ORDER.map((id) => {
        const t = TRACKS[id];
        return (
          <section key={id} className={`panel track-card${t.star ? " star" : ""}`}>
            <div className="track-card-head">
              <h2 className="track-card-title">
                {t.star ? "⭐ " : ""}
                {t.name}
              </h2>
              {t.tagline && <span className="track-pill">{t.tagline}</span>}
            </div>

            <div className="track-specs">
              <div>
                <span>טווח מקדמה</span>
                <b>
                  {t.downMin}%–{t.downMax}%
                  {t.bdmMin !== undefined && ` (BDM: ${t.bdmMin}%–${t.bdmMax}%)`}
                </b>
              </div>
              <div>
                <span>תקופת מימון</span>
                <b>{monthsDescription(id)}</b>
              </div>
              <div>
                <span>בלון</span>
                <b>{balloonDescription(id)}</b>
              </div>
              <div>
                <span>עמלת הקמה</span>
                <b>{feeDescription(id)}</b>
              </div>
              <div>
                <span>שיטת סילוקין</span>
                <b>{t.amortNote}</b>
              </div>
            </div>

            <div className="track-note">
              <b>למי מתאים:</b> {t.audience}
            </div>
            <div className="track-note key">
              <b>חשוב להסביר ללקוח:</b> {t.keyPoint}
            </div>
          </section>
        );
      })}
    </div>
  );
}

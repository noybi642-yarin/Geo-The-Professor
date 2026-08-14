import type { Metadata } from "next";
import BoiHistoryPage from "@/components/calc/BoiHistoryPage";

export const metadata: Metadata = {
  title: "היסטוריית ריבית בנק ישראל — שלום נוי",
  description: "12 התקופות האחרונות של ריבית בנק ישראל והפריים הנגזר ממנה.",
};

export default function Page() {
  return <BoiHistoryPage />;
}

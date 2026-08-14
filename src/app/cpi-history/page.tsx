import type { Metadata } from "next";
import CpiHistoryPage from "@/components/calc/CpiHistoryPage";

export const metadata: Metadata = {
  title: "היסטוריית מדד המחירים לצרכן — שלום נוי",
  description: "12 החודשים האחרונים של מדד המחירים לצרכן, לפי נתוני הלשכה המרכזית לסטטיסטיקה.",
};

export default function Page() {
  return <CpiHistoryPage />;
}

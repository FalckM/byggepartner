import type { Metadata } from "next";
import { FinishSession } from "./finish-session";

export const metadata: Metadata = { title: "Avslutt testøkt" };

export default function FinishPage() {
  return <FinishSession />;
}

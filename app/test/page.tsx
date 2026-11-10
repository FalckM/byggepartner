import type { Metadata } from "next";
import { StartSession } from "./start-session";

export const metadata: Metadata = { title: "Brukertest – moderator" };

export default function TestPage() {
  return <StartSession />;
}

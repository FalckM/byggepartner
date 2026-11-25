"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="outline" className="no-print min-h-11" onClick={() => window.print()}>
      <Printer aria-hidden /> Skriv ut
    </Button>
  );
}

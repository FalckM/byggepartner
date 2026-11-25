import { FlaskConical } from "lucide-react";

/** Required on every page (spec 0.6): makes clear this is not an official Multicom service. */
export function PrototypeBanner() {
  return (
    <div
      role="note"
      aria-label="Om denne nettsiden"
      className="bg-muted px-4 py-2 text-center text-[13px] text-muted-foreground"
    >
      <FlaskConical aria-hidden className="mr-1.5 inline size-4 align-[-3px]" />
      <strong className="font-semibold text-foreground">Studentprototype (IS-219, UiA)</strong> – ikke en offisiell Multicom-tjeneste. Priser og data er
      demo-data.
    </div>
  );
}

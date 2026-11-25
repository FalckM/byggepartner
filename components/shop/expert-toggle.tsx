"use client";
import { Switch } from "@/components/ui/switch";
import { track } from "@/lib/analytics/track";
import { useExpert, usePrefs } from "@/lib/client/prefs-store";

export function ExpertToggle() {
  const expert = useExpert();
  const setExpert = usePrefs((s) => s.setExpert);
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-sm hover:bg-muted">
      <Switch
        checked={expert}
        onCheckedChange={(on) => {
          setExpert(on);
          track("expert_mode_toggled", { on });
        }}
        aria-label="Ekspertmodus"
      />
      <span className="hidden md:inline">Ekspertmodus</span>
      <span className="md:hidden">Ekspert</span>
    </label>
  );
}

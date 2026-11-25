import { AppWindow, Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, MonitorPlay, Package, Plug, type LucideProps } from "lucide-react";
import type { Category } from "@/lib/engine/types";

const ICONS: Record<Category, React.ComponentType<LucideProps>> = {
  CPU: Cpu,
  MOTHERBOARD: CircuitBoard,
  RAM: MemoryStick,
  GPU: MonitorPlay,
  STORAGE: HardDrive,
  PSU: Plug,
  CASE: Box,
  COOLER: Fan,
  OS: AppWindow,
  ACCESSORY: Package,
};

export function CategoryIcon({ category, ...props }: { category: Category } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon aria-hidden {...props} />;
}

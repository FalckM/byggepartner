"use client";
// US-14, DP2 — A see-through 3D PC (pure CSS 3D, no WebGL) whose parts fill in as the customer picks them in /bygg.
// Drag to turn it; it sways slowly on its own unless the user prefers reduced motion.
import { useEffect, useRef } from "react";
import type { Category } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export type PartState = "empty" | "filled" | "error" | "skipped";

/** Case size in scene units: x = front-to-back length, y = height (down), z = from the motherboard tray out to the glass. */
const W = 220;
const H = 280;
const D = 120;

interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

// Real-ish layout of a mid-tower seen through the glass side panel.
const PARTS: { category: Category; boxes: Box[] }[] = [
  { category: "MOTHERBOARD", boxes: [{ x: 16, y: 16, z: 2, w: 150, h: 186, d: 4 }] },
  { category: "CPU", boxes: [{ x: 58, y: 46, z: 6, w: 34, h: 34, d: 5 }] },
  { category: "COOLER", boxes: [{ x: 50, y: 34, z: 11, w: 50, h: 58, d: 46 }] },
  {
    category: "RAM",
    boxes: [
      { x: 112, y: 34, z: 6, w: 6, h: 66, d: 18 },
      { x: 122, y: 34, z: 6, w: 6, h: 66, d: 18 },
    ],
  },
  { category: "GPU", boxes: [{ x: 18, y: 116, z: 6, w: 176, h: 24, d: 70 }] },
  { category: "STORAGE", boxes: [{ x: 40, y: 168, z: 6, w: 62, h: 10, d: 3 }] },
  { category: "PSU", boxes: [{ x: 12, y: 220, z: 10, w: 112, h: 50, d: 90 }] },
];

const FACES = ["front", "back", "left", "right", "top", "bottom"] as const;

function faceStyle(face: (typeof FACES)[number], { w, h, d }: Box): React.CSSProperties {
  switch (face) {
    case "front":
      return { width: w, height: h, transform: `translateZ(${d}px)` };
    case "back":
      return { width: w, height: h, transform: "rotateY(180deg)" };
    case "left":
      return { width: d, height: h, transformOrigin: "left center", transform: "rotateY(-90deg)" };
    case "right":
      return { width: d, height: h, transformOrigin: "left center", transform: `translateX(${w}px) rotateY(-90deg)` };
    case "top":
      return { width: w, height: d, transformOrigin: "top center", transform: "rotateX(90deg)" };
    case "bottom":
      return { width: w, height: d, transformOrigin: "top center", transform: `translateY(${h}px) rotateX(90deg)` };
  }
}

function Cuboid({ box }: { box: Box }) {
  return (
    <div className="pc3d-box" style={{ transform: `translate3d(${box.x}px, ${box.y}px, ${box.z}px)` }}>
      {FACES.map((f) => (
        <div key={f} className="pc3d-face" data-face={f} style={faceStyle(f, box)} />
      ))}
    </div>
  );
}

const STYLE = `
.pc3d { position: relative; touch-action: pan-y; user-select: none; cursor: grab; }
.pc3d:active { cursor: grabbing; }
.pc3d-scale { position: absolute; left: 50%; top: 50%; width: ${W}px; height: ${H}px; margin: -${H / 2}px 0 0 -${W / 2}px;
  transform: scale(var(--pc-scale, 1)); transform-style: preserve-3d; }
.pc3d-rig { position: absolute; inset: 0; transform-style: preserve-3d;
  transform: rotateX(var(--pc-rx, -18deg)) rotateY(var(--pc-ry, -36deg)) translateZ(${-D / 2}px); }
.pc3d-box, .pc3d .pc-part { position: absolute; left: 0; top: 0; transform-style: preserve-3d; }
.pc3d-face { position: absolute; left: 0; top: 0; box-sizing: border-box; backface-visibility: visible;
  border: 1px dashed color-mix(in oklch, var(--muted-foreground) 70%, transparent);
  background: transparent; transition: background-color .45s ease, border-color .3s ease; }

/* Picked part: solid, lit a little differently per face so the box reads as 3D. */
.pc-part[data-state="filled"] .pc3d-face { border: 1px solid var(--primary); background: color-mix(in oklch, var(--primary) 38%, transparent); }
.pc-part[data-state="filled"] .pc3d-face[data-face="top"] { background: color-mix(in oklch, var(--primary) 22%, transparent); }
.pc-part[data-state="filled"] .pc3d-face[data-face="left"],
.pc-part[data-state="filled"] .pc3d-face[data-face="right"] { background: color-mix(in oklch, var(--primary) 58%, transparent); }
.pc-part[data-state="error"] .pc3d-face { border: 1.5px solid var(--err); background: color-mix(in oklch, var(--err) 35%, transparent); }
.pc-part[data-state="skipped"] .pc3d-face { border-color: var(--border); }
.pc-part[data-current] .pc3d-face { border: 2px solid var(--primary); animation: pc3d-pulse 1.6s ease-in-out infinite; }
@keyframes pc3d-pulse { 50% { border-color: color-mix(in oklch, var(--primary) 30%, transparent); } }

/* The case: a glass box. Faint walls, a slightly stronger frame once a case is chosen. */
.pc-part[data-category="CASE"] .pc3d-face { background: color-mix(in oklch, var(--muted-foreground) 4%, transparent); }
.pc-part[data-category="CASE"][data-state="filled"] .pc3d-face { border: 1.5px solid color-mix(in oklch, var(--foreground) 55%, transparent);
  background: color-mix(in oklch, var(--foreground) 5%, transparent); }
.pc-part[data-category="CASE"][data-state="filled"] .pc3d-face[data-face="front"] { background: color-mix(in oklch, var(--primary) 3%, transparent); }
.pc-part[data-category="CASE"][data-state="error"] .pc3d-face { background: color-mix(in oklch, var(--err) 8%, transparent); }
.pc3d-floor { position: absolute; left: -40px; top: ${H + 6}px; width: ${W + 80}px; height: ${D + 60}px; transform-origin: top center;
  transform: translateZ(-30px) rotateX(90deg); background: radial-gradient(closest-side, color-mix(in oklch, var(--foreground) 14%, transparent), transparent); }

@media (prefers-reduced-motion: reduce) {
  .pc3d-face { transition: none; }
  .pc-part[data-current] .pc3d-face { animation: none; }
}
`;

export function PcDiagram({
  states,
  current,
  onSelect,
  className,
  scale = 1,
}: {
  states: Partial<Record<Category, PartState>>;
  current?: Category;
  onSelect?: (category: Category) => void;
  className?: string;
  /** Visual size of the model; the box keeps its own height via className. */
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMotion(ref);

  const select = (category: Category) => (e: React.MouseEvent) => {
    // A drag ends in a click as well – only treat it as a click if the model barely moved.
    if (ref.current?.dataset.dragged === "1") return;
    e.stopPropagation();
    onSelect?.(category);
  };

  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="pc-diagram"
      className={cn("pc3d h-[340px] w-full [perspective:1100px]", className)}
      style={{ "--pc-scale": scale } as React.CSSProperties}
    >
      <style href="pc-diagram-3d" precedence="default">
        {STYLE}
      </style>
      <div className="pc3d-scale">
        <div className="pc3d-rig">
          <div className="pc3d-floor" />
          {PARTS.map((p) => (
            <div
              key={p.category}
              className="pc-part"
              data-category={p.category}
              data-state={states[p.category] ?? "empty"}
              data-current={current === p.category || undefined}
              onClick={select(p.category)}
            >
              {p.boxes.map((b, i) => (
                <Cuboid key={i} box={b} />
              ))}
            </div>
          ))}
          {/* The case last, so its glass sits in front of everything. */}
          <div
            className="pc-part"
            data-category="CASE"
            data-state={states.CASE ?? "empty"}
            data-current={current === "CASE" || undefined}
            onClick={select("CASE")}
          >
            <Cuboid box={{ x: 0, y: 0, z: 0, w: W, h: H, d: D }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Drag to rotate; gentle idle sway. Writes CSS variables directly, so React never re-renders per frame. */
function useMotion(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ry = -36;
    let rx = -18;
    let drag: { x: number; y: number; ry: number; rx: number } | null = null;
    let idleSince = performance.now();
    let frame = 0;

    const apply = () => {
      el.style.setProperty("--pc-ry", `${ry}deg`);
      el.style.setProperty("--pc-rx", `${rx}deg`);
    };
    const tick = (t: number) => {
      if (!drag && t - idleSince > 1500) {
        // Ease back towards a slow sway around the "look through the glass" angle.
        const target = -36 + Math.sin((t - idleSince) / 2600) * 16;
        ry += (target - ry) * 0.03;
        rx += (-18 - rx) * 0.03;
        apply();
      }
      frame = requestAnimationFrame(tick);
    };
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, ry, rx };
      el.dataset.dragged = "0";
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) el.dataset.dragged = "1";
      ry = drag.ry + dx * 0.45;
      rx = Math.max(-45, Math.min(20, drag.rx - dy * 0.3));
      apply();
    };
    const up = () => {
      if (!drag) return;
      drag = null;
      idleSince = performance.now();
      // Let the click handler see the flag, then clear it.
      setTimeout(() => (el.dataset.dragged = "0"), 0);
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    apply();
    if (!reduce) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [ref]);
}

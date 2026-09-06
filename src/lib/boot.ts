export type StatusKey = "CPU" | "MEM" | "GPU" | "NET" | "SEC" | "PWR";

export type LineKind = "sys" | "ok" | "sec";

export interface BootLine {
  /** ms after boot start */
  at: number;
  /** progress target (0–100) once this line lands */
  pct: number;
  text: string;
  kind: LineKind;
  flag?: StatusKey;
}

export const BOOT_LINES: BootLine[] = [
  { at: 150, pct: 4, text: "HEXAVORA FIRMWARE 6.1.0 — COLD BOOT INITIATED", kind: "sys", flag: "PWR" },
  { at: 440, pct: 11, text: "CPU · HEXA-CORE VECTOR UNIT ×6 …… ONLINE", kind: "ok", flag: "CPU" },
  { at: 730, pct: 19, text: "MEMORY INTEGRITY CHECK · 65536 KB …… PASS", kind: "ok", flag: "MEM" },
  { at: 1030, pct: 27, text: "GPU PIPELINE [VOLTRA-9] …… ONLINE", kind: "ok", flag: "GPU" },
  { at: 1340, pct: 38, text: "PARTICLE FIELD CALIBRATION · 2048 NODES", kind: "sys" },
  { at: 1680, pct: 47, text: "CRYPTOGRAPHIC HANDSHAKE · AES-512 …… SECURE", kind: "sec", flag: "SEC" },
  { at: 2000, pct: 56, text: "MOUNTING /dev/hexas …… OK", kind: "ok" },
  { at: 2330, pct: 68, text: "INTERFACE MODULES [12/12] …… LOADED", kind: "ok" },
  { at: 2660, pct: 79, text: "TELEMETRY LINK …… SYNCED", kind: "ok", flag: "NET" },
  { at: 2990, pct: 88, text: "RENDER PIPELINE · 60 FPS TARGET LOCK", kind: "sys" },
  { at: 3300, pct: 97, text: "INTEGRITY SWEEP · 0 ANOMALIES DETECTED", kind: "ok" },
  { at: 3570, pct: 100, text: "ALL SYSTEMS NOMINAL — LAUNCHING INTERFACE", kind: "sec" },
];

export const BOOT_END_MS = BOOT_LINES[BOOT_LINES.length - 1].at;

export const KIND_TAG: Record<LineKind, { tag: string; cls: string }> = {
  sys: { tag: "SYS", cls: "text-hv-cyan border-hv-cyan/40" },
  ok: { tag: "OK", cls: "text-hv-ok border-hv-ok/40" },
  sec: { tag: "SEC", cls: "text-hv-amber border-hv-amber/40" },
};

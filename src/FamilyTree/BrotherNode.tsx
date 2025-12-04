import { Handle, Position } from "@xyflow/react";
import { getSequentialColor, lowkeyColor } from "../lib/colors";
import { GREEK_ORDER } from "../lib/greekAlphabet";

// Fixed ordering of Greek classes, from Alpha to Omega

// Also handle future multi-part classes like "Alpha Alpha", "Alpha Beta", etc.
// We keep them deterministic by mapping:
//   baseIndex = index of first word in GREEK_ORDER
//   extIndex  = index of second word in GREEK_ORDER (if present)
//   final palette index = baseIndex                     // simple class
//   or                 = GREEK_ORDER.length + baseIndex * GREEK_ORDER.length + extIndex
function getClassColor(className: string): string {
  if (!className || className === "null" || className === "unknown") {
    return getSequentialColor(0);
  }

  const parts = className.trim().split(/\s+/);
  const base = parts[0];
  const baseIndex = GREEK_ORDER.indexOf(base as (typeof GREEK_ORDER)[number]);

  // Unknown base: just fall back to the first color
  if (baseIndex === -1) {
    return getSequentialColor(0);
  }

  // Simple class like "Alpha", "Beta", ...
  if (parts.length === 1) {
    return getSequentialColor(baseIndex);
  }

  // Extended class like "Alpha Alpha", "Alpha Beta", ...
  const ext = parts[1];
  const extIndex = GREEK_ORDER.indexOf(ext as (typeof GREEK_ORDER)[number]);

  // If extension is unknown, treat it as the first extension slot
  const safeExtIndex = extIndex === -1 ? 0 : extIndex;

  const offset = GREEK_ORDER.length;
  const paletteIndex = offset + baseIndex * GREEK_ORDER.length + safeExtIndex;

  return getSequentialColor(paletteIndex);
}

export const BrotherNode = ({
  data,
}: {
  data: {
    name: string;
    class: string;
    faded?: boolean;
    redactedFaded?: boolean;
    familyColor?: string;
    colorBy?: "class" | "family";
    isHighlighted?: boolean;
  };
}) => {
  const isRedacted = data.name === "REDACTED";
  const colorBy = data.colorBy || "class";
  const color =
    colorBy === "family" && data.familyColor
      ? data.familyColor
      : getClassColor(data.class);

  const faded = data.faded ?? false;
  const redactedFaded = data.redactedFaded ?? false;
  // Combine both faded states: if either is true, reduce opacity
  const opacity = faded || redactedFaded ? 0.15 : 1.0;
  const isHighlighted = data.isHighlighted ?? false;

  return (
    <div
      className={`px-2 py-1 rounded-xl border-2 shadow-sm min-w-[100px] text-center relative ${
        isHighlighted ? "animate-pulse-scale" : ""
      }`}
      style={{
        borderColor: color,
        opacity,
        filter: faded ? "grayscale(1)" : undefined,
        background: lowkeyColor(color, 0.2),
      }}
    >
      {/* Source handle at the bottom for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: color, opacity }}
        isConnectable={false}
      />
      {/* Target handle at the top for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: color, opacity }}
        isConnectable={false}
      />
      <div className="font-medium text-sm" style={{ color: color }}>
        {isRedacted ? (
          <span className="opacity-60">[REDACTED]</span>
        ) : (
          data.name
        )}
      </div>
      <div
        className="text-xs"
        style={{
          color,
          opacity: isRedacted ? 0.6 : 1,
        }}
      >
        {data.class !== "null" && data.class !== "unknown" ? data.class : ""}
      </div>
    </div>
  );
};

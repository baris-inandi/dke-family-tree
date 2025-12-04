import { Handle, Position } from "@xyflow/react";

interface Color {
  foreground: string;
  background: string;
}

export const BrotherNode = ({
  data,
}: {
  data: {
    name: string;
    class: string;
    faded?: boolean;
    redactedFaded?: boolean;
    classColor?: Color;
    familyColor?: Color;
    colorBy?: "class" | "family";
    isHighlighted?: boolean;
  };
}) => {
  const isRedacted = data.name === "REDACTED";
  const colorBy = data.colorBy || "class";

  // Get color based on mode - use pre-computed colors
  const color =
    colorBy === "family" && data.familyColor
      ? data.familyColor
      : data.classColor;

  // Fallback to a default color if none found
  const defaultColor: Color = {
    foreground: "hsl(0 95% 25%)",
    background: "hsla(0 95% 35% / 0.2)",
  };
  const finalColor = color || defaultColor;

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
        borderColor: finalColor.foreground,
        opacity,
        filter: faded ? "grayscale(1)" : undefined,
        background: finalColor.background,
      }}
    >
      {/* Source handle at the bottom for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: finalColor.foreground, opacity }}
        isConnectable={false}
      />
      {/* Target handle at the top for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: finalColor.foreground, opacity }}
        isConnectable={false}
      />
      <div
        className="font-medium text-sm"
        style={{ color: finalColor.foreground }}
      >
        {isRedacted ? (
          <span className="opacity-60">[REDACTED]</span>
        ) : (
          data.name
        )}
      </div>
      <div
        className="text-xs"
        style={{
          color: finalColor.foreground,
          opacity: isRedacted ? 0.6 : 1,
        }}
      >
        {data.class !== "null" && data.class !== "unknown" ? data.class : ""}
      </div>
    </div>
  );
};

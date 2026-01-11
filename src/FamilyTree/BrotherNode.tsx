import { Handle, Position } from "@xyflow/react";
import RedactableText from "./RedactableText";

interface Color {
  foreground: string;
  background: string;
}

interface Brother {
  id: string;
  info: Record<string, string | { byFamily: Color; byClass: Color }>;
}

export const BrotherNode = ({
  data,
}: {
  data: {
    brother: Brother;
    faded?: boolean;
    colorBy?: "class" | "family";
    isHighlighted?: boolean;
  };
}) => {
  const colorBy = data.colorBy || "class";
  const faded = data.faded ?? false;
  const isHighlighted = data.isHighlighted ?? false;

  // Extract values from brother
  const nameValue = (data.brother.info.name as string) ?? "[UNKNOWN]";
  const classValue = (data.brother.info.class as string) ?? "[UNKNOWN]";
  const gradValue = (data.brother.info.grad as string) ?? "[UNKNOWN]";

  // Get colors from brother's info
  const colors = data.brother.info.colors as
    | { byFamily: Color; byClass: Color }
    | undefined;

  // Get color based on mode - use pre-computed colors
  const color = (colorBy === "family" && colors?.byFamily
    ? colors.byFamily
    : colors?.byClass) || {
    foreground: "hsl(0 0% 25%)",
    background: "hsla(0 0% 35% / 0.2)",
  };

  const opacity = faded ? 0.2 : 1.0;

  return (
    <div
      className={`px-2 py-1 rounded-2xl border-2 shadow-md min-w-[100px] text-center relative
        ${isHighlighted ? "animate-pulse-scale" : ""}
        ${faded ? "grayscale" : ""}
      `}
      style={{
        borderColor: color.foreground,
        opacity,
        background: color.background,
      }}
    >
      {/* Source handle at the bottom for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: color.foreground, opacity }}
        isConnectable={false}
      />
      {/* Target handle at the top for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: color.foreground, opacity }}
        isConnectable={false}
      />
      <div className="font-medium text-sm" style={{ color: color.foreground }}>
        <RedactableText length={14}>{nameValue}</RedactableText>
      </div>
      <div
        className="text-xs"
        style={{
          color: color.foreground,
        }}
      >
        <RedactableText length={4}>{classValue}</RedactableText> Class
      </div>
      {data.brother.info.grad && (
        <div
          className="text-xs opacity-70"
          style={{
            color: color.foreground,
          }}
        >
          Northeastern <RedactableText length={4}>{gradValue}</RedactableText>
        </div>
      )}
    </div>
  );
};

import { Handle, Position } from "@xyflow/react";
import type { Tree } from "../../familytree-output/tree";
import RedactableText from "./RedactableText";

export const BrotherNode = ({
  data,
}: {
  data: {
    brother: Tree;
    faded?: boolean;
    colorBy?: "class" | "family";
    isHighlighted?: boolean;
  };
}) => {
  const colorBy = data.colorBy || "class";
  const faded = data.faded ?? false;
  const isHighlighted = data.isHighlighted ?? false;

  // Extract values from brother
  const nameValue = data.brother.info.name ?? "[UNKNOWN]";
  const classValue = data.brother.info.class ?? "[UNKNOWN]";

  const colors = data.brother.colors;

  const color = (colorBy === "family" && colors.byFamily
    ? colors.byFamily
    : colors.byClass) || {
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
    </div>
  );
};

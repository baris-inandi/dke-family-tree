import { Handle, Position } from "@xyflow/react";

function getClassColor(className: string): string {
  const colors: Record<string, string> = {
    Alpha: "#1e40af",
    Beta: "#7c3aed",
    Gamma: "#059669",
    Delta: "#dc2626",
    Epsilon: "#ea580c",
    Zeta: "#0891b2",
    Eta: "#be185d",
    Theta: "#0d9488",
    Iota: "#ca8a04",
    Kappa: "#0284c7",
    Lambda: "#16a34a",
    Mu: "#9333ea",
    Nu: "#e11d48",
  };
  return colors[className] || "#6b7280";
}

export const BrotherNode = ({
  data,
}: {
  data: { name: string; class: string };
}) => {
  const isRedacted = data.name === "REDACTED";
  const classColor = getClassColor(data.class);

  return (
    <div
      className="px-4 py-2 rounded-lg shadow-md border-2 bg-white min-w-[120px] text-center relative"
      style={{ borderColor: classColor }}
    >
      {/* Source handle at the bottom for outgoing edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ background: classColor }}
        isConnectable={false}
      />
      {/* Target handle at the top for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: classColor }}
        isConnectable={false}
      />
      <div className="font-semibold text-sm">
        {isRedacted ? (
          <span className="text-gray-500 italic">REDACTED</span>
        ) : (
          data.name
        )}
      </div>
      <div className="text-xs mt-1 font-medium" style={{ color: classColor }}>
        {data.class !== "null" && data.class !== "unknown" ? data.class : ""}
      </div>
    </div>
  );
};

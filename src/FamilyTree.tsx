import {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo } from "react";
import familyTreeData from "../FAMILYTREE.json";

interface Brother {
  name: string;
  class: string;
  children: Brother[];
}

// Custom node component
const BrotherNode = ({ data }: { data: { name: string; class: string } }) => {
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
      />
      {/* Target handle at the top for incoming edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ background: classColor }}
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

const nodeTypes = {
  brother: BrotherNode,
};

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

// Convert hierarchical data to nodes and edges with hierarchical layout
function convertToFlowData(data: Brother[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const parentChildMap = new Map<string, string[]>(); // parentId -> [childIds]
  let nodeIdCounter = 0;

  function createTree(
    brothers: Brother[],
    parentId: string | null,
    level: number,
    startX: number,
    levelY: number
  ): { endX: number; nodeIds: string[] } {
    const nodeSpacing = 250;
    const levelHeight = 180;
    let currentX = startX;
    const nodeIds: string[] = [];

    for (const brother of brothers) {
      const id = `node-${nodeIdCounter++}`;
      nodeIds.push(id);

      // Calculate width needed for this subtree
      const subtreeWidth = calculateSubtreeWidth(brother, nodeSpacing);
      const nodeX = currentX + subtreeWidth / 2 - 60; // Center the node

      nodes.push({
        id,
        type: "brother",
        position: { x: nodeX, y: levelY },
        data: {
          name: brother.name,
          class: brother.class,
        },
        width: 120,
        height: 60,
      });

      // Store parent-child relationship
      if (parentId) {
        if (!parentChildMap.has(parentId)) {
          parentChildMap.set(parentId, []);
        }
        parentChildMap.get(parentId)!.push(id);
      }

      // Process children
      if (brother.children.length > 0) {
        const childrenResult = createTree(
          brother.children,
          id,
          level + 1,
          currentX,
          levelY + levelHeight
        );
        currentX = childrenResult.endX;
      } else {
        currentX += nodeSpacing;
      }
    }

    return { endX: currentX, nodeIds };
  }

  function calculateSubtreeWidth(
    brother: Brother,
    nodeSpacing: number
  ): number {
    if (brother.children.length === 0) {
      return nodeSpacing;
    }
    let totalWidth = 0;
    for (const child of brother.children) {
      totalWidth += calculateSubtreeWidth(child, nodeSpacing);
    }
    return Math.max(totalWidth, brother.children.length * nodeSpacing);
  }

  // Process all root nodes
  let currentX = 100;
  const levelY = 50;
  for (const root of data) {
    const result = createTree([root], null, 0, currentX, levelY);
    currentX = result.endX + 300; // Add spacing between root trees
  }

  // Create all edges after all nodes are created
  for (const [parentId, childIds] of parentChildMap.entries()) {
    for (const childId of childIds) {
      edges.push({
        id: `edge-${parentId}-${childId}`,
        source: parentId,
        sourceHandle: "source",
        target: childId,
        targetHandle: "target",
        style: { stroke: "#3b82f6", strokeWidth: 3 },
      });
    }
  }

  // Center the entire tree
  if (nodes.length > 0) {
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const maxX = Math.max(...nodes.map((n) => n.position.x));
    const centerX = (minX + maxX) / 2;
    const offsetX = window.innerWidth / 2 - centerX;

    nodes.forEach((node) => {
      node.position.x += offsetX;
    });
  }

  // Verify all edge source/target IDs exist in nodes
  const nodeIds = new Set(nodes.map((n) => n.id));
  const invalidEdges = edges.filter(
    (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
  );

  console.log("Generated nodes:", nodes.length, "edges:", edges.length);
  if (invalidEdges.length > 0) {
    console.error("Invalid edges (missing source/target):", invalidEdges);
  }
  if (edges.length > 0) {
    console.log("Sample edge:", edges[0]);
    console.log(
      "First few node IDs:",
      nodes.slice(0, 5).map((n) => n.id)
    );
  }

  return { nodes, edges };
}

export default function FamilyTree() {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToFlowData(familyTreeData as Brother[]),
    []
  );

  console.log("Initial edges count:", initialEdges.length);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => [...eds, params]),
    [setEdges]
  );

  console.log("Rendering with nodes:", nodes.length, "edges:", edges.length);
  console.log("Sample nodes:", nodes.slice(0, 3));
  console.log("Sample edges:", edges.slice(0, 3));

  return (
    <div className="w-full h-screen relative">
      {/* Debug info */}
      <div className="absolute top-2 left-2 z-50 bg-white p-2 rounded shadow text-xs">
        Nodes: {nodes.length} | Edges: {edges.length}
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-right"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

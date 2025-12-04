import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import familyTreeData from "../../FAMILYTREE.json";
import { BrotherNode } from "./BrotherNode";

interface Brother {
  name: string;
  class: string;
  children: Brother[];
}

// Custom node component

const nodeTypes = {
  brother: BrotherNode,
};

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
    const nodeSpacing = 144;
    const levelHeight = 160;
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
    currentX = result.endX + 200; // Add spacing between root trees
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
        style: { stroke: "#9ca3af", strokeWidth: 3 },
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
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  console.log("Rendering with nodes:", nodes.length, "edges:", edges.length);
  console.log("Sample nodes:", nodes.slice(0, 3));
  console.log("Sample edges:", edges.slice(0, 3));

  return (
    <div className="w-full h-screen relative">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={false}
          nodesConnectable={false}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <MiniMap />
          <Controls position="center-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

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
import { useEffect, useMemo, useState } from "react";
import familyTreeData from "../../FAMILYTREE.json";
import { Sidebar } from "../Sidebar";
import { BrotherNode } from "./BrotherNode";

interface Brother {
  name: string;
  class: string;
  children: Brother[];
}

const nodeTypes = {
  brother: BrotherNode,
};

// Calculate family colors (based on root ancestor)
function calculateFamilyColors(data: Brother[]): Map<string, string> {
  const familyColors = new Map<string, string>();
  const colors = [
    "#1e40af",
    "#7c3aed",
    "#059669",
    "#dc2626",
    "#ea580c",
    "#0891b2",
    "#be185d",
    "#0d9488",
    "#ca8a04",
    "#0284c7",
    "#16a34a",
    "#9333ea",
    "#e11d48",
  ];

  function assignFamilyColor(
    brother: Brother,
    familyId: string,
    index: number
  ) {
    familyColors.set(brother.name, colors[index % colors.length]);
    brother.children.forEach((child) => {
      assignFamilyColor(child, familyId, index);
    });
  }

  data.forEach((root, index) => {
    assignFamilyColor(root, root.name, index);
  });

  return familyColors;
}

// Convert hierarchical data to nodes and edges with hierarchical layout
function convertToFlowData(
  data: Brother[],
  hideRedacted: boolean,
  viewClass: string,
  familyColors: Map<string, string>,
  colorBy: "class" | "family",
  searchQuery: string
): { nodes: Node[]; edges: Edge[] } {
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
      const isRedacted = brother.name === "REDACTED";
      const shouldSkipNode = hideRedacted && isRedacted;

      let id: string | null = null;
      if (!shouldSkipNode) {
        id = `node-${nodeIdCounter++}`;
        nodeIds.push(id);

        // Class-based visibility
        const isTargetClass =
          viewClass === "All Classes" ||
          brother.class === viewClass ||
          (viewClass === "All Classes" && brother.class === "unknown");

        // Search-based visibility
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query || brother.name.toLowerCase().includes(query);

        // Single faded flag: faded if it fails class filter OR search
        const faded = !(isTargetClass && matchesSearch);

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
            faded,
            familyColor: familyColors.get(brother.name) || "#6b7280",
            colorBy,
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
      }

      // Process children (filter out redacted if needed)
      const childrenToProcess = hideRedacted
        ? brother.children.filter((child) => child.name !== "REDACTED")
        : brother.children;

      if (childrenToProcess.length > 0) {
        // Use the current node as parent, or the original parent if we skipped this node
        const effectiveParentId = id || parentId;
        const childrenResult = createTree(
          childrenToProcess,
          effectiveParentId,
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
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const [parentId, childIds] of parentChildMap.entries()) {
    const parentNode = nodeMap.get(parentId);
    const parentOpacityValue = parentNode?.style?.opacity;
    const parentOpacity =
      typeof parentOpacityValue === "number" ? parentOpacityValue : 1.0;
    for (const childId of childIds) {
      const childNode = nodeMap.get(childId);
      const childOpacityValue = childNode?.style?.opacity;
      const childOpacity =
        typeof childOpacityValue === "number" ? childOpacityValue : 1.0;
      // Use minimum opacity of parent and child
      const edgeOpacity: number = Math.min(parentOpacity, childOpacity);
      edges.push({
        id: `edge-${parentId}-${childId}`,
        source: parentId,
        sourceHandle: "source",
        target: childId,
        targetHandle: "target",
        style: {
          stroke: "#9ca3af",
          strokeWidth: 3,
          opacity: edgeOpacity,
        },
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
  const [hideRedacted, setHideRedacted] = useState(false);
  const [colorBy, setColorBy] = useState<"class" | "family">("class");
  const [viewClass, setViewClass] = useState("All Classes");
  const [searchQuery, setSearchQuery] = useState("");

  const familyColors = useMemo(
    () => calculateFamilyColors(familyTreeData as Brother[]),
    []
  );

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      convertToFlowData(
        familyTreeData as Brother[],
        hideRedacted,
        viewClass,
        familyColors,
        colorBy,
        searchQuery
      ),
    [hideRedacted, viewClass, familyColors, colorBy, searchQuery]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when filters change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  return (
    <div className="w-full h-screen relative">
      <Sidebar
        nodeCount={nodes.length}
        edgeCount={edges.length}
        hideRedacted={hideRedacted}
        onHideRedactedChange={setHideRedacted}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        viewClass={viewClass}
        onViewClassChange={setViewClass}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

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

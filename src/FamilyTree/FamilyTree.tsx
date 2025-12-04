import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import compiledData from "../../tree/tree.json";
import { Sidebar } from "../Sidebar";
import { BrotherNode } from "./BrotherNode";

interface Color {
  foreground: string;
  background: string;
}

interface Brother {
  id: string;
  name: string;
  class: string;
  children: Brother[];
}

interface CompiledData {
  tree: Brother[];
  metadata: {
    availableClasses: string[];
    classColors: Record<string, Color>;
    familyColors: Record<string, Color>;
  };
}

const familyTreeData = compiledData as unknown as CompiledData;

const nodeTypes = {
  brother: BrotherNode,
};

// Convert hierarchical data to nodes and edges with hierarchical layout
function convertToFlowData(
  data: Brother[],
  hideRedacted: boolean,
  viewClass: string,
  classColors: Record<string, Color>,
  familyColors: Record<string, Color>,
  colorBy: "class" | "family"
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const parentChildMap = new Map<string, string[]>(); // parentId -> [childIds]

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
      const id = brother.id; // Use brother.id directly
      nodeIds.push(id);

      // Class-based visibility
      const isTargetClass =
        viewClass === "All Classes" ||
        brother.class === viewClass ||
        (viewClass === "All Classes" && brother.class === "unknown");

      // Faded flag: based on class filter
      const faded = !isTargetClass;

      // Redacted faded: fade redacted nodes when hideRedacted is on
      const redactedFaded = hideRedacted && isRedacted;

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
          redactedFaded,
          classColor: classColors[brother.class],
          familyColor: familyColors[brother.id],
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

      // Process children (always traverse all children)
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

  return { nodes, edges };
}

type FlowCanvasProps = {
  initialNodes: Node[];
  initialEdges: Edge[];
  searchQuery: string;
};

function FlowCanvas({
  initialNodes,
  initialEdges,
  searchQuery,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null
  );
  const reactFlow = useReactFlow();

  // Update nodes when filters change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Center/zoom on the top matching node when search changes (debounced)
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      // Clear highlight when search is empty and fit entire tree
      const clearTimeoutId = setTimeout(() => {
        setHighlightedNodeId(null);
        reactFlow.fitView({ padding: 0.1, duration: 300 });
      }, 0);
      return () => clearTimeout(clearTimeoutId);
    }

    const timeoutId = setTimeout(() => {
      const match = nodes.find(
        (node) =>
          typeof (node.data as { name?: string })?.name === "string" &&
          (node.data as { name?: string }).name!.toLowerCase().includes(query)
      );

      if (!match) {
        setTimeout(() => {
          setHighlightedNodeId(null);
        }, 0);
        return;
      }

      // Set highlighted node to trigger animation
      setTimeout(() => {
        setHighlightedNodeId(match.id);
      }, 0);

      // Clear highlight after animation completes (600ms)
      setTimeout(() => {
        setHighlightedNodeId(null);
      }, 600);

      const width = (match.width as number | undefined) ?? 120;
      const height = (match.height as number | undefined) ?? 60;
      const centerX = match.position.x + width / 2;
      const centerY = match.position.y + height / 2;

      reactFlow.setCenter(centerX, centerY, { zoom: 1.4, duration: 333 });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, nodes, reactFlow]);

  // Update nodes with highlight flag
  const nodesWithHighlight = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: node.id === highlightedNodeId,
      },
    }));
  }, [nodes, highlightedNodeId]);

  return (
    <ReactFlow
      nodes={nodesWithHighlight}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      nodesDraggable={false}
      nodesConnectable={false}
      minZoom={0.1}
      fitView
      attributionPosition="bottom-left"
    >
      <Background />
      <MiniMap zoomable />
      <Controls showInteractive={false} position="center-right" />
    </ReactFlow>
  );
}

export default function FamilyTree() {
  const [hideRedacted, setHideRedacted] = useState(false);
  const [colorBy, setColorBy] = useState<"class" | "family">("family");
  const [viewClass, setViewClass] = useState("All Classes");
  const [searchQuery, setSearchQuery] = useState("");

  // Use pre-computed metadata from compilation
  const { classColors, familyColors, availableClasses } =
    familyTreeData.metadata;

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      convertToFlowData(
        familyTreeData.tree,
        hideRedacted,
        viewClass,
        classColors,
        familyColors,
        colorBy
      ),
    [hideRedacted, viewClass, classColors, familyColors, colorBy]
  );

  const resultCount = useMemo(() => {
    return initialNodes.filter((node) => {
      const data = node.data as {
        faded?: boolean;
        redactedFaded?: boolean;
      };
      return !data.faded && !data.redactedFaded;
    }).length;
  }, [initialNodes]);

  const handleClearFilters = () => {
    setHideRedacted(false);
    setViewClass("All Classes");
    setSearchQuery("");
  };

  return (
    <div className="w-full h-screen relative">
      <Sidebar
        nodeCount={initialNodes.length}
        edgeCount={initialEdges.length}
        hideRedacted={hideRedacted}
        onHideRedactedChange={setHideRedacted}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        viewClass={viewClass}
        onViewClassChange={setViewClass}
        availableClasses={availableClasses}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        resultCount={resultCount}
        onClearFilters={handleClearFilters}
      />

      <ReactFlowProvider>
        <FlowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          searchQuery={searchQuery}
        />
      </ReactFlowProvider>
    </div>
  );
}

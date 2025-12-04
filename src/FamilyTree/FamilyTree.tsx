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
import familyTreeData from "../../tree/tree.json";
import { getSequentialColor } from "../lib/colors";
import { GREEK_ORDER } from "../lib/greekAlphabet";
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

// Calculate family colors
// - If there are multiple roots, each root is a family
// - If there's a single root (e.g. Adam Akkach), treat that root's
//   immediate children as separate families so branches get distinct colors
// IMPORTANT: key by Brother object, not name, so multiple \"REDACTED\"
// nodes in different branches still get their branch's family color.
function calculateFamilyColors(data: Brother[]): Map<Brother, string> {
  const familyColors = new Map<Brother, string>();

  function colorSubtree(brother: Brother, colorIndex: number) {
    const color = getSequentialColor(colorIndex);
    familyColors.set(brother, color);
    brother.children.forEach((child) => colorSubtree(child, colorIndex));
  }

  if (data.length === 1) {
    // Single global root (e.g. Adam Akkach) – use its immediate children
    // as "family roots" so each major branch gets its own color
    const root = data[0];
    root.children.forEach((familyRoot, index) => {
      colorSubtree(familyRoot, index);
    });
  } else {
    // Multiple disjoint roots – each root is its own family
    data.forEach((root, index) => {
      colorSubtree(root, index);
    });
  }

  return familyColors;
}

// Convert hierarchical data to nodes and edges with hierarchical layout
function convertToFlowData(
  data: Brother[],
  hideRedacted: boolean,
  viewClass: string,
  familyColors: Map<Brother, string>,
  colorBy: "class" | "family"
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

        // Faded flag: only based on class filter, not search
        const faded = !isTargetClass;

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
            familyColor: familyColors.get(brother) || getSequentialColor(0),
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

      reactFlow.setCenter(centerX, centerY, { zoom: 1.2, duration: 300 });
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
      <MiniMap />
      <Controls position="center-right" />
    </ReactFlow>
  );
}

export default function FamilyTree() {
  const [hideRedacted, setHideRedacted] = useState(false);
  const [colorBy, setColorBy] = useState<"class" | "family">("family");
  const [viewClass, setViewClass] = useState("All Classes");
  const [searchQuery, setSearchQuery] = useState("");

  const familyColors = useMemo(
    () => calculateFamilyColors(familyTreeData as Brother[]),
    []
  );

  // Dynamically derive all classes present in the data,
  // sorted by Greek order when possible so new classes
  // automatically show up in the sidebar dropdown.
  const availableClasses = useMemo(() => {
    const classes = new Set<string>();

    function collect(brothers: Brother[]) {
      for (const b of brothers) {
        if (
          b.class &&
          b.class !== "null" &&
          b.class !== "unknown" &&
          b.class !== "All Classes"
        ) {
          classes.add(b.class);
        }
        if (b.children && b.children.length > 0) {
          collect(b.children);
        }
      }
    }

    collect(familyTreeData as Brother[]);

    const orderIndex = new Map<string, number>();
    GREEK_ORDER.forEach((name, idx) => orderIndex.set(name, idx));

    return Array.from(classes).sort((a, b) => {
      const ai = orderIndex.has(a)
        ? orderIndex.get(a)!
        : Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.has(b)
        ? orderIndex.get(b)!
        : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      convertToFlowData(
        familyTreeData as Brother[],
        hideRedacted,
        viewClass,
        familyColors,
        colorBy
      ),
    [hideRedacted, viewClass, familyColors, colorBy]
  );

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

import React from "react";

interface SidebarProps {
  nodeCount: number;
  edgeCount: number;
  hideRedacted: boolean;
  onHideRedactedChange: (value: boolean) => void;
  colorBy: "class" | "family";
  onColorByChange: (value: "class" | "family") => void;
  viewClass: string;
  onViewClassChange: (value: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

const CLASSES = [
  "All Classes",
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Eta",
  "Theta",
  "Iota",
  "Kappa",
  "Lambda",
  "Mu",
  "Nu",
];

export const Sidebar: React.FC<SidebarProps> = ({
  nodeCount,
  edgeCount,
  hideRedacted,
  onHideRedactedChange,
  colorBy,
  onColorByChange,
  viewClass,
  onViewClassChange,
  searchQuery,
  onSearchQueryChange,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Capture Cmd/Ctrl+F globally and focus the sidebar search input
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const isCmdF =
        isMac && event.metaKey && (event.key === "f" || event.key === "F");
      const isCtrlF =
        !isMac && event.ctrlKey && (event.key === "f" || event.key === "F");

      if (isCmdF || isCtrlF) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="absolute p-4 top-0 left-0 h-full w-96 z-50 pointer-events-none">
      <div className="h-full w-full bg-white/50 backdrop-blur-md border border-gray-300 rounded-xl shadow-lg pointer-events-auto p-4 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">∆KE</h2>

        {/* Stats */}
        <div className="text-sm text-gray-600 mb-4">
          <p className="mb-1">Total Brothers: {nodeCount}</p>
          <p>Total Connections: {edgeCount}</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search brothers..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Fuzzy search by name. Non-matching brothers are faded.
          </p>
        </div>

        <div className="space-y-6">
          {/* Hide Redacted Toggle */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideRedacted}
                onChange={(e) => onHideRedactedChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Hide Redacted</span>
            </label>
          </div>

          {/* Color By */}
          <div>
            <label className="block text-sm font-medium mb-2">Color By</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorBy"
                  value="class"
                  checked={colorBy === "class"}
                  onChange={(e) =>
                    onColorByChange(e.target.value as "class" | "family")
                  }
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Class</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="colorBy"
                  value="family"
                  checked={colorBy === "family"}
                  onChange={(e) =>
                    onColorByChange(e.target.value as "class" | "family")
                  }
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Family</span>
              </label>
            </div>
          </div>

          {/* View Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-2">View</label>
            <select
              value={viewClass}
              onChange={(e) => onViewClassChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {CLASSES.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

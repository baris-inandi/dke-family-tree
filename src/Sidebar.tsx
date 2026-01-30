import React from "react";

interface SidebarProps {
  hideRedacted: boolean;
  onHideRedactedChange: (value: boolean) => void;
  colorBy: "class" | "family";
  onColorByChange: (value: "class" | "family") => void;
  viewClass: string;
  onViewClassChange: (value: string) => void;
  availableClasses: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  resultCount: number;
  onClearFilters: () => void;
  eboardSemesterOptions: string[];
  eboardPositionOptions: string[];
  eboardSemesterFilter: string;
  eboardPositionFilter: string;
  onEboardSemesterChange: (value: string) => void;
  onEboardPositionChange: (value: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  hideRedacted,
  onHideRedactedChange,
  colorBy,
  onColorByChange,
  viewClass,
  onViewClassChange,
  availableClasses,
  searchQuery,
  onSearchQueryChange,
  resultCount,
  onClearFilters,
  eboardSemesterOptions,
  eboardPositionOptions,
  eboardSemesterFilter,
  eboardPositionFilter,
  onEboardSemesterChange,
  onEboardPositionChange,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Capture Cmd/Ctrl+F globally and focus the sidebar search input
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
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
    <div className="absolute p-4 top-0 left-0 h-full max-w-80 z-50 pointer-events-none">
      <div className="h-fit w-full bg-white/60 backdrop-blur-xl border border-neutral-400 rounded-xl shadow-xl pointer-events-auto p-4 overflow-y-auto flex flex-col">
        <h2 className="text-xl font-bold mb-4">Our Brothers</h2>

        {/* Search */}
        <div className="mb-6">
          <div className="flex items-center gap-2 border border-neutral-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <input
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search brothers..."
              className="flex-1 min-w-0 px-3 py-1.5 border-0 bg-transparent focus:outline-none focus:ring-0 text-sm rounded-lg"
            />
            <kbd
              className="shrink-0 pr-2 text-sm font-medium text-neutral-500 select-none"
              title="Focus search"
            >
              {typeof navigator !== "undefined" &&
              navigator.userAgent.toLowerCase().includes("mac")
                ? "⌘F"
                : "Ctrl+F"}
            </kbd>
          </div>
          <p className="mt-1 pl-1 text-xs leading-tight text-neutral-500">
            Search brothers by name. Non-matching brothers are faded.
          </p>
        </div>

        <div className="space-y-4 flex-1">
          {/* Color By */}
          <div className="flex items-center gap-4">
            <p className="text-sm text-nowrap">Color By:</p>
            <div className="flex flex-1 min-w-0 border border-neutral-300 rounded-lg">
              <button
                type="button"
                onClick={() => onColorByChange("class")}
                className={`w-full px-3 py-1.5 text-sm rounded-l-lg cursor-pointer ${
                  colorBy === "class"
                    ? "bg-neutral-200 font-medium"
                    : "hover:bg-neutral-100 text-neutral-400"
                }`}
              >
                Class
              </button>
              <button
                type="button"
                onClick={() => onColorByChange("family")}
                className={`w-full px-3 py-1.5 text-sm rounded-r-lg cursor-pointer ${
                  colorBy === "family"
                    ? "bg-neutral-200 font-medium"
                    : "hover:bg-neutral-100 text-neutral-400"
                }`}
              >
                Family
              </button>
            </div>
          </div>

          {/* View + Eboard dropdowns */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <p className="text-nowrap">View class:</p>
              <select
                value={viewClass}
                onChange={(e) => onViewClassChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {["All Classes", ...availableClasses].map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-nowrap">Eboard semester:</p>
              <select
                id="eboard-semester"
                value={eboardSemesterFilter}
                onChange={(e) => onEboardSemesterChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="No Filter">No Filter</option>
                {eboardSemesterOptions.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-nowrap">Eboard position:</p>
              <select
                id="eboard-position"
                value={eboardPositionFilter}
                onChange={(e) => onEboardPositionChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="No Filter">No Filter</option>
                <option value="Any Position">Any Position</option>
                {eboardPositionOptions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Hide Redacted Toggle */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hideRedacted}
                onChange={(e) => onHideRedactedChange(e.target.checked)}
                className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Exclude Redacted</span>
            </label>
          </div>
        </div>

        {/* Result count */}
        <div className="mt-4 pt-3 border-t border-neutral-200 text-xs text-neutral-700">
          {resultCount} brothers found based on your filters.
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-1.5 bg-neutral-200 cursor-pointer hover:bg-neutral-300 text-neutral-800 rounded-lg text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

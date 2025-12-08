export interface Brother {
  id: string;
  info: Record<string, string | { byFamily: Color; byClass: Color }>; // All schema fields + colors
  children: Brother[];
}

export interface ParsedLine {
  indent: number;
  [key: string]: string | number; // based on @def schema
}

export interface Color {
  foreground: string;
  background: string;
}

export interface FinalCompiledOutput {
  tree: Brother[];
  metadata: {
    allClasses: string[];
  };
}

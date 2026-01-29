export interface Brother {
  id: string;
  info: Record<string, string>;
  colors: { byFamily: Color; byClass: Color };
  children: Brother[];
}

export interface ParsedLine {
  indent: number;
  [key: string]: string | number; // keys from @SCHEMA (e.g. name, class, eboard)
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

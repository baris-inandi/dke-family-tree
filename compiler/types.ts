import type { BrotherEboardHistory } from "./src/Eboard.js";

export interface BrotherInfo {
  name: string;
  class: string;
  eboard: BrotherEboardHistory;
}

export interface Brother {
  id: string;
  info: BrotherInfo;
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
    eboard: {
      bySemester: Record<string, Record<string, string>>;
      byPosition: Record<string, Record<string, string>>;
    };
    mostRecentSemester: string;
  };
}

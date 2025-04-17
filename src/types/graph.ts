export interface Node {
  id: string;
  x?: number;
  y?: number;
}

export interface Edge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  links: Edge[];
} 
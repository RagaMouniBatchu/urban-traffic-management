import React, { useCallback, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Node, Edge, GraphData } from '../types/graph';

// Generate initial nodes (50 nodes)
const generateInitialNodes = (): Node[] => {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `node${i + 1}`,
  }));
};

// Generate initial edges (at least 49 edges)
const generateInitialEdges = (nodes: Node[]): Edge[] => {
  const edges: Edge[] = [];
  
  // First, connect all nodes in sequence to ensure connectivity
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      weight: Math.floor(Math.random() * 10) + 1, // Random weight between 1-10
    });
  }

  // Add some random additional edges
  for (let i = 0; i < 10; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)].id;
    const target = nodes[Math.floor(Math.random() * nodes.length)].id;
    if (source !== target) {
      edges.push({
        source,
        target,
        weight: Math.floor(Math.random() * 10) + 1,
      });
    }
  }

  return edges;
};

const Graph = () => {
  const [graphData, setGraphData] = useState<GraphData>(() => {
    const nodes = generateInitialNodes();
    const links = generateInitialEdges(nodes);
    return { nodes, links };
  });

  const handleAddEdge = useCallback(() => {
    const source = prompt('Enter source node ID:');
    const target = prompt('Enter target node ID:');
    const weightStr = prompt('Enter edge weight:');

    if (source && target && weightStr) {
      const weight = parseInt(weightStr);
      if (!isNaN(weight)) {
        setGraphData(prev => ({
          nodes: [...prev.nodes],
          links: [...prev.links, { source, target, weight }],
        }));
      }
    }
  }, []);

  const handleRemoveEdge = useCallback(() => {
    const source = prompt('Enter source node ID:');
    const target = prompt('Enter target node ID:');

    if (source && target) {
      setGraphData(prev => ({
        nodes: [...prev.nodes],
        links: prev.links.filter(
          link => !(link.source === source && link.target === target)
        ),
      }));
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
        <button onClick={handleAddEdge}>Add Edge</button>
        <button onClick={handleRemoveEdge} style={{ marginLeft: 10 }}>
          Remove Edge
        </button>
      </div>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        linkLabel={link => `Weight: ${(link as Edge).weight}`}
        nodeColor={() => '#1f77b4'}
        linkColor={() => '#999'}
        nodeRelSize={6}
      />
    </div>
  );
};

export default Graph; 
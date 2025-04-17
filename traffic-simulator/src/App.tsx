import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

interface Node {
  id: string;
  x?: number;
  y?: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: Node[];
  links: Edge[];
}

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

function App() {
  const [graphData, setGraphData] = React.useState<GraphData>(() => {
    const nodes = generateInitialNodes();
    const links = generateInitialEdges(nodes);
    return { nodes, links };
  });

  const handleAddEdge = React.useCallback(() => {
    const source = prompt('Enter source node ID (e.g., node1):');
    const target = prompt('Enter target node ID (e.g., node2):');
    const weightStr = prompt('Enter edge weight (1-10):');

    if (source && target && weightStr) {
      const weight = parseInt(weightStr);
      if (!isNaN(weight) && weight >= 1 && weight <= 10) {
        setGraphData(prev => ({
          nodes: [...prev.nodes],
          links: [...prev.links, { source, target, weight }],
        }));
      } else {
        alert('Please enter a valid weight between 1 and 10');
      }
    }
  }, []);

  const handleRemoveEdge = React.useCallback(() => {
    const source = prompt('Enter source node ID (e.g., node1):');
    const target = prompt('Enter target node ID (e.g., node2):');

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
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
        <button 
          onClick={handleAddEdge}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Edge
        </button>
        <button 
          onClick={handleRemoveEdge}
          style={{
            padding: '8px 16px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Remove Edge
        </button>
      </div>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        linkLabel={(link) => `Weight: ${(link as Edge).weight}`}
        nodeColor={() => '#1f77b4'}
        linkColor={() => '#999'}
        nodeRelSize={6}
        linkWidth={2}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
      />
    </div>
  );
}

export default App;

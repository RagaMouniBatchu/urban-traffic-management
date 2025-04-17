import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

interface Node {
  id: string;
  x?: number;
  y?: number;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  weight: number;
}

interface GraphData {
  nodes: Node[];
  links: Edge[];
}

// Dijkstra's Algorithm Implementation
interface DijkstraResult {
  distances: { [key: string]: number };
  previousNodes: { [key: string]: string | null };
}

const findShortestPath = (
  nodes: Node[],
  edges: Edge[],
  startNodeId: string,
  endNodeId: string
): { path: string[]; totalWeight: number } | null => {
  // Create adjacency list
  const graph: { [key: string]: { node: string; weight: number }[] } = {};
  nodes.forEach(node => {
    graph[node.id] = [];
  });

  edges.forEach(edge => {
    const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
    const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
    graph[sourceId].push({ node: targetId, weight: edge.weight });
    graph[targetId].push({ node: sourceId, weight: edge.weight }); // For undirected graph
  });

  // Initialize distances and previous nodes
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const unvisited = new Set<string>();

  nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minDistance = Infinity;
    let current = '';
    unvisited.forEach(nodeId => {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        current = nodeId;
      }
    });

    if (current === '' || current === endNodeId) break;
    unvisited.delete(current);

    // Update distances to neighbors
    graph[current].forEach(neighbor => {
      if (unvisited.has(neighbor.node)) {
        const newDistance = distances[current] + neighbor.weight;
        if (newDistance < distances[neighbor.node]) {
          distances[neighbor.node] = newDistance;
          previous[neighbor.node] = current;
        }
      }
    });
  }

  // Reconstruct path
  if (distances[endNodeId] === Infinity) return null;

  const path: string[] = [];
  let current = endNodeId;
  while (current !== null) {
    path.unshift(current);
    current = previous[current]!;
  }

  return { path, totalWeight: distances[endNodeId] };
};

// Generate initial nodes (50 nodes)
const generateInitialNodes = (): Node[] => {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `node${i + 1}`,
  }));
};

// Generate random weight
const generateWeight = (): number => {
  return Math.floor(Math.random() * 10) + 1;
};

// Generate initial edges (at least 49 edges)
const generateInitialEdges = (nodes: Node[]): Edge[] => {
  const edges: Edge[] = [];
  
  // First, connect all nodes in sequence to ensure connectivity
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      source: nodes[i],
      target: nodes[i + 1],
      weight: generateWeight(),
    });
  }

  // Add some random additional edges
  for (let i = 0; i < 10; i++) {
    const source = nodes[Math.floor(Math.random() * nodes.length)];
    const target = nodes[Math.floor(Math.random() * nodes.length)];
    if (source.id !== target.id) {
      edges.push({
        source,
        target,
        weight: generateWeight(),
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

  const [shortestPathInfo, setShortestPathInfo] = React.useState<{
    path: string[];
    totalWeight: number;
  } | null>(null);

  const handleAddEdge = React.useCallback(() => {
    const sourceId = prompt('Enter source node number (1-50):');
    const targetId = prompt('Enter target node number (1-50):');

    if (sourceId && targetId) {
      const sourceNode = graphData.nodes.find(n => n.id === `node${sourceId}`);
      const targetNode = graphData.nodes.find(n => n.id === `node${targetId}`);

      if (sourceNode && targetNode) {
        setGraphData(prev => ({
          nodes: [...prev.nodes],
          links: [...prev.links, { 
            source: sourceNode,
            target: targetNode,
            weight: generateWeight() 
          }],
        }));
      } else {
        alert('Please enter valid node numbers between 1 and 50');
      }
    }
  }, [graphData.nodes]);

  const handleRemoveEdge = React.useCallback(() => {
    const sourceId = prompt('Enter source node number (1-50):');
    const targetId = prompt('Enter target node number (1-50):');

    if (sourceId && targetId) {
      const sourceNodeId = `node${sourceId}`;
      const targetNodeId = `node${targetId}`;

      setGraphData(prev => ({
        nodes: [...prev.nodes],
        links: prev.links.filter(link => {
          const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
          const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
          return !(linkSource === sourceNodeId && linkTarget === targetNodeId);
        }),
      }));
    }
  }, []);

  const handleFindPath = React.useCallback(() => {
    const sourceId = prompt('Enter source node number (1-50):');
    const targetId = prompt('Enter target node number (1-50):');

    if (sourceId && targetId) {
      const sourceNodeId = `node${sourceId}`;
      const targetNodeId = `node${targetId}`;

      const result = findShortestPath(
        graphData.nodes,
        graphData.links,
        sourceNodeId,
        targetNodeId
      );

      if (result) {
        setShortestPathInfo(result);
      } else {
        alert('No path exists between these nodes');
        setShortestPathInfo(null);
      }
    }
  }, [graphData]);

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
            marginRight: '10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Remove Edge
        </button>
        <button 
          onClick={handleFindPath}
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Find Shortest Path
        </button>
      </div>
      {shortestPathInfo && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 60, 
            left: 10, 
            zIndex: 1,
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '4px',
            color: 'white',
            maxWidth: '300px'
          }}
        >
          <h3 style={{ marginBottom: '10px', color: '#2196F3' }}>Shortest Path:</h3>
          <p style={{ marginBottom: '5px' }}>
            Path: {shortestPathInfo.path.map(node => node.replace('node', '')).join(' → ')}
          </p>
          <p>Total Weight: {shortestPathInfo.totalWeight}</p>
        </div>
      )}
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        nodeColor={(node) => {
          if (shortestPathInfo && shortestPathInfo.path.includes(node.id)) {
            return '#2196F3';
          }
          return '#1f77b4';
        }}
        linkColor={(link) => {
          if (shortestPathInfo) {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const isInPath = shortestPathInfo.path.some((nodeId, index) => {
              const nextNodeId = shortestPathInfo.path[index + 1];
              return (nodeId === sourceId && nextNodeId === targetId) ||
                     (nodeId === targetId && nextNodeId === sourceId);
            });
            return isInPath ? '#4CAF50' : '#555';
          }
          return '#555';
        }}
        nodeRelSize={6}
        linkWidth={(link) => {
          if (shortestPathInfo) {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const isInPath = shortestPathInfo.path.some((nodeId, index) => {
              const nextNodeId = shortestPathInfo.path[index + 1];
              return (nodeId === sourceId && nextNodeId === targetId) ||
                     (nodeId === targetId && nextNodeId === sourceId);
            });
            return isInPath ? 4 : 1;
          }
          return 1;
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id.replace('node', '');
          const fontSize = 12/globalScale;
          const isInPath = shortestPathInfo && shortestPathInfo.path.includes(node.id);
          const nodeR = isInPath ? 10 : 8; // Larger radius for path nodes

          // Draw outer glow for path nodes
          if (isInPath) {
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeR + 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
            ctx.fill();
          }

          // Draw circle
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, nodeR, 0, 2 * Math.PI);
          ctx.fillStyle = isInPath ? '#2196F3' : '#1f77b4';
          ctx.fill();

          // Draw text
          ctx.font = `${isInPath ? 'bold ' : ''}${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          ctx.fillText(label, node.x!, node.y!);
        }}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={(link, ctx, globalScale) => {
          const start = link.source as Node;
          const end = link.target as Node;
          
          // Determine if this link is part of the shortest path
          const isInPath = shortestPathInfo && shortestPathInfo.path.some((nodeId, index) => {
            const nextNodeId = shortestPathInfo.path[index + 1];
            return (nodeId === start.id && nextNodeId === end.id) ||
                   (nodeId === end.id && nextNodeId === start.id);
          });

          // Draw the line with glow effect for path
          if (isInPath) {
            // Draw glow
            ctx.beginPath();
            ctx.moveTo(start.x!, start.y!);
            ctx.lineTo(end.x!, end.y!);
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.lineWidth = 8;
            ctx.stroke();
          }

          // Draw the main line
          ctx.beginPath();
          ctx.moveTo(start.x!, start.y!);
          ctx.lineTo(end.x!, end.y!);
          ctx.strokeStyle = isInPath ? '#4CAF50' : '#555';
          ctx.lineWidth = isInPath ? 4 : 1;
          ctx.stroke();

          // Draw weight with background for better visibility
          const middleX = (start.x! + end.x!) / 2;
          const middleY = (start.y! + end.y!) / 2;
          const weight = (link as Edge).weight.toString();
          const fontSize = isInPath ? 14/globalScale : 12/globalScale;
          ctx.font = `${isInPath ? 'bold ' : ''}${fontSize}px Sans-Serif`;
          
          // Add background rectangle
          const textMetrics = ctx.measureText(weight);
          const padding = fontSize * 0.3;
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(
            middleX - textMetrics.width/2 - padding,
            middleY - fontSize/2 - padding/2,
            textMetrics.width + padding * 2,
            fontSize + padding
          );

          // Draw weight text
          ctx.fillStyle = isInPath ? '#4CAF50' : '#ffd700';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(weight, middleX, middleY);
        }}
        linkCanvasObjectMode={() => 'after'}
      />
    </div>
  );
}

export default App; 
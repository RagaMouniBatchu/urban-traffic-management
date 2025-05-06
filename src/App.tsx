import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './App.css';

interface Node {
  id: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
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

// Generate initial nodes (50 nodes) in an organic layout
const generateInitialNodes = (): Node[] => {
  const nodes: Node[] = [];
  const centerX = 0;
  const centerY = 0;
  const radius = 300; // Maximum radius from center

  // Create main hub nodes
  const hubNodes = 5;
  for (let i = 0; i < hubNodes; i++) {
    const angle = (2 * Math.PI * i) / hubNodes;
    const x = centerX + (radius * 0.4 * Math.cos(angle));
    const y = centerY + (radius * 0.4 * Math.sin(angle));
    nodes.push({
      id: `node${i + 1}`,
      x: x,
      y: y,
      fx: x,
      fy: y
    });
  }

  // Create nodes around hubs with some randomness
  let nodeId = hubNodes + 1;
  const hubRadii = [0.6, 0.8, 1]; // Different distance multipliers from hubs

  while (nodes.length < 50) {
    const hubIndex = Math.floor(Math.random() * hubNodes);
    const hubNode = nodes[hubIndex];
    const radiusMultiplier = hubRadii[Math.floor(Math.random() * hubRadii.length)];
    const angle = Math.random() * 2 * Math.PI;
    const distance = radius * radiusMultiplier * (0.3 + Math.random() * 0.7); // Random distance from hub
    
    // Add some randomness to position
    const randomOffset = (Math.random() - 0.5) * 50;
    const x = hubNode.x! + distance * Math.cos(angle) + randomOffset;
    const y = hubNode.y! + distance * Math.sin(angle) + randomOffset;

    // Check if position is too close to existing nodes
    const tooClose = nodes.some(node => {
      const dx = node.x! - x;
      const dy = node.y! - y;
      return Math.sqrt(dx * dx + dy * dy) < 50; // Minimum distance between nodes
    });

    if (!tooClose) {
      nodes.push({
        id: `node${nodeId}`,
        x: x,
        y: y,
        fx: x,
        fy: y
      });
      nodeId++;
    }
  }

  return nodes;
};

// Generate random weight
const generateWeight = (): number => {
  return Math.floor(Math.random() * 30) + 1;
};

// Generate initial edges with more organic connections
const generateInitialEdges = (nodes: Node[]): Edge[] => {
  const edges: Edge[] = [];
  const addedEdges = new Set<string>();

  // Helper function to add edge if not already added
  const tryAddEdge = (source: Node, target: Node) => {
    const edgeKey = `${source.id}-${target.id}`;
    const reverseEdgeKey = `${target.id}-${source.id}`;
    
    if (!addedEdges.has(edgeKey) && !addedEdges.has(reverseEdgeKey)) {
      edges.push({
        source,
        target,
        weight: generateWeight()
      });
      addedEdges.add(edgeKey);
      return true;
    }
    return false;
  };

  // Connect each node to its nearest neighbors
  nodes.forEach((node) => {
    // Calculate distances to all other nodes
    const distances = nodes
      .filter(n => n.id !== node.id)
      .map(n => ({
        node: n,
        distance: Math.sqrt(
          Math.pow((n.x! - node.x!), 2) + 
          Math.pow((n.y! - node.y!), 2)
        )
      }))
      .sort((a, b) => a.distance - b.distance);

    // Connect to 2-4 nearest neighbors
    const connectCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < Math.min(connectCount, distances.length); i++) {
      tryAddEdge(node, distances[i].node);
    }
  });

  // Add some random long-distance connections (like highways)
  const longDistanceConnections = 10;
  for (let i = 0; i < longDistanceConnections; i++) {
    const sourceIndex = Math.floor(Math.random() * nodes.length);
    const targetIndex = Math.floor(Math.random() * nodes.length);
    
    if (sourceIndex !== targetIndex) {
      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];
      tryAddEdge(source, target);
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

  const [hoveredLink, setHoveredLink] = React.useState<Edge | null>(null);
  const [shortestPathInfo, setShortestPathInfo] = React.useState<{
    path: string[];
    totalWeight: number;
  } | null>(null);
  const [isSelectingNodes, setIsSelectingNodes] = React.useState(false);
  const [selectedNodes, setSelectedNodes] = React.useState<Set<string>>(new Set());
  const [newNodeId, setNewNodeId] = React.useState<string | null>(null);

  const handleAddNewNode = React.useCallback(() => {
    // Clear shortest path info
    setShortestPathInfo(null);
    
    // Find the next available node number
    const existingNodeNumbers = new Set(
      graphData.nodes.map(node => parseInt(node.id.replace('node', '')))
    );
    let nextNodeNumber = 1;
    while (existingNodeNumbers.has(nextNodeNumber)) {
      nextNodeNumber++;
    }

    // Generate position for new node
    const centerX = 0;
    const centerY = 0;
    const angle = Math.random() * 2 * Math.PI;
    const distance = 200 + Math.random() * 100;
    const newX = centerX + distance * Math.cos(angle);
    const newY = centerY + distance * Math.sin(angle);

    // Create new node
    const newNode: Node = {
      id: `node${nextNodeNumber}`,
      x: newX,
      y: newY,
      fx: newX,
      fy: newY
    };

    // Add node to graph
    setGraphData(prev => ({
      nodes: [...prev.nodes, newNode],
      links: prev.links
    }));

    // Start node selection mode
    setNewNodeId(newNode.id);
    setIsSelectingNodes(true);
    setSelectedNodes(new Set());
  }, [graphData.nodes]);

  const handleNodeClick = React.useCallback((node: Node) => {
    if (isSelectingNodes && newNodeId) {
      setSelectedNodes(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(node.id)) {
          newSelected.delete(node.id);
        } else {
          newSelected.add(node.id);
        }
        return newSelected;
      });
    }
  }, [isSelectingNodes, newNodeId]);

  const handleDoneSelection = React.useCallback(() => {
    if (!newNodeId || selectedNodes.size === 0) {
      alert('Please select at least one node to connect with');
      return;
    }

    // Clear shortest path info
    setShortestPathInfo(null);

    // Create edges with random weights
    const newEdges: Edge[] = Array.from(selectedNodes).map(targetId => ({
      source: newNodeId,
      target: targetId,
      weight: generateWeight()
    }));

    // Update graph with new edges
    setGraphData(prev => ({
      nodes: prev.nodes,
      links: [...prev.links, ...newEdges]
    }));

    // Reset selection mode
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
  }, [newNodeId, selectedNodes]);

  const handleCancelSelection = React.useCallback(() => {
    // Clear shortest path info
    setShortestPathInfo(null);
    
    if (newNodeId) {
      // Remove the newly added node
      setGraphData(prev => ({
        nodes: prev.nodes.filter(node => node.id !== newNodeId),
        links: prev.links
      }));
    }
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
  }, [newNodeId]);

  const handleAddEdge = React.useCallback(() => {
    // Clear shortest path info
    setShortestPathInfo(null);
    
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
    // Clear shortest path info
    setShortestPathInfo(null);
    
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
          // Check both directions since it's an undirected graph
          return !((linkSource === sourceNodeId && linkTarget === targetNodeId) ||
                  (linkSource === targetNodeId && linkTarget === sourceNodeId));
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

  const handleModifyWeight = React.useCallback(() => {
    const sourceId = prompt('Enter source node number (1-50):');
    const targetId = prompt('Enter target node number (1-50):');
    
    if (sourceId && targetId) {
      const sourceNodeId = `node${sourceId}`;
      const targetNodeId = `node${targetId}`;
      
      // Find the edge
      const edge = graphData.links.find(link => {
        const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
        const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
        return (linkSource === sourceNodeId && linkTarget === targetNodeId) ||
               (linkSource === targetNodeId && linkTarget === sourceNodeId);
      });

      if (edge) {
        const newWeight = prompt('Enter new weight:');
        if (newWeight) {
          const weight = parseInt(newWeight);
          if (!isNaN(weight) && weight > 0) {
            setGraphData(prev => ({
              nodes: [...prev.nodes],
              links: prev.links.map(link => {
                const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
                const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
                if ((linkSource === sourceNodeId && linkTarget === targetNodeId) ||
                    (linkSource === targetNodeId && linkTarget === sourceNodeId)) {
                  return { ...link, weight };
                }
                return link;
              })
            }));
            // Clear shortest path info when weight is modified
            setShortestPathInfo(null);
          } else {
            alert('Please enter edge weight');
          }
        }
      } else {
        alert('No edge exists between these nodes');
      }
    }
  }, [graphData.links]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
        <button 
          onClick={handleAddNewNode}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add New Node
        </button>
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
          onClick={handleModifyWeight}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            background: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Modify Weight
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
      {isSelectingNodes && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 10,
          zIndex: 1,
          background: 'rgba(0,0,0,0.8)',
          padding: '15px',
          borderRadius: '4px',
          color: 'white',
          maxWidth: '300px'
        }}>
          <h3 style={{ marginBottom: '10px', color: '#9C27B0' }}>
            Select nodes to connect with Node {newNodeId?.replace('node', '')}
          </h3>
          <p style={{ marginBottom: '10px' }}>
            Click on nodes to select/deselect them
          </p>
          <p style={{ marginBottom: '15px' }}>
            Selected nodes: {Array.from(selectedNodes).map(id => id.replace('node', '')).join(', ')}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDoneSelection}
              style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
            <button
              onClick={handleCancelSelection}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {shortestPathInfo && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
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
        linkLabel={(link) => `Weight: ${(link as Edge).weight}`}
        nodeColor={(node) => {
          if (shortestPathInfo && shortestPathInfo.path.includes(node.id)) {
            return '#2196F3';
          }
          if (isSelectingNodes && selectedNodes.has(node.id)) {
            return '#4CAF50';
          }
          if (node.id === newNodeId) {
            return '#9C27B0';
          }
          return '#1f77b4';
        }}
        linkColor={(link) => {
          if (link === hoveredLink) {
            return '#ffd700';
          }
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
        nodeRelSize={8}
        linkWidth={(link) => {
          if (link === hoveredLink) {
            return 3;
          }
          if (shortestPathInfo) {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const isInPath = shortestPathInfo.path.some((nodeId, index) => {
              const nextNodeId = shortestPathInfo.path[index + 1];
              return (nodeId === sourceId && nextNodeId === targetId) ||
                     (nodeId === targetId && nextNodeId === sourceId);
            });
            return isInPath ? 2 : 1;
          }
          return 1;
        }}
        onLinkHover={setHoveredLink}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id.replace('node', '');
          const fontSize = 14/globalScale;
          const isInPath = shortestPathInfo && shortestPathInfo.path.includes(node.id);
          const nodeR = isInPath ? 12 : 10;

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
          
          const isHovered = link === hoveredLink;
          
          // Determine if this link is part of the shortest path
          const isInPath = shortestPathInfo && shortestPathInfo.path.some((nodeId, index) => {
            const nextNodeId = shortestPathInfo.path[index + 1];
            return (nodeId === start.id && nextNodeId === end.id) ||
                   (nodeId === end.id && nextNodeId === start.id);
          });

          // Draw the line with glow effect for path or hover
          if (isInPath || isHovered) {
            // Draw glow
            ctx.beginPath();
            ctx.moveTo(start.x!, start.y!);
            ctx.lineTo(end.x!, end.y!);
            ctx.strokeStyle = isHovered ? 'rgba(255, 215, 0, 0.15)' : 'rgba(76, 175, 80, 0.15)';
            ctx.lineWidth = 6;
            ctx.stroke();
          }

          // Draw the main line
          ctx.beginPath();
          ctx.moveTo(start.x!, start.y!);
          ctx.lineTo(end.x!, end.y!);
          ctx.strokeStyle = isHovered ? '#ffd700' : (isInPath ? '#4CAF50' : '#555');
          ctx.lineWidth = isHovered ? 3 : (isInPath ? 2 : 1);
          ctx.stroke();

          // Draw weight with background for better visibility (only if not hovered)
          if (!isHovered) {
            const middleX = (start.x! + end.x!) / 2;
            const middleY = (start.y! + end.y!) / 2;
            const weight = (link as Edge).weight.toString();
            const fontSize = isInPath ? 14/globalScale : 12/globalScale;
            ctx.font = `${isInPath ? 'bold ' : ''}${fontSize}px Sans-Serif`;
            
            // Add background rectangle
            const textMetrics = ctx.measureText(weight);
            const padding = fontSize * 0.4;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(
              middleX - textMetrics.width/2 - padding,
              middleY - fontSize/2 - padding/2,
              textMetrics.width + padding * 2,
              fontSize + padding
            );

            // Draw weight text
            ctx.fillStyle = isInPath ? '#4CAF50' : '#ffd700';
            ctx.fillText(weight, middleX, middleY);
          }
        }}
        linkCanvasObjectMode={() => 'replace'}
        cooldownTicks={0}
        warmupTicks={0}
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        autoPauseRedraw={false}
        width={window.innerWidth}
        height={window.innerHeight}
      />
    </div>
  );
}

export default App; 
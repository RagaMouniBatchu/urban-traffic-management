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
  const [isAddingEdge, setIsAddingEdge] = React.useState(false);
  const [edgeSourceNode, setEdgeSourceNode] = React.useState<string | null>(null);
  const [edgeTargetNode, setEdgeTargetNode] = React.useState<string | null>(null);
  const [isRemovingEdge, setIsRemovingEdge] = React.useState(false);
  const [removeSourceNode, setRemoveSourceNode] = React.useState<string | null>(null);
  const [removeTargetNode, setRemoveTargetNode] = React.useState<string | null>(null);
  const [isModifyingWeight, setIsModifyingWeight] = React.useState(false);
  const [weightSourceNode, setWeightSourceNode] = React.useState<string | null>(null);
  const [weightTargetNode, setWeightTargetNode] = React.useState<string | null>(null);
  const [isFindingPath, setIsFindingPath] = React.useState(false);
  const [pathSourceNode, setPathSourceNode] = React.useState<string | null>(null);
  const [pathTargetNode, setPathTargetNode] = React.useState<string | null>(null);
  const [newWeight, setNewWeight] = React.useState<string>('');
  const [weightError, setWeightError] = React.useState<string>('');
  const [newNodeHighlight, setNewNodeHighlight] = React.useState<string | null>(null);
  const [newEdgeHighlight, setNewEdgeHighlight] = React.useState<Set<string>>(new Set());
  const [edgeError, setEdgeError] = React.useState<string>('');
  const [removeEdgeError, setRemoveEdgeError] = React.useState<string>('');
  const [weightEdgeHighlight, setWeightEdgeHighlight] = React.useState<Set<string>>(new Set());
  const [modifiedEdgeHighlight, setModifiedEdgeHighlight] = React.useState<Set<string>>(new Set());

  const handleAddNewNode = React.useCallback(() => {
    // Clear all states
    setShortestPathInfo(null);
    setIsAddingEdge(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setIsRemovingEdge(false);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
    setIsModifyingWeight(false);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
    setIsFindingPath(false);
    setPathSourceNode(null);
    setPathTargetNode(null);
    
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
    } else if (isAddingEdge) {
      if (!edgeSourceNode) {
        setEdgeSourceNode(node.id);
        setEdgeError('');
      } else if (node.id !== edgeSourceNode) {
        // Check if edge already exists
        const edgeExists = graphData.links.some(link => {
          const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
          const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
          return (linkSource === edgeSourceNode && linkTarget === node.id) ||
                 (linkSource === node.id && linkTarget === edgeSourceNode);
        });

        if (edgeExists) {
          setEdgeError('An edge already exists between these nodes');
          return;
        }

        // Create the edge
        const newEdge = { 
          source: edgeSourceNode,
          target: node.id,
          weight: generateWeight() 
        };

        // Set highlight for the new edge
        setNewEdgeHighlight(new Set([`${edgeSourceNode}-${node.id}`]));

        // Update graph with new edge
        setGraphData(prev => ({
          nodes: [...prev.nodes],
          links: [...prev.links, newEdge]
        }));

        // Keep menu visible but update target node
        setEdgeTargetNode(node.id);
        setEdgeError('');

        // Clear highlight after 15 seconds
        setTimeout(() => {
          setNewEdgeHighlight(new Set());
        }, 15000);
      }
    } else if (isRemovingEdge) {
      if (!removeSourceNode) {
        setRemoveSourceNode(node.id);
        setRemoveEdgeError('');
      } else if (node.id !== removeSourceNode) {
        // Check if edge exists
        const edgeExists = graphData.links.some(link => {
          const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
          const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
          return (linkSource === removeSourceNode && linkTarget === node.id) ||
                 (linkSource === node.id && linkTarget === removeSourceNode);
        });

        if (!edgeExists) {
          setRemoveEdgeError('No edge exists between these nodes');
          return;
        }

        // Remove the edge
        setGraphData(prev => ({
          nodes: [...prev.nodes],
          links: prev.links.filter(link => {
            const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
            const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
            return !((linkSource === removeSourceNode && linkTarget === node.id) ||
                    (linkSource === node.id && linkTarget === removeSourceNode));
          }),
        }));
        // Keep menu visible but update target node
        setRemoveTargetNode(node.id);
        setRemoveEdgeError('');
      }
    } else if (isModifyingWeight) {
      if (!weightSourceNode) {
        setWeightSourceNode(node.id);
        setWeightError('');
        setWeightEdgeHighlight(new Set());
      } else if (node.id !== weightSourceNode) {
        // Find the edge
        const edge = graphData.links.find(link => {
          const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
          const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
          return (linkSource === weightSourceNode && linkTarget === node.id) ||
                 (linkSource === node.id && linkTarget === weightSourceNode);
        });

        if (edge) {
          setWeightTargetNode(node.id);
          setNewWeight(edge.weight.toString());
          setWeightError('');
          // Set highlight for the selected edge
          setWeightEdgeHighlight(new Set([`${weightSourceNode}-${node.id}`]));
        } else {
          setWeightError('No edge exists between these nodes');
          setWeightEdgeHighlight(new Set());
        }
      }
    } else if (isFindingPath) {
      if (!pathSourceNode) {
        setPathSourceNode(node.id);
      } else if (node.id !== pathSourceNode) {
        // Find shortest path
        const result = findShortestPath(
          graphData.nodes,
          graphData.links,
          pathSourceNode,
          node.id
        );

        if (result) {
          setShortestPathInfo(result);
          // Keep menu visible but update target node
          setPathTargetNode(node.id);
        } else {
          alert('No path exists between these nodes');
        }
      }
    }
  }, [isSelectingNodes, newNodeId, isAddingEdge, edgeSourceNode, isRemovingEdge, removeSourceNode, 
      isModifyingWeight, weightSourceNode, isFindingPath, pathSourceNode, graphData]);

  const handleDoneSelection = React.useCallback(() => {
    if (!newNodeId || selectedNodes.size === 0) {
      alert('Please select at least one node to connect with');
      return;
    }

    // Clear shortest path info
    setShortestPathInfo(null);

    // Generate position for new node
    const centerX = 0;
    const centerY = 0;
    const angle = Math.random() * 2 * Math.PI;
    const distance = 200 + Math.random() * 100;
    const newX = centerX + distance * Math.cos(angle);
    const newY = centerY + distance * Math.sin(angle);

    // Create new node
    const newNode: Node = {
      id: newNodeId,
      x: newX,
      y: newY,
      fx: newX,
      fy: newY
    };

    // Create edges with random weights
    const newEdges: Edge[] = Array.from(selectedNodes).map(targetId => ({
      source: newNodeId,
      target: targetId,
      weight: generateWeight()
    }));

    // Set highlight states before updating graph
    setNewNodeHighlight(newNodeId);
    setNewEdgeHighlight(new Set(newEdges.map(edge => {
      const source = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const target = typeof edge.target === 'object' ? edge.target.id : edge.target;
      return `${source}-${target}`;
    })));

    // Update graph with new node and edges
    setGraphData(prev => ({
      nodes: [...prev.nodes, newNode],
      links: [...prev.links, ...newEdges]
    }));

    // Reset selection mode
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);

    // Clear highlights after 3 seconds
    setTimeout(() => {
      setNewNodeHighlight(null);
      setNewEdgeHighlight(new Set());
    }, 15000);
  }, [newNodeId, selectedNodes]);

  const handleCancelSelection = React.useCallback(() => {
    // Clear shortest path info
    setShortestPathInfo(null);
    
    // Reset selection mode without removing any node
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
    setNewNodeHighlight(null);
    setNewEdgeHighlight(new Set());
  }, [newNodeId]);

  const handleAddEdge = React.useCallback(() => {
    // Clear all states
    setShortestPathInfo(null);
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
    setIsRemovingEdge(false);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
    setIsModifyingWeight(false);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
    setIsFindingPath(false);
    setPathSourceNode(null);
    setPathTargetNode(null);
    
    // Start add edge mode
    setIsAddingEdge(true);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
  }, []);

  const handleCancelAddEdge = React.useCallback(() => {
    setIsAddingEdge(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
  }, []);

  const handleRemoveEdge = React.useCallback(() => {
    // Clear all states
    setShortestPathInfo(null);
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
    setIsAddingEdge(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setIsModifyingWeight(false);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
    setIsFindingPath(false);
    setPathSourceNode(null);
    setPathTargetNode(null);
    
    // Start remove edge mode
    setIsRemovingEdge(true);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
  }, []);

  const handleCancelRemoveEdge = React.useCallback(() => {
    setIsRemovingEdge(false);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
  }, []);

  const handleModifyWeight = React.useCallback(() => {
    // Clear all states
    setShortestPathInfo(null);
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
    setIsAddingEdge(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setIsRemovingEdge(false);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
    setIsFindingPath(false);
    setPathSourceNode(null);
    setPathTargetNode(null);
    
    // Start modify weight mode
    setIsModifyingWeight(true);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
  }, []);

  const handleFindPath = React.useCallback(() => {
    // Clear all states
    setShortestPathInfo(null);
    setIsSelectingNodes(false);
    setSelectedNodes(new Set());
    setNewNodeId(null);
    setIsAddingEdge(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setIsRemovingEdge(false);
    setRemoveSourceNode(null);
    setRemoveTargetNode(null);
    setIsModifyingWeight(false);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
    
    // Start find path mode
    setIsFindingPath(true);
    setPathSourceNode(null);
    setPathTargetNode(null);
  }, []);

  const handleWeightChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string for backspace/editing
    if (value === '' || /^\d*$/.test(value)) {
      setNewWeight(value);
      setWeightError('');
    }
  }, []);

  const handleWeightSubmit = React.useCallback(() => {
    if (!newWeight) {
      setWeightError('Please enter a weight');
      return;
    }

    const weight = parseInt(newWeight);
    if (!isNaN(weight) && weight > 0) {
      // First update the graph
      setGraphData(prev => ({
        nodes: [...prev.nodes],
        links: prev.links.map(link => {
          const linkSource = typeof link.source === 'object' ? link.source.id : link.source;
          const linkTarget = typeof link.target === 'object' ? link.target.id : link.target;
          if ((linkSource === weightSourceNode && linkTarget === weightTargetNode) ||
              (linkSource === weightTargetNode && linkTarget === weightSourceNode)) {
            return { ...link, weight };
          }
          return link;
        })
      }));

      // Then set the highlight
      const edgeKey = `${weightSourceNode}-${weightTargetNode}`;
      setModifiedEdgeHighlight(new Set([edgeKey]));
      
      // Clear the weight input and error
      setNewWeight('');
      setWeightError('');

      // Clear highlight after 15 seconds
      setTimeout(() => {
        setModifiedEdgeHighlight(new Set());
      }, 15000);
    } else {
      setWeightError('Please enter a valid positive number');
    }
  }, [newWeight, weightSourceNode, weightTargetNode]);

  const handleCancelModifyWeight = React.useCallback(() => {
    setIsModifyingWeight(false);
    setWeightSourceNode(null);
    setWeightTargetNode(null);
    setNewWeight('');
    setWeightError('');
    setWeightEdgeHighlight(new Set());
    setModifiedEdgeHighlight(new Set());
  }, []);

  const handleCancelFindPath = React.useCallback(() => {
    setIsFindingPath(false);
    setPathSourceNode(null);
    setPathTargetNode(null);
    setShortestPathInfo(null);
  }, []);

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
      {isAddingEdge && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 10,
          zIndex: 1,
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#4CAF50',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '2px solid #4CAF50',
            paddingBottom: '8px'
          }}>
            Add Edge
          </h3>
          <div style={{ marginBottom: '15px' }}>
            {!edgeSourceNode ? (
              <p style={{ 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#aaa'
              }}>
                Step 1: Select source node
              </p>
            ) : !edgeTargetNode ? (
              <>
                <p style={{ 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#aaa'
                }}>
                  Step 2: Select target node
                </p>
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#4CAF50',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Source: Node {edgeSourceNode.replace('node', '')}
                  </p>
                </div>
                {edgeError && (
                  <p style={{
                    color: '#f44336',
                    fontSize: '14px',
                    margin: '10px 0',
                    padding: '8px',
                    background: 'rgba(244, 67, 54, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                  }}>
                    {edgeError}
                  </p>
                )}
              </>
            ) : (
              <div style={{
                background: 'rgba(76, 175, 80, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                marginBottom: '15px'
              }}>
                <p style={{ 
                  margin: '0 0 8px 0', 
                  color: '#4CAF50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Source: Node {edgeSourceNode.replace('node', '')}
                </p>
                <p style={{ 
                  margin: 0, 
                  color: '#4CAF50',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Target: Node {edgeTargetNode.replace('node', '')}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleCancelAddEdge}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {isRemovingEdge && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 10,
          zIndex: 1,
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#f44336',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '2px solid #f44336',
            paddingBottom: '8px'
          }}>
            Remove Edge
          </h3>
          <div style={{ marginBottom: '15px' }}>
            {!removeSourceNode ? (
              <p style={{ 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#aaa'
              }}>
                Step 1: Select source node
              </p>
            ) : !removeTargetNode ? (
              <>
                <p style={{ 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#aaa'
                }}>
                  Step 2: Select target node
                </p>
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#f44336',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Source: Node {removeSourceNode.replace('node', '')}
                  </p>
                </div>
                {removeEdgeError && (
                  <p style={{
                    color: '#f44336',
                    fontSize: '14px',
                    margin: '10px 0',
                    padding: '8px',
                    background: 'rgba(244, 67, 54, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                  }}>
                    {removeEdgeError}
                  </p>
                )}
              </>
            ) : (
              <div style={{
                background: 'rgba(244, 67, 54, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                marginBottom: '15px'
              }}>
                <p style={{ 
                  margin: '0 0 8px 0', 
                  color: '#f44336',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Source: Node {removeSourceNode.replace('node', '')}
                </p>
                <p style={{ 
                  margin: 0, 
                  color: '#f44336',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Target: Node {removeTargetNode.replace('node', '')}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleCancelRemoveEdge}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {isModifyingWeight && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 10,
          zIndex: 1,
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#ff9800',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '2px solid #ff9800',
            paddingBottom: '8px'
          }}>
            Modify Weight
          </h3>
          <div style={{ marginBottom: '15px' }}>
            {!weightSourceNode ? (
              <p style={{ 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#aaa'
              }}>
                Step 1: Select source node
              </p>
            ) : !weightTargetNode ? (
              <>
                <p style={{ 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#aaa'
                }}>
                  Step 2: Select target node
                </p>
                <div style={{
                  background: 'rgba(255, 152, 0, 0.1)',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#ff9800',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Source: Node {weightSourceNode.replace('node', '')}
                  </p>
                </div>
                {weightError && (
                  <p style={{
                    color: '#f44336',
                    fontSize: '14px',
                    margin: '10px 0',
                    padding: '8px',
                    background: 'rgba(244, 67, 54, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                  }}>
                    {weightError}
                  </p>
                )}
              </>
            ) : (
              <>
                <div style={{
                  background: 'rgba(255, 152, 0, 0.1)',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    color: '#ff9800',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Source: Node {weightSourceNode.replace('node', '')}
                  </p>
                  <p style={{ 
                    margin: '0 0 15px 0', 
                    color: '#ff9800',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Target: Node {weightTargetNode.replace('node', '')}
                  </p>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '5px',
                      color: '#aaa',
                      fontSize: '14px'
                    }}>
                      Enter new weight:
                    </label>
                    <input
                      type="text"
                      value={newWeight}
                      onChange={handleWeightChange}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: weightError ? '1px solid #f44336' : '1px solid rgba(255, 152, 0, 0.3)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px'
                      }}
                      placeholder="Enter weight"
                    />
                    {weightError && (
                      <p style={{
                        color: '#f44336',
                        fontSize: '12px',
                        margin: '5px 0 0 0'
                      }}>
                        {weightError}
                      </p>
                    )}
                    <button
                      onClick={handleWeightSubmit}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        background: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginTop: '10px'
                      }}
                    >
                      Update Weight
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleCancelModifyWeight}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {isFindingPath && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 10,
          zIndex: 1,
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          maxWidth: '300px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#2196F3',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '2px solid #2196F3',
            paddingBottom: '8px'
          }}>
            Find Shortest Path
          </h3>
          <div style={{ marginBottom: '15px' }}>
            {!pathSourceNode ? (
              <p style={{ 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#aaa'
              }}>
                Step 1: Select source node
              </p>
            ) : !pathTargetNode ? (
              <>
                <p style={{ 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#aaa'
                }}>
                  Step 2: Select target node
                </p>
                <div style={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#2196F3',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}>
                    Source: Node {pathSourceNode.replace('node', '')}
                  </p>
                </div>
              </>
            ) : (
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                marginBottom: '15px'
              }}>
                <p style={{ 
                  margin: '0 0 8px 0', 
                  color: '#2196F3',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Source: Node {pathSourceNode.replace('node', '')}
                </p>
                <p style={{ 
                  margin: 0, 
                  color: '#2196F3',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Target: Node {pathTargetNode.replace('node', '')}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleCancelFindPath}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
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
          if (isAddingEdge && node.id === edgeSourceNode) {
            return '#4CAF50';
          }
          if (isRemovingEdge && node.id === removeSourceNode) {
            return '#f44336';
          }
          if (isModifyingWeight && node.id === weightSourceNode) {
            return '#ff9800';
          }
          if (isFindingPath && node.id === pathSourceNode) {
            return '#2196F3';
          }
          if (newNodeHighlight === node.id) {
            return '#9C27B0';
          }
          return '#1f77b4';
        }}
        linkColor={(link) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          const edgeKey = `${sourceId}-${targetId}`;
          const reverseEdgeKey = `${targetId}-${sourceId}`;

          if (link === hoveredLink) {
            return '#ffd700';
          }
          if (shortestPathInfo) {
            const isInPath = shortestPathInfo.path.some((nodeId, index) => {
              const nextNodeId = shortestPathInfo.path[index + 1];
              return (nodeId === sourceId && nextNodeId === targetId) ||
                     (nodeId === targetId && nextNodeId === sourceId);
            });
            return isInPath ? '#4CAF50' : '#555';
          }
          if (newEdgeHighlight.has(edgeKey) || newEdgeHighlight.has(reverseEdgeKey)) {
            return '#9C27B0';
          }
          if (modifiedEdgeHighlight.has(edgeKey) || modifiedEdgeHighlight.has(reverseEdgeKey)) {
            return '#9C27B0';
          }
          if (weightEdgeHighlight.has(edgeKey) || weightEdgeHighlight.has(reverseEdgeKey)) {
            return '#ff9800';
          }
          return '#555';
        }}
        nodeRelSize={8}
        linkWidth={(link) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          const edgeKey = `${sourceId}-${targetId}`;
          const reverseEdgeKey = `${targetId}-${sourceId}`;

          if (link === hoveredLink) {
            return 3;
          }
          if (shortestPathInfo) {
            const isInPath = shortestPathInfo.path.some((nodeId, index) => {
              const nextNodeId = shortestPathInfo.path[index + 1];
              return (nodeId === sourceId && nextNodeId === targetId) ||
                     (nodeId === targetId && nextNodeId === sourceId);
            });
            return isInPath ? 2 : 1;
          }
          if (newEdgeHighlight.has(edgeKey) || newEdgeHighlight.has(reverseEdgeKey)) {
            return 3;
          }
          if (modifiedEdgeHighlight.has(edgeKey) || modifiedEdgeHighlight.has(reverseEdgeKey)) {
            return 3;
          }
          if (weightEdgeHighlight.has(edgeKey) || weightEdgeHighlight.has(reverseEdgeKey)) {
            return 3;
          }
          return 1;
        }}
        onLinkHover={setHoveredLink}
        onNodeClick={handleNodeClick}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.id.replace('node', '');
          const fontSize = 14/globalScale;
          const isInPath = shortestPathInfo && shortestPathInfo.path.includes(node.id);
          const isNewNode = newNodeHighlight === node.id;
          const nodeR = isInPath || isNewNode ? 12 : 10;

          // Draw outer glow for path nodes or new nodes
          if (isInPath || isNewNode) {
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeR + 4, 0, 2 * Math.PI);
            ctx.fillStyle = isInPath ? 'rgba(33, 150, 243, 0.3)' : 'rgba(156, 39, 176, 0.3)';
            ctx.fill();
          }

          // Draw circle
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, nodeR, 0, 2 * Math.PI);
          ctx.fillStyle = isInPath ? '#2196F3' : (isNewNode ? '#9C27B0' : '#1f77b4');
          ctx.fill();

          // Draw text
          ctx.font = `${isInPath || isNewNode ? 'bold ' : ''}${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'white';
          ctx.fillText(label, node.x!, node.y!);
        }}
        nodeCanvasObjectMode={() => 'replace'}
        linkCanvasObject={(link, ctx, globalScale) => {
          const start = link.source as Node;
          const end = link.target as Node;
          const sourceId = start.id;
          const targetId = end.id;
          const edgeKey = `${sourceId}-${targetId}`;
          const reverseEdgeKey = `${targetId}-${sourceId}`;
          
          const isHovered = link === hoveredLink;
          const isNewEdge = newEdgeHighlight.has(edgeKey) || newEdgeHighlight.has(reverseEdgeKey);
          const isModifiedEdge = modifiedEdgeHighlight.has(edgeKey) || modifiedEdgeHighlight.has(reverseEdgeKey);
          
          // Determine if this link is part of the shortest path
          const isInPath = shortestPathInfo && shortestPathInfo.path.some((nodeId, index) => {
            const nextNodeId = shortestPathInfo.path[index + 1];
            return (nodeId === sourceId && nextNodeId === targetId) ||
                   (nodeId === targetId && nextNodeId === sourceId);
          });

          // Draw the line with glow effect for path, hover, new edge, or modified edge
          if (isInPath || isHovered || isNewEdge || isModifiedEdge) {
            // Draw glow
            ctx.beginPath();
            ctx.moveTo(start.x!, start.y!);
            ctx.lineTo(end.x!, end.y!);
            ctx.strokeStyle = isHovered ? 'rgba(255, 215, 0, 0.15)' : 
                            (isNewEdge || isModifiedEdge ? 'rgba(156, 39, 176, 0.15)' : 'rgba(76, 175, 80, 0.15)');
            ctx.lineWidth = 6;
            ctx.stroke();
          }

          // Draw the main line
          ctx.beginPath();
          ctx.moveTo(start.x!, start.y!);
          ctx.lineTo(end.x!, end.y!);
          ctx.strokeStyle = isHovered ? '#ffd700' : 
                          (isNewEdge || isModifiedEdge ? '#9C27B0' : (isInPath ? '#4CAF50' : '#555'));
          ctx.lineWidth = isHovered ? 3 : (isNewEdge || isModifiedEdge ? 3 : (isInPath ? 2 : 1));
          ctx.stroke();

          // Draw weight with background for better visibility (only if not hovered)
          if (!isHovered) {
            const middleX = (start.x! + end.x!) / 2;
            const middleY = (start.y! + end.y!) / 2;
            const weight = (link as Edge).weight.toString();
            const fontSize = isInPath || isNewEdge || isModifiedEdge ? 14/globalScale : 12/globalScale;
            ctx.font = `${isInPath || isNewEdge || isModifiedEdge ? 'bold ' : ''}${fontSize}px Sans-Serif`;
            
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
            ctx.fillStyle = isInPath ? '#4CAF50' : (isNewEdge || isModifiedEdge ? '#9C27B0' : '#ffd700');
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
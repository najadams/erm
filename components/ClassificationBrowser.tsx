'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import CircularProgress from '@mui/material/CircularProgress';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';

interface ClassificationNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  children?: ClassificationNode[];
}

interface ClassificationBrowserProps {
  onSelect: (nodeId: string | null) => void;
  selectedId: string | null;
}

export default function ClassificationBrowser({ onSelect, selectedId }: ClassificationBrowserProps) {
  const [nodes, setNodes] = useState<ClassificationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchClassifications = async () => {
      try {
        const res = await fetch('/api/classifications');
        if (res.ok) {
          const allNodes: ClassificationNode[] = await res.json();
          const tree = buildTree(allNodes);
          setNodes(tree);
        }
      } catch (error) {
        console.error('Failed to fetch classifications', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClassifications();
  }, []);

  const buildTree = (flatNodes: ClassificationNode[]) => {
    const nodeMap = new Map<string, ClassificationNode>();
    flatNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    const roots: ClassificationNode[] = [];
    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      onSelect(null); // Deselect
    } else {
      onSelect(id);
    }
  };

  const renderTree = (nodes: ClassificationNode[]) => {
    return nodes.map(node => {
      const isExpanded = expanded[node.id];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = selectedId === node.id;
      
      // Determine icon based on level/state
      let Icon = FolderIcon;
      if (node.level === 3) Icon = DescriptionIcon; // Leaf/Record Type
      else if (isExpanded) Icon = FolderOpenIcon;

      return (
        <Box key={node.id} sx={{ ml: node.level === 1 ? 0 : 2, mt: 0.5 }}>
          <Box 
            onClick={() => handleSelect(node.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              py: 0.5,
              px: 1,
              borderRadius: 1,
              bgcolor: isSelected ? 'primary.light' : 'transparent',
              color: isSelected ? 'primary.main' : 'text.primary',
              '&:hover': {
                bgcolor: isSelected ? 'primary.light' : 'action.hover',
              }
            }}
          >
            {hasChildren ? (
              <IconButton 
                size="small" 
                onClick={(e) => handleToggle(node.id, e)}
                sx={{ p: 0.5, mr: 0.5 }}
              >
                {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
            ) : (
               <Box sx={{ width: 24, mr: 0.5 }} /> // Spacer
            )}
            
            <Icon fontSize="small" sx={{ mr: 1, color: isSelected ? 'inherit' : 'text.secondary' }} />
            
            <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
              {node.name}
            </Typography>
          </Box>
          
          {hasChildren && (
            <Collapse in={isExpanded}>
              {renderTree(node.children!)}
            </Collapse>
          )}
        </Box>
      );
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <Box 
        onClick={() => onSelect(null)}
        sx={{
            py: 1, px: 2, 
            borderRadius: 1, 
            mb: 1,
            cursor: 'pointer',
            bgcolor: selectedId === null ? '#f1f5f9' : 'transparent',
            fontWeight: selectedId === null ? 600 : 400,
            '&:hover': { bgcolor: '#f1f5f9' }
        }}
       >
        <Typography variant="body2">All Records</Typography>
      </Box>
      {renderTree(nodes)}
    </Box>
  );
}

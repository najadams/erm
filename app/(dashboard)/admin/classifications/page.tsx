'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';

// DnD Kit
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface ClassificationNode {
  id: string;
  name: string;
  level: number;
  code?: string;
  isLeaf: boolean;
  isActive: boolean;
  parentId?: string;
  parent?: ClassificationNode;
  children?: ClassificationNode[];
  securityLevel?: number;
  _count?: {
    records: number;
    children: number;
  };
}

// -------------------------------------------------------------
// Draggable Node Component
// -------------------------------------------------------------
interface DraggableNodeProps {
  node: ClassificationNode;
  expanded: string[];
  onToggle: (id: string) => void;
  onEdit: (node: ClassificationNode, parentId?: string) => void;
  onDelete: (node: ClassificationNode) => void;
  depth?: number;
}

function DraggableNode({ node, expanded, onToggle, onEdit, onDelete, depth = 0 }: DraggableNodeProps) {
  const isExpanded = expanded.includes(node.id);
  const hasChildren = node.children && node.children.length > 0;
  
  // DnD Hooks
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: node,
  });

  const { setNodeRef: setDroppableRef, isOver, active } = useDroppable({
    id: node.id,
    data: node,
    disabled: node.level >= 3, // Cannot drop INTO a Level 3 node
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const recordCount = node._count?.records || 0;
  const childCount = node._count?.children || 0;
  const canDelete = recordCount === 0 && childCount === 0;
  const canAddChild = node.level < 3;

  // Prevent dropping onto itself or descendants (visual feedback)
  const isValidDrop = isOver && active?.id !== node.id; 
  // Note: True descendant check requires tree traversal, but basic self-check helps.
  
  return (
    <React.Fragment>
      <div 
        ref={setDroppableRef} 
        style={{ 
           backgroundColor: isValidDrop ? 'rgba(25, 118, 210, 0.12)' : 'transparent',
           borderRadius: 4
        }}
      >
        <ListItem
          disablePadding
          ref={setDraggableRef}
          style={style}
          sx={{ display: 'block', mb: 0.5 }}
        >
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 1, 
              pl: (depth * 2) + 1, // Indent based on hierarchy depth in UI
              border: isValidDrop ? '2px dashed #1976d2' : '1px solid transparent',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' } 
          }}>
              {/* Drag Handle */}
              <IconButton 
                size="small" 
                {...attributes} 
                {...listeners} 
                sx={{ cursor: 'grab', mr: 0.5, color: 'text.disabled' }}
              >
                 <DragIndicatorIcon fontSize="small" />
              </IconButton>
              
              {/* Expand Toggle */}
              <IconButton 
                  size="small" 
                  onClick={() => hasChildren && onToggle(node.id)} 
                  sx={{ visibility: hasChildren ? 'visible' : 'hidden', mr: 0.5 }}
              >
                  {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
              </IconButton>
              
              {/* Icon */}
              {node.level === 1 ? <FolderIcon color="primary" sx={{ mr: 1 }} /> : 
               node.level === 2 ? <FolderIcon color="action" sx={{ mr: 1 }} /> : 
               <DescriptionIcon color="action" sx={{ mr: 1 }} />}
              
              <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: node.level === 1 ? 'bold' : 'normal' }}>
                  {node.name}
              </Typography>

              {/* Chips */}
              <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                  {node.securityLevel && node.securityLevel > 1 && (
                      <Chip label={`L${node.securityLevel}`} size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                  {node.code && <Chip label={node.code} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />}
                  {recordCount > 0 && <Chip label={recordCount} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />}
              </Box>

              {/* Actions */}
              <Box>
                  {canAddChild && (
                      <IconButton size="small" onClick={() => onEdit(undefined as any, node.id)}>
                          <AddIcon fontSize="small" />
                      </IconButton>
                  )}
                  <IconButton size="small" onClick={() => onEdit(node)}>
                      <EditIcon fontSize="small" />
                  </IconButton>
                  {canDelete && (
                      <IconButton size="small" onClick={() => onDelete(node)}>
                          <DeleteIcon fontSize="small" />
                      </IconButton>
                  )}
              </Box>
          </Box>
        </ListItem>
      </div>
      
      {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                  {node.children!.map(child => (
                       <DraggableNode 
                          key={child.id} 
                          node={child} 
                          expanded={expanded} 
                          onToggle={onToggle}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          depth={depth + 1}
                       />
                  ))}
              </List>
          </Collapse>
      )}
    </React.Fragment>
  );
}


// -------------------------------------------------------------
// Main Page
// -------------------------------------------------------------

export default function ClassificationsPage() {
  const [nodes, setNodes] = useState<ClassificationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ClassificationNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    parentId: '',
    code: '',
    securityLevel: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    })
  );

  useEffect(() => {
    fetchClassifications();
  }, []);

  const fetchClassifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/classifications');
      if (!res.ok) throw new Error('Failed to fetch classifications');
      const data = await res.json();
      setNodes(data);
      // Auto-expand all nodes initially for better visibility
      if (expanded.length === 0) {
          const allIds = data.map((n: ClassificationNode) => n.id);
          setExpanded(allIds);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (inputNodes: ClassificationNode[]): ClassificationNode[] => {
    const nodeMap = new Map<string, ClassificationNode>();
    const roots: ClassificationNode[] = [];
    inputNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    inputNodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(nodeWithChildren);
        }
      } else {
        roots.push(nodeWithChildren);
      }
    });
    return roots;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;
    
    // Logic: Dragging 'active' ONTO 'over' makes 'active' a child of 'over'
    const draggedId = active.id as string;
    const targetParentId = over.id as string;

    if (draggedId === targetParentId) return;

    // Check circular or move validity (prevent dropping parent into child)
    // We can do a quick client-side check if we have the tree structure handy
    // But API also validates.
    
    // Find the dragged node to verify it's not already a child of target
    const draggedNode = nodes.find(n => n.id === draggedId);
    if (draggedNode?.parentId === targetParentId) return; // No change

    // Construct Reparent Request
    try {
        setLoading(true); // Optimistic UI could be better, but safety first
        const res = await fetch(`/api/classifications/${draggedId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                parentId: targetParentId
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to move');
        }

        // Refresh
        await fetchClassifications();
    } catch (e: any) {
        alert(`Move failed: ${e.message}`);
        setLoading(false);
    }
  };


  const handleOpenDialog = (node?: ClassificationNode, parentId?: string) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        name: node.name,
        level: node.level,
        parentId: node.parentId || '',
        code: node.code || '',
        securityLevel: node.securityLevel || 1,
      });
    } else {
      setEditingNode(null);
      setFormData({
        name: '',
        level: parentId ? (nodes.find(n => n.id === parentId)?.level || 0) + 1 : 1,
        parentId: parentId || '',
        code: '',
        securityLevel: 1,
      });
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNode(null);
    setFormData({ name: '', level: 1, parentId: '', code: '', securityLevel: 1 });
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      const url = editingNode 
        ? `/api/classifications/${editingNode.id}`
        : '/api/classifications';
      
      const method = editingNode ? 'PUT' : 'POST';
      const body = editingNode
        ? { name: formData.name, code: formData.code, securityLevel: formData.securityLevel }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save classification');
      }

      handleCloseDialog();
      fetchClassifications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (node: ClassificationNode) => {
    if (!confirm(`Delete "${node.name}"? This cannot be undone if it has records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/classifications/${node.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete classification');
      }

      fetchClassifications();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const treeData = buildTree(nodes);

  return (
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Classifications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage hierarchy. Drag items to reparent.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Level 1
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, minHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : treeData.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">
                No classifications yet. Create your first Level 1 classification.
              </Typography>
            </Box>
          ) : (
            <List>
              {treeData.map(root => (
                  <DraggableNode 
                    key={root.id} 
                    node={root} 
                    expanded={expanded} 
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={handleOpenDialog}
                  />
              ))}
            </List>
          )}
        </Paper>

        <DragOverlay>
            {activeDragId ? (
                <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', width: 200, opacity: 0.8 }}>
                    <DragIndicatorIcon sx={{ mr: 1 }} />
                    <Typography>{nodes.find(n => n.id === activeDragId)?.name}</Typography>
                </Paper>
            ) : null}
        </DragOverlay>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingNode ? 'Edit Classification' : 'Create Classification'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label="Security Level (1-5)"
                type="number"
                fullWidth
                value={formData.securityLevel}
                onChange={(e) => setFormData({ ...formData, securityLevel: parseInt(e.target.value) || 1 })}
                InputProps={{ inputProps: { min: 1, max: 5 } }}
              />
              {!editingNode && (
                <>
                  <TextField
                    label="Level"
                    select
                    fullWidth
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    disabled={!!formData.parentId}
                  >
                    <MenuItem value={1}>Level 1</MenuItem>
                    <MenuItem value={2}>Level 2</MenuItem>
                    <MenuItem value={3}>Level 3</MenuItem>
                  </TextField>
                  {formData.level > 1 && (
                    <TextField
                      label="Parent"
                      select
                      fullWidth
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      required
                    >
                      {nodes
                        .filter(n => n.level === formData.level - 1 && n.isActive)
                        .map(n => (
                          <MenuItem key={n.id} value={n.id}>
                            {n.name}
                          </MenuItem>
                        ))}
                    </TextField>
                  )}
                </>
              )}
              <TextField
                label="Code (optional)"
                fullWidth
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </Box>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!formData.name || (!editingNode && formData.level > 1 && !formData.parentId)}
            >
              {editingNode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </DndContext>
  );
}

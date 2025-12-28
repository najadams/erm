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
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';


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
  _count?: {
    records: number;
    children: number;
  };
}

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
  });
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

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
      // Auto-expand all nodes
      const allIds = data.map((n: ClassificationNode) => n.id);
      setExpanded(allIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (nodes: ClassificationNode[]): ClassificationNode[] => {
    const nodeMap = new Map<string, ClassificationNode>();
    const roots: ClassificationNode[] = [];

    // Create map of all nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build tree structure
    nodes.forEach(node => {
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

  const handleOpenDialog = (node?: ClassificationNode, parentId?: string) => {
    if (node) {
      setEditingNode(node);
      setFormData({
        name: node.name,
        level: node.level,
        parentId: node.parentId || '',
        code: node.code || '',
      });
    } else {
      setEditingNode(null);
      setFormData({
        name: '',
        level: parentId ? (nodes.find(n => n.id === parentId)?.level || 0) + 1 : 1,
        parentId: parentId || '',
        code: '',
      });
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNode(null);
    setFormData({ name: '', level: 1, parentId: '', code: '' });
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
        ? { name: formData.name, code: formData.code }
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

  const renderTree = (node: ClassificationNode) => {
    const hasChildren = node.children && node.children.length > 0;
    const recordCount = node._count?.records || 0;
    const childCount = node._count?.children || 0;
    const canDelete = recordCount === 0 && childCount === 0;
    const canAddChild = node.level < 3;
    const isExpanded = expanded.includes(node.id);

    return (
      <React.Fragment key={node.id}>
        <ListItem
          disablePadding
          sx={{ display: 'block' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, pl: node.level * 2, '&:hover': { bgcolor: 'action.hover' } }}>
                <IconButton size="small" onClick={() => hasChildren && handleToggle(node.id)} sx={{ visibility: hasChildren ? 'visible' : 'hidden' }}>
                    {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                </IconButton>
                
                {node.level === 1 ? <FolderIcon color="primary" sx={{ mr: 1 }} /> : 
                 node.level === 2 ? <FolderIcon color="action" sx={{ mr: 1 }} /> : 
                 <DescriptionIcon color="action" sx={{ mr: 1 }} />}
                
                <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: node.level === 1 ? 'bold' : 'normal' }}>
                    {node.name}
                </Typography>

                {/* Badges/Chips */}
                <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                    {node.code && <Chip label={node.code} size="small" variant="outlined" />}
                    {recordCount > 0 && <Chip label={`${recordCount} records`} size="small" color="primary" />}
                    {!node.isActive && <Chip label="Inactive" size="small" color="error" />}
                </Box>

                {/* Actions */}
                <Box>
                    {canAddChild && (
                        <IconButton size="small" onClick={() => handleOpenDialog(undefined, node.id)}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    )}
                    <IconButton size="small" onClick={() => handleOpenDialog(node)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    {canDelete && (
                        <IconButton size="small" onClick={() => handleDelete(node)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </Box>
        </ListItem>
        {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                    {node.children!.map(child => renderTree(child))}
                </List>
            </Collapse>
        )}
      </React.Fragment>
    );
  };

  const treeData = buildTree(nodes);
  console.log('ClassificationsPage: nodes:', nodes.length, 'treeData:', treeData.length);

  return (
      <React.Fragment>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Classifications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your 3-level classification hierarchy
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            // disabled={nodes.some(n => n.level === 1 && !n.parentId)}
          >
            Add Level 1
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
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
              {treeData.map(root => renderTree(root))}
            </List>
          )}
        </Paper>

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
      </React.Fragment>
  );
}

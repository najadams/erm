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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Sidebar from '@/components/layout/Sidebar';

interface ClassificationNode {
  id: string;
  name: string;
  level: number;
  parent?: ClassificationNode;
  isActive: boolean;
}

interface MetadataField {
  id: string;
  name: string;
  label: string;
  dataType: string;
  required: boolean;
  searchable: boolean;
}

interface TemplateField {
  id: string;
  metadataFieldId: string;
  metadataField: MetadataField;
  required: boolean;
  displayOrder: number;
  editable: boolean;
}

interface MetadataTemplate {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  classificationNodeId: string;
  classificationNode: ClassificationNode & {
    parent?: ClassificationNode & {
      parent?: ClassificationNode;
    };
  };
  templateFields: TemplateField[];
  _count?: {
    records: number;
  };
}

export default function MetadataTemplatesPage() {
  const [templates, setTemplates] = useState<MetadataTemplate[]>([]);
  const [classifications, setClassifications] = useState<ClassificationNode[]>([]);
  const [fields, setFields] = useState<MetadataField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MetadataTemplate | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    classificationNodeId: '',
    fields: [] as Array<{ metadataFieldId: string; required: boolean; displayOrder: number; editable: boolean }>,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching metadata templates data...');
      const [templatesRes, classificationsRes, fieldsRes] = await Promise.all([
        fetch('/api/metadata-templates'),
        fetch('/api/classifications?level=3'),
        fetch('/api/metadata-fields'),
      ]);

      console.log('Templates Res:', templatesRes.status, templatesRes.statusText);
      console.log('Classifications Res:', classificationsRes.status, classificationsRes.statusText);
      console.log('Fields Res:', fieldsRes.status, fieldsRes.statusText);

      if (!templatesRes.ok) throw new Error(`Templates API failed: ${templatesRes.statusText}`);
      if (!classificationsRes.ok) throw new Error(`Classifications API failed: ${classificationsRes.statusText}`);
      if (!fieldsRes.ok) throw new Error(`Fields API failed: ${fieldsRes.statusText}`);

      const [templatesData, classificationsData, fieldsData] = await Promise.all([
        templatesRes.json(),
        classificationsRes.json(),
        fieldsRes.json(),
      ]);

      setTemplates(templatesData);
      setClassifications(classificationsData.filter((n: ClassificationNode) => n.isActive));
      setFields(fieldsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClassificationPath = (node: ClassificationNode & { parent?: ClassificationNode & { parent?: ClassificationNode } }): string => {
    const parts: string[] = [];
    if (node.parent?.parent) parts.push(node.parent.parent.name);
    if (node.parent) parts.push(node.parent.name);
    parts.push(node.name);
    return parts.join(' → ');
  };

  const handleOpenDialog = (template?: MetadataTemplate, classificationId?: string) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        classificationNodeId: template.classificationNodeId,
        fields: template.templateFields.map(tf => ({
          metadataFieldId: tf.metadataFieldId,
          required: tf.required,
          displayOrder: tf.displayOrder,
          editable: tf.editable,
        })),
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        classificationNodeId: classificationId || '',
        fields: [],
      });
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ name: '', classificationNodeId: '', fields: [] });
    setError(null);
  };

  const handleAddField = () => {
    const availableFields = fields.filter(
      f => !formData.fields.some(tf => tf.metadataFieldId === f.id)
    );
    if (availableFields.length === 0) {
      alert('All available fields are already added');
      return;
    }
    setSelectedClassification(formData.classificationNodeId);
    setFieldDialogOpen(true);
  };

  const handleSelectField = (fieldId: string) => {
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        {
          metadataFieldId: fieldId,
          required: false,
          displayOrder: formData.fields.length,
          editable: true,
        },
      ],
    });
    setFieldDialogOpen(false);
  };

  const handleRemoveField = (index: number) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, displayOrder: i })),
    });
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      if (!formData.classificationNodeId || !formData.name) {
        throw new Error('Classification and name are required');
      }

      const url = editingTemplate
        ? `/api/metadata-templates/${editingTemplate.id}`
        : '/api/metadata-templates';

      const method = editingTemplate ? 'PUT' : 'POST';
      const body = editingTemplate
        ? { name: formData.name, fields: formData.fields }
        : { ...formData, fields: formData.fields };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (template: MetadataTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone if it has records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/metadata-templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Sidebar />
      
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Metadata Templates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage metadata templates for Level 3 classifications
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={classifications.length === 0}
          >
            Create Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Template Name</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Fields</TableCell>
                  <TableCell>Records</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No templates yet. Create your first template for a Level 3 classification.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>
                        {getClassificationPath(template.classificationNode)}
                      </TableCell>
                      <TableCell>
                        <Chip label={`v${template.version}`} size="small" />
                      </TableCell>
                      <TableCell>{template.templateFields.length}</TableCell>
                      <TableCell>{template._count?.records || 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={template.isActive ? 'Active' : 'Inactive'}
                          color={template.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template)}
                          disabled={(template._count?.records || 0) > 0}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create/Edit Template Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              {!editingTemplate && (
                <TextField
                  label="Classification (Level 3)"
                  select
                  fullWidth
                  value={formData.classificationNodeId}
                  onChange={(e) => setFormData({ ...formData, classificationNodeId: e.target.value })}
                  required
                >
                  {classifications.map((node) => (
                    <MenuItem key={node.id} value={node.id}>
                      {getClassificationPath(node as any)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="Template Name"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Fields</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddField} type="button">
                    Add Field
                  </Button>
                </Box>
                {formData.fields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No fields added yet. Click "Add Field" to add metadata fields.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {formData.fields
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((field, index) => {
                        const fieldDef = fields.find(f => f.id === field.metadataFieldId);
                        return (
                          <Paper key={index} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <DragIndicatorIcon sx={{ color: 'text.secondary' }} />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" fontWeight="bold">
                                {fieldDef?.label || field.metadataFieldId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {fieldDef?.dataType}
                              </Typography>
                            </Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.required}
                                  onChange={(e) => {
                                    const newFields = [...formData.fields];
                                    newFields[index].required = e.target.checked;
                                    setFormData({ ...formData, fields: newFields });
                                  }}
                                />
                              }
                              label="Required"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={field.editable}
                                  onChange={(e) => {
                                    const newFields = [...formData.fields];
                                    newFields[index].editable = e.target.checked;
                                    setFormData({ ...formData, fields: newFields });
                                  }}
                                />
                              }
                              label="Editable"
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveField(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Paper>
                        );
                      })}
                  </Box>
                )}
              </Box>
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
              disabled={!formData.name || !formData.classificationNodeId}
            >
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Field Selection Dialog */}
        <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Select Metadata Field</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
              {fields
                .filter(f => !formData.fields.some(tf => tf.metadataFieldId === f.id))
                .map((field) => (
                  <Button
                    key={field.id}
                    variant="outlined"
                    fullWidth
                    onClick={() => handleSelectField(field.id)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {field.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.name} • {field.dataType}
                      </Typography>
                    </Box>
                  </Button>
                ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface AipColumn {
  id: string;
  key: string;
  label: string;
  description?: string;
  dataType: 'text' | 'number' | 'currency' | 'dropdown' | 'date' | 'percentage' | 'textarea' | 'boolean';
  options?: string[];
  width?: string;
  textAlign?: 'left' | 'center' | 'right';
  required: boolean;
  visible: boolean;
  order: number;
  isSystemCore?: boolean;
  defaultValue?: any;
}

export interface AipTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  financialYear?: string;
  isDefault: boolean;
  status: 'Active' | 'Draft' | 'Archived';
  columns: AipColumn[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const DATA_TYPES = [
  { value: 'text', label: 'Single-line Text', icon: '📝' },
  { value: 'textarea', label: 'Multi-line Text (Narrative)', icon: '📄' },
  { value: 'number', label: 'Numeric Quantity', icon: '🔢' },
  { value: 'currency', label: 'Currency Amount (LKR Mn)', icon: '💰' },
  { value: 'dropdown', label: 'Dropdown Selection', icon: '🔽' },
  { value: 'date', label: 'Calendar Date', icon: '📅' },
  { value: 'percentage', label: 'Percentage (%)', icon: '📊' },
  { value: 'boolean', label: 'Checkbox (Yes / No)', icon: '☑️' },
];

export default function AipTemplateManager() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [templates, setTemplates] = useState<AipTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditTmplModal, setShowEditTmplModal] = useState(false);
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [showEditColModal, setShowEditColModal] = useState(false);
  const [showDeleteColModal, setShowDeleteColModal] = useState(false);
  const [showDeleteTmplModal, setShowDeleteTmplModal] = useState(false);

  // Create Template Form
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    financialYear: '2027',
    baseTemplateId: '',
    isDefault: false,
  });

  // Edit Template Form
  const [editTmplForm, setEditTmplForm] = useState({
    name: '',
    code: '',
    description: '',
    financialYear: 'all',
    status: 'Active' as 'Active' | 'Draft' | 'Archived',
    isDefault: false,
  });

  // Column Form (Add / Edit)
  const [colForm, setColForm] = useState<{
    id?: string;
    label: string;
    key: string;
    description: string;
    dataType: AipColumn['dataType'];
    optionsText: string;
    width: string;
    textAlign: 'left' | 'center' | 'right';
    required: boolean;
    visible: boolean;
  }>({
    label: '',
    key: '',
    description: '',
    dataType: 'text',
    optionsText: '',
    width: '130px',
    textAlign: 'left',
    required: false,
    visible: true,
  });

  const [selectedColumnForEdit, setSelectedColumnForEdit] = useState<AipColumn | null>(null);
  const [selectedColumnForDelete, setSelectedColumnForDelete] = useState<AipColumn | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/aip-templates');
      if (res.ok) {
        const data = await res.json();
        const tmpls: AipTemplate[] = data.templates || [];
        setTemplates(tmpls);
        if (tmpls.length > 0) {
          if (!selectedTemplateId || !tmpls.some((t) => t.id === selectedTemplateId)) {
            const def = tmpls.find((t) => t.isDefault) || tmpls[0];
            setSelectedTemplateId(def.id);
          }
        }
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to fetch AIP templates');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Error connecting to templates API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Handle Create Template Submit
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      showNotification('error', 'Template name and code are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/aip-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_template',
          name: createForm.name.trim(),
          code: createForm.code.trim(),
          description: createForm.description.trim(),
          financialYear: createForm.financialYear,
          baseTemplateId: createForm.baseTemplateId || undefined,
          isDefault: createForm.isDefault,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('success', `AIP Template "${data.template.name}" created successfully!`);
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          code: '',
          description: '',
          financialYear: '2027',
          baseTemplateId: '',
          isDefault: false,
        });
        await fetchTemplates();
        setSelectedTemplateId(data.template.id);
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to create template');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Template Modal
  const openEditTemplateModal = () => {
    if (!selectedTemplate) return;
    setEditTmplForm({
      name: selectedTemplate.name,
      code: selectedTemplate.code,
      description: selectedTemplate.description || '',
      financialYear: selectedTemplate.financialYear || 'all',
      status: selectedTemplate.status || 'Active',
      isDefault: selectedTemplate.isDefault,
    });
    setShowEditTmplModal(true);
  };

  // Handle Edit Template Submit
  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/aip-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_template',
          templateId: selectedTemplate.id,
          name: editTmplForm.name,
          code: editTmplForm.code,
          description: editTmplForm.description,
          financialYear: editTmplForm.financialYear,
          status: editTmplForm.status,
          isDefault: editTmplForm.isDefault,
        }),
      });

      if (res.ok) {
        showNotification('success', 'AIP Template details updated successfully!');
        setShowEditTmplModal(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to update template');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Set as Default
  const handleSetDefault = async (tmplId: string) => {
    try {
      const res = await fetch('/api/admin/aip-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_default',
          templateId: tmplId,
        }),
      });

      if (res.ok) {
        showNotification('success', 'Default AIP Template updated!');
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to set default template');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Handle Clone Template
  const handleCloneTemplate = async () => {
    if (!selectedTemplate) return;
    const cloneName = `${selectedTemplate.name} (Copy)`;
    const cloneCode = `${selectedTemplate.code}_COPY`;

    try {
      const res = await fetch('/api/admin/aip-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clone_template',
          sourceTemplateId: selectedTemplate.id,
          name: cloneName,
          code: cloneCode,
          description: `Cloned from ${selectedTemplate.name}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showNotification('success', `Cloned template as "${cloneName}"!`);
        await fetchTemplates();
        setSelectedTemplateId(data.template.id);
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to clone template');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Handle Delete Template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/aip-templates?action=delete_template&templateId=${selectedTemplate.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showNotification('success', 'AIP Template deleted successfully.');
        setShowDeleteTmplModal(false);
        const remaining = templates.filter((t) => t.id !== selectedTemplate.id);
        setTemplates(remaining);
        if (remaining.length > 0) {
          setSelectedTemplateId(remaining[0].id);
        }
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to delete template');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Column Modal
  const openAddColumnModal = () => {
    setColForm({
      label: '',
      key: '',
      description: '',
      dataType: 'text',
      optionsText: '',
      width: '130px',
      textAlign: 'left',
      required: false,
      visible: true,
    });
    setShowAddColModal(true);
  };

  // Handle Add Column Submit
  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    if (!colForm.label.trim()) {
      showNotification('error', 'Column label is required.');
      return;
    }

    try {
      setSubmitting(true);
      const options = colForm.dataType === 'dropdown'
        ? colForm.optionsText.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const res = await fetch('/api/admin/aip-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_column',
          templateId: selectedTemplate.id,
          column: {
            label: colForm.label.trim(),
            key: colForm.key.trim() || undefined,
            description: colForm.description.trim(),
            dataType: colForm.dataType,
            options,
            width: colForm.width.trim() || '130px',
            textAlign: colForm.textAlign,
            required: colForm.required,
            visible: colForm.visible,
          },
        }),
      });

      if (res.ok) {
        showNotification('success', `Column "${colForm.label}" added to template!`);
        setShowAddColModal(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to add column');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Column Modal
  const openEditColumnModal = (col: AipColumn) => {
    setSelectedColumnForEdit(col);
    setColForm({
      id: col.id,
      label: col.label,
      key: col.key,
      description: col.description || '',
      dataType: col.dataType || 'text',
      optionsText: (col.options || []).join(', '),
      width: col.width || '130px',
      textAlign: col.textAlign || 'left',
      required: Boolean(col.required),
      visible: col.visible !== false,
    });
    setShowEditColModal(true);
  };

  // Handle Edit Column Submit
  const handleUpdateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedColumnForEdit) return;

    try {
      setSubmitting(true);
      const options = colForm.dataType === 'dropdown'
        ? colForm.optionsText.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      const res = await fetch('/api/admin/aip-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_column',
          templateId: selectedTemplate.id,
          columnId: selectedColumnForEdit.id,
          columnData: {
            label: colForm.label.trim(),
            key: colForm.key.trim(),
            description: colForm.description.trim(),
            dataType: colForm.dataType,
            options,
            width: colForm.width.trim() || '130px',
            textAlign: colForm.textAlign,
            required: colForm.required,
            visible: colForm.visible,
          },
        }),
      });

      if (res.ok) {
        showNotification('success', `Column "${colForm.label}" updated successfully!`);
        setShowEditColModal(false);
        setSelectedColumnForEdit(null);
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to update column');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Column Visibility
  const toggleColumnVisibility = async (col: AipColumn) => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch('/api/admin/aip-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_column',
          templateId: selectedTemplate.id,
          columnId: col.id,
          columnData: {
            visible: !col.visible,
          },
        }),
      });

      if (res.ok) {
        showNotification('success', `Column "${col.label}" is now ${!col.visible ? 'visible' : 'hidden'}`);
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to toggle visibility');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Reorder Column (Move Up / Down)
  const handleMoveColumn = async (index: number, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const cols = [...selectedTemplate.columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cols.length) return;

    // Swap
    const temp = cols[index];
    cols[index] = cols[targetIndex];
    cols[targetIndex] = temp;

    const columnIds = cols.map((c) => c.id);

    try {
      const res = await fetch('/api/admin/aip-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder_columns',
          templateId: selectedTemplate.id,
          columnIds,
        }),
      });

      if (res.ok) {
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to reorder columns');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Confirm Delete Column
  const handleDeleteColumn = async () => {
    if (!selectedTemplate || !selectedColumnForDelete) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/aip-templates?action=delete_column&templateId=${selectedTemplate.id}&columnId=${selectedColumnForDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showNotification('success', `Column "${selectedColumnForDelete.label}" deleted.`);
        setShowDeleteColModal(false);
        setSelectedColumnForDelete(null);
        fetchTemplates();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to delete column');
      }
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ color: '#1E293B' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: toast.type === 'success' ? '#065F46' : '#991B1B',
            color: '#FFFFFF',
            padding: '0.85rem 1.4rem',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderLeft: '5px solid #00534E',
          borderRadius: '12px',
          padding: '1.25rem 1.6rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
            Super Administrator Governance Console
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
              AIP Plan Templates &amp; Column Customization
            </h2>
            <span
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              System Wide Authority
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0, maxWidth: '820px' }}>
            Super Admin can create new Annual Implementation Plan (AIP) templates for different institutional tiers, add custom columns, edit column titles &amp; widths, reorder fields, and manage system defaults.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: '#00534E',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 83, 78, 0.2)',
            }}
          >
            <span>+</span> Make New Template
          </button>
        </div>
      </div>

      {/* Templates Selector Carousel / Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
            System AIP Templates ({templates.length})
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
            Click a template below to view, edit, or configure its columns.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {templates.map((tmpl) => {
            const isSelected = tmpl.id === selectedTemplate?.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplateId(tmpl.id)}
                style={{
                  background: isSelected ? '#F0FDFA' : '#FFFFFF',
                  border: isSelected ? '2px solid #00534E' : '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1.1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isSelected ? '0 4px 12px rgba(0, 83, 78, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📑</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: isSelected ? '#00534E' : '#1E293B' }}>
                        {tmpl.name}
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {tmpl.code}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {tmpl.isDefault && (
                      <span
                        style={{
                          background: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                        }}
                      >
                        ⭐ Primary Default
                      </span>
                    )}
                    <span
                      style={{
                        background: tmpl.status === 'Active' ? '#EFF6FF' : '#F1F5F9',
                        color: tmpl.status === 'Active' ? '#1D4ED8' : '#64748B',
                        border: `1px solid ${tmpl.status === 'Active' ? '#BFDBFE' : '#CBD5E1'}`,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                      }}
                    >
                      {tmpl.status}
                    </span>
                  </div>
                </div>

                <p style={{ color: '#64748B', fontSize: '0.78rem', lineHeight: 1.4, margin: '0.35rem 0 0.8rem 0' }}>
                  {tmpl.description ? (tmpl.description.length > 100 ? `${tmpl.description.slice(0, 100)}...` : tmpl.description) : 'No description specified.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#475569', borderTop: '1px solid #F1F5F9', paddingTop: '0.6rem' }}>
                  <div>
                    <strong>{tmpl.columns.length}</strong> Columns ({tmpl.columns.filter((c) => !c.isSystemCore).length} Custom)
                  </div>
                  <div>
                    Year: <strong>{tmpl.financialYear === 'all' ? 'All Years' : tmpl.financialYear}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Template Management Workspace */}
      {selectedTemplate && (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Header Action Bar of Selected Template */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  {selectedTemplate.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace', background: '#F1F5F9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {selectedTemplate.code}
                </span>
                {selectedTemplate.isDefault ? (
                  <span style={{ background: '#ECFDF5', color: '#065F46', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700 }}>
                    Active System Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(selectedTemplate.id)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#00534E',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⭐ Set as Default
                  </button>
                )}
              </div>
              <p style={{ color: '#64748B', fontSize: '0.82rem', margin: '0.35rem 0 0 0', maxWidth: '750px' }}>
                {selectedTemplate.description}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={openEditTemplateModal}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Template Details
              </button>
              <button
                type="button"
                onClick={handleCloneTemplate}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📋 Clone Template
              </button>
              {!selectedTemplate.isDefault && templates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteTmplModal(true)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #FECDD3',
                    background: '#FFF1F2',
                    color: '#BE123C',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete Template
                </button>
              )}
            </div>
          </div>

          {/* Columns Header & Add Column Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Template Columns Configuration ({selectedTemplate.columns.length})
              </h4>
              <p style={{ color: '#64748B', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                Reorder columns with ▲/▼ arrows. System core columns maintain AIP financial integrity. Click &quot;Add Custom Column&quot; to add new fields.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddColumnModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: '#00534E',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>+</span> Add Custom Column
            </button>
          </div>

          {/* Columns Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '80px', textAlign: 'center' }}>ORDER</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '130px' }}>COLUMN KEY</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', minWidth: '180px' }}>HEADER LABEL</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '130px' }}>DATA TYPE</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '80px' }}>WIDTH</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '90px', textAlign: 'center' }}>REQUIRED</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '90px', textAlign: 'center' }}>VISIBILITY</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '100px' }}>SCOPE</th>
                  <th style={{ padding: '0.7rem 0.8rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', width: '130px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {selectedTemplate.columns.map((col, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === selectedTemplate.columns.length - 1;
                  return (
                    <tr
                      key={col.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: col.visible === false ? '#F8FAFC' : '#FFFFFF',
                        opacity: col.visible === false ? 0.7 : 1,
                      }}
                    >
                      {/* Order Controls */}
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#64748B', minWidth: '18px' }}>
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveColumn(idx, 'up')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: isFirst ? 'not-allowed' : 'pointer',
                              color: isFirst ? '#CBD5E1' : '#475569',
                              padding: '1px 3px',
                              fontSize: '0.75rem',
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveColumn(idx, 'down')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: isLast ? 'not-allowed' : 'pointer',
                              color: isLast ? '#CBD5E1' : '#475569',
                              padding: '1px 3px',
                              fontSize: '0.75rem',
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </td>

                      {/* Column Key */}
                      <td style={{ padding: '0.65rem 0.8rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#00534E', fontWeight: 600 }}>
                        {col.key}
                      </td>

                      {/* Header Label */}
                      <td style={{ padding: '0.65rem 0.8rem' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{col.label}</div>
                        {col.description && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {col.description}
                          </div>
                        )}
                        {col.dataType === 'dropdown' && col.options && (
                          <div style={{ fontSize: '0.68rem', color: '#0369A1', marginTop: '3px' }}>
                            Choices: {col.options.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Data Type */}
                      <td style={{ padding: '0.65rem 0.8rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            color: '#334155',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                          }}
                        >
                          {DATA_TYPES.find((d) => d.value === col.dataType)?.icon || '📝'} {col.dataType}
                        </span>
                      </td>

                      {/* Width */}
                      <td style={{ padding: '0.65rem 0.8rem', color: '#64748B', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {col.width || 'auto'}
                      </td>

                      {/* Required */}
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center' }}>
                        {col.required ? (
                          <span style={{ color: '#BE123C', background: '#FFE4E6', padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                            Mandatory
                          </span>
                        ) : (
                          <span style={{ color: '#64748B', fontSize: '0.72rem' }}>Optional</span>
                        )}
                      </td>

                      {/* Visibility Toggle */}
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleColumnVisibility(col)}
                          style={{
                            border: '1px solid',
                            borderColor: col.visible !== false ? '#A7F3D0' : '#CBD5E1',
                            background: col.visible !== false ? '#ECFDF5' : '#F1F5F9',
                            color: col.visible !== false ? '#065F46' : '#64748B',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {col.visible !== false ? '👁️ Visible' : '🙈 Hidden'}
                        </button>
                      </td>

                      {/* Scope (Core vs Custom) */}
                      <td style={{ padding: '0.65rem 0.8rem' }}>
                        {col.isSystemCore ? (
                          <span style={{ background: '#F1F5F9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                            Core Pillar
                          </span>
                        ) : (
                          <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                            Custom Field
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '0.65rem 0.8rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => openEditColumnModal(col)}
                            style={{
                              border: '1px solid #99F6E4',
                              background: '#F0FDFA',
                              color: '#0D9488',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '5px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Edit Column"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColumnForDelete(col);
                              setShowDeleteColModal(true);
                            }}
                            style={{
                              border: '1px solid #FECDD3',
                              background: '#FFF1F2',
                              color: '#E11D48',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '5px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Delete Column"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live AIP Table Preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1rem' }}>👁️</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B' }}>
                  Live Table Header Preview (How Branch Officers will see this AIP)
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Only active &amp; visible columns are rendered in the final AIP table
              </span>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #00534E', borderRadius: '8px', background: '#FAFAFA' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#00534E', color: '#FFFFFF' }}>
                    {selectedTemplate.columns
                      .filter((c) => c.visible !== false)
                      .map((col) => (
                        <th
                          key={col.id}
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderRight: '1px solid rgba(255,255,255,0.15)',
                            width: col.width || 'auto',
                            textAlign: col.textAlign || 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          <div>{col.label}</div>
                          {col.required && <span style={{ color: '#FDA4AF', fontSize: '0.7rem' }}>*</span>}
                        </th>
                      ))}
                    <th style={{ padding: '0.65rem 0.75rem', background: '#7A1C2D', color: '#FFFFFF', fontSize: '0.75rem' }}>
                      Physical &amp; Financial Targets
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', width: '80px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#FFFFFF', color: '#64748B', fontStyle: 'italic', fontSize: '0.76rem' }}>
                    {selectedTemplate.columns
                      .filter((c) => c.visible !== false)
                      .map((col) => (
                        <td
                          key={col.id}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRight: '1px solid #E2E8F0',
                            borderBottom: '1px solid #E2E8F0',
                            textAlign: col.textAlign || 'center',
                          }}
                        >
                          {col.key === 'outputNo' && '1.1'}
                          {col.key === 'activityCode' && '1.1.1'}
                          {col.key === 'activity' && 'Example planned activity description...'}
                          {col.key === 'voteNumber' && '126'}
                          {col.key === 'estimatedCost' && '12.50'}
                          {col.key === 'remark' && 'MoE directive'}
                          {col.key === 'indicator' && 'Number of workshops'}
                          {col.key === 'programme' && 'General Education Quality'}
                          {col.key === 'subActivities' && 'Conduct 5 provincial workshops'}
                          {col.key === 'sourceOfFinance' && 'GOSL / Treasury'}
                          {col.key === 'kpi' && '100% completion'}
                          {col.key === 'indicateRcp' && 'R1'}
                          {col.key === 'quarterlyTargets' && 'Q1–Q4 Cumulative'}
                          {col.key === 'responsibility' && 'Director / ICT Branch'}
                          {!col.isSystemCore && (col.dataType === 'dropdown' ? (col.options?.[0] || 'Selection') : `[${col.label}]`)}
                        </td>
                      ))}
                    <td style={{ padding: '0.6rem 0.75rem', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                      Jan-Dec Monthly Targets
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                      Edit / Delete
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create New Template ─────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                  Create New AIP Template
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Define a new custom Annual Implementation Plan template.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleCreateTemplate} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Template Name <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zonal Education Office AIP Template"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Template Code <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ZEO-STD-2027"
                    value={createForm.code}
                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Financial Year
                  </label>
                  <select
                    value={createForm.financialYear}
                    onChange={(e) => setCreateForm({ ...createForm, financialYear: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    <option value="all">All Financial Years</option>
                    <option value="2027">2027 (Planning Year)</option>
                    <option value="2026">2026 (Current Year)</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Description / Circular Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational scope, institutional tier, or circular guidelines..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Base Columns Template (Copy Initial Columns From)
                </label>
                <select
                  value={createForm.baseTemplateId}
                  onChange={(e) => setCreateForm({ ...createForm, baseTemplateId: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                >
                  <option value="">National Standard MoE Template (Default 8 Pillars)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.columns.length} columns)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="create-is-default"
                  checked={createForm.isDefault}
                  onChange={(e) => setCreateForm({ ...createForm, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="create-is-default" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                  Set as Primary Default Template for the System
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.55rem 1.4rem', borderRadius: '8px', border: 'none', background: '#00534E', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Template Details ──────────────────────────────────── */}
      {showEditTmplModal && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                  Edit Template Details
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Update metadata and active scope for {selectedTemplate.name}.
                </p>
              </div>
              <button type="button" onClick={() => setShowEditTmplModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateTemplate} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Template Name <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editTmplForm.name}
                  onChange={(e) => setEditTmplForm({ ...editTmplForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Template Code <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editTmplForm.code}
                    onChange={(e) => setEditTmplForm({ ...editTmplForm, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Status
                  </label>
                  <select
                    value={editTmplForm.status}
                    onChange={(e) => setEditTmplForm({ ...editTmplForm, status: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Description / Circular Notes
                </label>
                <textarea
                  rows={2}
                  value={editTmplForm.description}
                  onChange={(e) => setEditTmplForm({ ...editTmplForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="edit-is-default"
                  checked={editTmplForm.isDefault}
                  onChange={(e) => setEditTmplForm({ ...editTmplForm, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="edit-is-default" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                  Set as Primary Default Template for the System
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditTmplModal(false)}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.55rem 1.4rem', borderRadius: '8px', border: 'none', background: '#00534E', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Custom Column ───────────────────────────────────────── */}
      {showAddColModal && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                  Add Custom Column
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Add a new data column to &quot;{selectedTemplate.name}&quot;.
                </p>
              </div>
              <button type="button" onClick={() => setShowAddColModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleAddColumn} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Header Label <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Procurement Method, SDG Target, Zonal Office..."
                  value={colForm.label}
                  onChange={(e) => setColForm({ ...colForm, label: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Data Type <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={colForm.dataType}
                    onChange={(e) => setColForm({ ...colForm, dataType: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    {DATA_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.icon} {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Column Width (px)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 130px, 160px"
                    value={colForm.width}
                    onChange={(e) => setColForm({ ...colForm, width: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {colForm.dataType === 'dropdown' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Dropdown Choices (Comma-separated) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. National Bidding, Direct Contracting, Shopping, Quotations"
                    value={colForm.optionsText}
                    onChange={(e) => setColForm({ ...colForm, optionsText: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                    required={colForm.dataType === 'dropdown'}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Help Text / Description
                </label>
                <input
                  type="text"
                  placeholder="Guidance shown as a tooltip to officers entering data..."
                  value={colForm.description}
                  onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Text Alignment
                  </label>
                  <select
                    value={colForm.textAlign}
                    onChange={(e) => setColForm({ ...colForm, textAlign: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.45rem', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={colForm.required}
                      onChange={(e) => setColForm({ ...colForm, required: e.target.checked })}
                    />
                    Mandatory / Required Field
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={colForm.visible}
                      onChange={(e) => setColForm({ ...colForm, visible: e.target.checked })}
                    />
                    Visible in AIP Table
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddColModal(false)}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.55rem 1.4rem', borderRadius: '8px', border: 'none', background: '#00534E', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Adding...' : 'Add Column'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Column ────────────────────────────────────────────── */}
      {showEditColModal && selectedColumnForEdit && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '540px', width: '100%', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B' }}>
                  Edit Column: {selectedColumnForEdit.label}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  {selectedColumnForEdit.isSystemCore ? 'System Core Column (field key protected)' : 'Custom Field'}
                </p>
              </div>
              <button type="button" onClick={() => setShowEditColModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateColumn} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Header Label <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={colForm.label}
                  onChange={(e) => setColForm({ ...colForm, label: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Data Type
                  </label>
                  <select
                    value={colForm.dataType}
                    onChange={(e) => setColForm({ ...colForm, dataType: e.target.value as any })}
                    disabled={selectedColumnForEdit.isSystemCore && ['activity', 'voteNumber', 'estimatedCost'].includes(selectedColumnForEdit.key)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    {DATA_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.icon} {dt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Column Width (px)
                  </label>
                  <input
                    type="text"
                    value={colForm.width}
                    onChange={(e) => setColForm({ ...colForm, width: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {colForm.dataType === 'dropdown' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Dropdown Choices (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={colForm.optionsText}
                    onChange={(e) => setColForm({ ...colForm, optionsText: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Help Text / Description
                </label>
                <input
                  type="text"
                  value={colForm.description}
                  onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Text Alignment
                  </label>
                  <select
                    value={colForm.textAlign}
                    onChange={(e) => setColForm({ ...colForm, textAlign: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.85rem', background: '#FFFFFF' }}
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.45rem', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={colForm.required}
                      onChange={(e) => setColForm({ ...colForm, required: e.target.checked })}
                    />
                    Mandatory Field
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={colForm.visible}
                      onChange={(e) => setColForm({ ...colForm, visible: e.target.checked })}
                    />
                    Visible in Table
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditColModal(false)}
                  style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.55rem 1.4rem', borderRadius: '8px', border: 'none', background: '#00534E', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Column Confirmation ─────────────────────────────── */}
      {showDeleteColModal && selectedColumnForDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.6rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFE4E6', color: '#BE123C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem' }}>
              🗑️
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.5rem' }}>
              Delete Column &quot;{selectedColumnForDelete.label}&quot;?
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '1.4rem' }}>
              Are you sure you want to delete this column? It will be removed from this AIP template and will no longer appear in the table.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteColModal(false)}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteColumn}
                style={{ padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none', background: '#E11D48', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {submitting ? 'Deleting...' : 'Delete Column'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Template Confirmation ────────────────────────────── */}
      {showDeleteTmplModal && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.6rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFE4E6', color: '#BE123C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem' }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.5rem' }}>
              Delete Template &quot;{selectedTemplate.name}&quot;?
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '1.4rem' }}>
              Are you sure you want to permanently delete this AIP template? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteTmplModal(false)}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteTemplate}
                style={{ padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none', background: '#E11D48', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {submitting ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

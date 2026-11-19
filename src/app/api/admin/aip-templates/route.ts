import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipTemplate, AipColumn, DEFAULT_AIP_TEMPLATES } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

function checkSuperAdmin(user: any): boolean {
  return Boolean(
    user?.isSuperAdmin === true ||
    user?.adminLevel === 0 ||
    user?.roleId === 'role-superadmin' ||
    user?.username === 'superadmin' ||
    user?.roleName === 'Super Administrator'
  );
}

// Helper to slugify column label into key
function slugifyKey(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `col_${base || 'custom'}_${randomUUID().slice(0, 4)}`;
}

// ── GET: List all templates or retrieve specific template ────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const year = searchParams.get('year');

    const db = await getDb();
    let templates: AipTemplate[] = db.aipTemplates || [];
    if (templates.length === 0) {
      templates = [...DEFAULT_AIP_TEMPLATES];
    }

    if (templateId) {
      const found = templates.find((t) => t.id === templateId);
      if (!found) {
        return NextResponse.json({ error: 'AIP Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template: found });
    }

    // Determine default/active template
    let activeTemplate = templates.find((t) => t.isDefault && t.status === 'Active');
    if (!activeTemplate && year) {
      activeTemplate = templates.find((t) => t.financialYear === year && t.status === 'Active');
    }
    if (!activeTemplate) {
      activeTemplate = templates[0];
    }

    return NextResponse.json({
      templates,
      activeTemplate,
      totalCount: templates.length,
    });
  } catch (error: any) {
    console.error('Error fetching AIP templates:', error);
    return NextResponse.json({ error: 'Failed to fetch AIP templates', details: error.message }, { status: 500 });
  }
}

// ── POST: Create new template, clone template, or add column ─────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session?.user || !checkSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Super Administrator access required to manage AIP templates.' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'create_template';

    // 1. Create New Template
    if (action === 'create_template') {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json({ error: 'Template name is required.' }, { status: 400 });
      }
      if (!body.code || !body.code.trim()) {
        return NextResponse.json({ error: 'Template code is required.' }, { status: 400 });
      }

      const db = await getDb();
      const existing = (db.aipTemplates || []).find(
        (t) => t.code.trim().toUpperCase() === body.code.trim().toUpperCase()
      );
      if (existing) {
        return NextResponse.json({ error: `A template with code "${body.code.trim().toUpperCase()}" already exists.` }, { status: 409 });
      }

      // Base columns: clone from baseTemplateId or standard default
      let baseColumns: AipColumn[] = [];
      if (body.baseTemplateId) {
        const baseTmpl = (db.aipTemplates || []).find((t) => t.id === body.baseTemplateId);
        if (baseTmpl) {
          baseColumns = baseTmpl.columns.map((c, i) => ({
            ...c,
            id: `col-${randomUUID().slice(0, 8)}`,
            order: i + 1,
          }));
        }
      }
      if (baseColumns.length === 0) {
        baseColumns = DEFAULT_AIP_TEMPLATES[0].columns.map((c, i) => ({
          ...c,
          id: `col-${randomUUID().slice(0, 8)}`,
          order: i + 1,
        }));
      }

      const isDefault = Boolean(body.isDefault);
      const newTemplate: AipTemplate = {
        id: `tmpl-${randomUUID()}`,
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        description: body.description ? body.description.trim() : '',
        financialYear: body.financialYear || 'all',
        isDefault,
        status: body.status || 'Active',
        columns: baseColumns,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.name || user?.username || 'Super Administrator',
      };

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        if (isDefault) {
          data.aipTemplates.forEach((t) => {
            t.isDefault = false;
          });
        }
        data.aipTemplates.push(newTemplate);

        // Audit log
        if (!data.auditLogs) data.auditLogs = [];
        data.auditLogs.push({
          id: `log-${randomUUID()}`,
          timestamp: new Date().toISOString(),
          userId: user?.id || 'superadmin',
          username: user?.username || 'superadmin',
          userFullName: user?.name || 'Super Administrator',
          organizationId: user?.organizationId || 'org-moe',
          organizationName: user?.organizationName || 'Ministry of Education',
          category: 'Governance',
          action: `Created new AIP Template: ${newTemplate.name} (${newTemplate.code})`,
          entityType: 'AIP_PLAN',
          entityId: newTemplate.id,
          summary: `Created AIP Template ${newTemplate.name} with ${newTemplate.columns.length} columns`,
          details: { message: `Default: ${isDefault}` },
          severity: 'Info',
        });
      });

      return NextResponse.json({ success: true, template: newTemplate }, { status: 201 });
    }

    // 2. Clone Template
    if (action === 'clone_template') {
      const { sourceTemplateId, name, code, description } = body;
      if (!sourceTemplateId) {
        return NextResponse.json({ error: 'sourceTemplateId is required.' }, { status: 400 });
      }
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Clone name is required.' }, { status: 400 });
      }
      if (!code || !code.trim()) {
        return NextResponse.json({ error: 'Clone code is required.' }, { status: 400 });
      }

      const db = await getDb();
      const source = (db.aipTemplates || []).find((t) => t.id === sourceTemplateId);
      if (!source) {
        return NextResponse.json({ error: 'Source template not found.' }, { status: 404 });
      }

      const clonedTemplate: AipTemplate = {
        id: `tmpl-${randomUUID()}`,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ? description.trim() : `Cloned from ${source.name}`,
        financialYear: source.financialYear || 'all',
        isDefault: false,
        status: 'Draft',
        columns: source.columns.map((col, idx) => ({
          ...col,
          id: `col-${randomUUID().slice(0, 8)}`,
          order: idx + 1,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.name || user?.username || 'Super Administrator',
      };

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        data.aipTemplates.push(clonedTemplate);
      });

      return NextResponse.json({ success: true, template: clonedTemplate }, { status: 201 });
    }

    // 3. Add Custom Column to Template
    if (action === 'add_column') {
      const { templateId, column } = body;
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required.' }, { status: 400 });
      }
      if (!column || !column.label || !column.label.trim()) {
        return NextResponse.json({ error: 'Column label is required.' }, { status: 400 });
      }

      let createdColumn: AipColumn | null = null;
      let notFound = false;

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        const tmpl = data.aipTemplates.find((t) => t.id === templateId);
        if (!tmpl) {
          notFound = true;
          return;
        }

        const generatedKey = column.key && column.key.trim()
          ? column.key.trim().replace(/[^a-zA-Z0-9_]/g, '_')
          : slugifyKey(column.label);

        // Check if key already exists in this template
        const keyExists = tmpl.columns.some((c) => c.key === generatedKey);
        const finalKey = keyExists ? `${generatedKey}_${randomUUID().slice(0, 4)}` : generatedKey;

        const maxOrder = tmpl.columns.reduce((max, c) => Math.max(max, c.order || 0), 0);

        createdColumn = {
          id: `col-${randomUUID().slice(0, 8)}`,
          key: finalKey,
          label: column.label.trim(),
          description: column.description ? column.description.trim() : '',
          dataType: column.dataType || 'text',
          options: Array.isArray(column.options)
            ? column.options.map((opt: any) => String(opt).trim()).filter(Boolean)
            : (column.options ? String(column.options).split(',').map((s) => s.trim()).filter(Boolean) : undefined),
          width: column.width ? String(column.width).trim() : '130px',
          textAlign: column.textAlign || 'left',
          required: Boolean(column.required),
          visible: column.visible !== undefined ? Boolean(column.visible) : true,
          order: maxOrder + 1,
          isSystemCore: false,
          defaultValue: column.defaultValue !== undefined ? column.defaultValue : '',
        };

        tmpl.columns.push(createdColumn);
        tmpl.updatedAt = new Date().toISOString();
      });

      if (notFound) {
        return NextResponse.json({ error: 'AIP Template not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, column: createdColumn }, { status: 201 });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing template request:', error);
    return NextResponse.json({ error: 'Failed to process template request', details: error.message }, { status: 500 });
  }
}

// ── PUT: Update template details, set default, edit column, reorder ───────────
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session?.user || !checkSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Super Administrator access required to modify AIP templates.' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action || 'update_template';

    // 1. Update Template Metadata
    if (action === 'update_template') {
      const { templateId, name, code, description, financialYear, status, isDefault } = body;
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required.' }, { status: 400 });
      }

      let updatedTemplate: AipTemplate | null = null;
      let notFound = false;

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        const tmpl = data.aipTemplates.find((t) => t.id === templateId);
        if (!tmpl) {
          notFound = true;
          return;
        }

        if (name) tmpl.name = name.trim();
        if (code) tmpl.code = code.trim().toUpperCase();
        if (description !== undefined) tmpl.description = description.trim();
        if (financialYear !== undefined) tmpl.financialYear = financialYear;
        if (status) tmpl.status = status;
        if (isDefault !== undefined) {
          if (isDefault) {
            data.aipTemplates.forEach((t) => { t.isDefault = false; });
            tmpl.isDefault = true;
          } else {
            tmpl.isDefault = false;
          }
        }
        tmpl.updatedAt = new Date().toISOString();
        updatedTemplate = tmpl;
      });

      if (notFound) {
        return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, template: updatedTemplate });
    }

    // 2. Set Template as Default
    if (action === 'set_default') {
      const { templateId } = body;
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required.' }, { status: 400 });
      }

      let activeTemplate: AipTemplate | null = null;
      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        data.aipTemplates.forEach((t) => {
          if (t.id === templateId) {
            t.isDefault = true;
            t.status = 'Active';
            t.updatedAt = new Date().toISOString();
            activeTemplate = t;
          } else {
            t.isDefault = false;
          }
        });
      });

      return NextResponse.json({ success: true, activeTemplate });
    }

    // 3. Update Existing Column
    if (action === 'update_column') {
      const { templateId, columnId, columnData } = body;
      if (!templateId || !columnId || !columnData) {
        return NextResponse.json({ error: 'templateId, columnId, and columnData are required.' }, { status: 400 });
      }

      let updatedCol: AipColumn | null = null;
      let notFound = false;

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        const tmpl = data.aipTemplates.find((t) => t.id === templateId);
        if (!tmpl) {
          notFound = true;
          return;
        }

        const colIndex = tmpl.columns.findIndex((c) => c.id === columnId);
        if (colIndex === -1) {
          notFound = true;
          return;
        }

        const current = tmpl.columns[colIndex];
        const parsedOptions = Array.isArray(columnData.options)
          ? columnData.options.map((opt: any) => String(opt).trim()).filter(Boolean)
          : (columnData.options !== undefined
              ? String(columnData.options).split(',').map((s) => s.trim()).filter(Boolean)
              : current.options);

        tmpl.columns[colIndex] = {
          ...current,
          label: columnData.label !== undefined ? columnData.label.trim() : current.label,
          description: columnData.description !== undefined ? columnData.description.trim() : current.description,
          dataType: columnData.dataType !== undefined ? columnData.dataType : current.dataType,
          options: parsedOptions,
          width: columnData.width !== undefined ? String(columnData.width).trim() : current.width,
          textAlign: columnData.textAlign !== undefined ? columnData.textAlign : current.textAlign,
          required: columnData.required !== undefined ? Boolean(columnData.required) : current.required,
          visible: columnData.visible !== undefined ? Boolean(columnData.visible) : current.visible,
          order: columnData.order !== undefined ? Number(columnData.order) : current.order,
          defaultValue: columnData.defaultValue !== undefined ? columnData.defaultValue : current.defaultValue,
        };

        // If not system core, key can also be updated
        if (!current.isSystemCore && columnData.key && columnData.key.trim()) {
          tmpl.columns[colIndex].key = columnData.key.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        }

        tmpl.updatedAt = new Date().toISOString();
        updatedCol = tmpl.columns[colIndex];
      });

      if (notFound) {
        return NextResponse.json({ error: 'Template or column not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, column: updatedCol });
    }

    // 4. Reorder Columns
    if (action === 'reorder_columns') {
      const { templateId, columnIds } = body;
      if (!templateId || !Array.isArray(columnIds)) {
        return NextResponse.json({ error: 'templateId and columnIds array are required.' }, { status: 400 });
      }

      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        const tmpl = data.aipTemplates.find((t) => t.id === templateId);
        if (!tmpl) return;

        columnIds.forEach((id: string, index: number) => {
          const col = tmpl.columns.find((c) => c.id === id);
          if (col) {
            col.order = index + 1;
          }
        });
        tmpl.columns.sort((a, b) => a.order - b.order);
        tmpl.updatedAt = new Date().toISOString();
      });

      return NextResponse.json({ success: true, message: 'Columns reordered successfully.' });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template', details: error.message }, { status: 500 });
  }
}

// ── DELETE: Delete template or delete custom column ──────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!session?.user || !checkSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden: Super Administrator access required to delete AIP templates/columns.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'delete_template';
    const templateId = searchParams.get('templateId');
    const columnId = searchParams.get('columnId');

    // 1. Delete Template
    if (action === 'delete_template') {
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required.' }, { status: 400 });
      }

      let errorMsg = '';
      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        if (data.aipTemplates.length <= 1) {
          errorMsg = 'Cannot delete the only remaining AIP template in the system.';
          return;
        }

        const target = data.aipTemplates.find((t) => t.id === templateId);
        if (!target) {
          errorMsg = 'Template not found.';
          return;
        }

        if (target.isDefault) {
          errorMsg = 'Cannot delete the primary default template. Set another template as default first.';
          return;
        }

        data.aipTemplates = data.aipTemplates.filter((t) => t.id !== templateId);
      });

      if (errorMsg) {
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Template deleted successfully.' });
    }

    // 2. Delete Column from Template
    if (action === 'delete_column') {
      if (!templateId || !columnId) {
        return NextResponse.json({ error: 'templateId and columnId are required.' }, { status: 400 });
      }

      let errorMsg = '';
      await updateDb((data) => {
        if (!data.aipTemplates) data.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
        const tmpl = data.aipTemplates.find((t) => t.id === templateId);
        if (!tmpl) {
          errorMsg = 'Template not found.';
          return;
        }

        const col = tmpl.columns.find((c) => c.id === columnId);
        if (!col) {
          errorMsg = 'Column not found.';
          return;
        }

        if (tmpl.columns.length <= 1) {
          errorMsg = 'Cannot delete all columns. An AIP template must retain at least one column.';
          return;
        }

        tmpl.columns = tmpl.columns.filter((c) => c.id !== columnId);
        // Re-index remaining orders
        tmpl.columns.forEach((c, idx) => {
          c.order = idx + 1;
        });
        tmpl.updatedAt = new Date().toISOString();
      });

      if (errorMsg) {
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Column deleted successfully.' });
    }

    return NextResponse.json({ error: `Unknown delete action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('Error deleting template/column:', error);
    return NextResponse.json({ error: 'Failed to delete template/column', details: error.message }, { status: 500 });
  }
}

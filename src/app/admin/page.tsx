'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import BranchBadge from '@/components/common/BranchBadge';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';

export default function SuperAdminConsolePage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;

  // Determine administrative level (0: SuperAdmin, 1: MoE, 2: Apex, 3: Prov, 4: Zone, 5: Div)
  const adminLevel = user?.adminLevel !== undefined && user?.adminLevel !== null ? Number(user?.adminLevel) : (
    user?.username === 'superadmin' ? 0 :
    (user?.username === 'moe' || user?.username === 'moe.admin') ? 1 :
    (user?.username === 'nie.admin' || user?.username === 'nie') ? 2 :
    (user?.username === 'ped.sp' || user?.username === 'provincial.admin' || user?.username === 'sp.admin') ? 3 :
    (user?.username === 'zeo.galle' || user?.username === 'zonal.admin' || user?.username === 'galle.admin') ? 4 :
    (user?.username === 'deo.galle' || user?.username === 'divisional.admin') ? 5 :
    (user?.username === 'admin' ? 1 : null)
  );

  const isAuthorized = adminLevel !== null && adminLevel !== undefined;

  const getAdminBadge = () => {
    switch (adminLevel) {
      case 0:
        return { label: 'SUPER ADMINISTRATOR CONSOLE', sub: '● Full Apex Master Access (All Levels 1-6)', color: 'var(--primary)', bg: 'var(--primary-10)' };
      case 1:
        return { label: 'LEVEL 1 ADMINISTRATOR CONSOLE', sub: '● Ministry Headquarters Administration (20 Divisions & 88 Branches)', color: 'var(--primary)', bg: 'var(--primary-10)' };
      case 2:
        return { label: 'LEVEL 2 ADMINISTRATOR CONSOLE', sub: '● National Apex Institution Administration (NIE / EPD / DoE)', color: '#7E22CE', bg: 'rgba(126, 34, 206, 0.1)' };
      case 3:
        return { label: 'LEVEL 3 ADMINISTRATOR CONSOLE', sub: '● Provincial Education Department Administration (Southern Province)', color: 'var(--accent)', bg: 'var(--accent-10)' };
      case 4:
        return { label: 'LEVEL 4 ADMINISTRATOR CONSOLE', sub: '● Zonal Education Office Administration (Galle Zone)', color: 'var(--teal)', bg: 'var(--teal-10)' };
      case 5:
        return { label: 'LEVEL 5 ADMINISTRATOR CONSOLE', sub: '● Divisional Education Office Administration (Galle Division)', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.1)' };
      default:
        return { label: 'ADMINISTRATOR CONSOLE', sub: '● Delegated Institutional Authority', color: 'var(--primary)', bg: 'var(--primary-10)' };
    }
  };

  const badgeInfo = getAdminBadge();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'access-control' | 'branches' | 'years' | 'deadlines' | 'announcements' | 'settings'>('access-control');
  const [showProgressMeter, setShowProgressMeter] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Multi-Role & Access Control States (AUTH-01 – AUTH-12)
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [usersWithRolesList, setUsersWithRolesList] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditPermsModal, setShowEditPermsModal] = useState(false);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<any>(null);

  // Form states - Assign Role
  const [targetUserId, setTargetUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedScope, setSelectedScope] = useState<'Normal' | 'Planning' | 'Monitoring' | 'All'>('Normal');
  const [selectedAuthLevel, setSelectedAuthLevel] = useState<'Standard' | 'Review' | 'Approval' | 'Verification'>('Standard');
  const [isDefaultAssignment, setIsDefaultAssignment] = useState(false);

  // Form states - Create Role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleScope, setNewRoleScope] = useState<'Normal' | 'Planning' | 'Monitoring' | 'All'>('Normal');
  const [newRoleAuthority, setNewRoleAuthority] = useState<'Standard' | 'Review' | 'Approval' | 'Verification'>('Standard');
  const [newRolePerms, setNewRolePerms] = useState<any>({
    canCreateWorkshop: true,
    canApproveWorkshop: false,
    canManageUsers: false,
    canViewReports: true,
    canManageOrganizations: false,
    canSubmit: true,
    canReview: false,
    canRecommend: false,
    canApprove: false,
    canVerify: false,
    canMonitor: false,
  });

  // Form states - Create User / Admin Modal (Super Admin Access Level Chooser)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserAdminLevel, setNewUserAdminLevel] = useState<string>('3');
  const [newUserOrgId, setNewUserOrgId] = useState('');
  const [newUserDualRole, setNewUserDualRole] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Action feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals & form toggles
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [showAddYear, setShowAddYear] = useState(false);
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);

  // Search & filter states
  const [orgSearch, setOrgSearch] = useState('');
  const [orgLevelFilter, setOrgLevelFilter] = useState<number | 'all'>('all');

  // Form states - Branch / Org
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgTypeId, setNewOrgTypeId] = useState('ot-branch');
  const [newOrgParentId, setNewOrgParentId] = useState('');
  const [newOrgCategory, setNewOrgCategory] = useState<'Normal' | 'Planning' | 'Monitoring'>('Normal');
  const [newOrgUnitType, setNewOrgUnitType] = useState<'branch' | 'location'>('branch');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');

  // Form states - Level / OrgType
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelNum, setNewLevelNum] = useState<number>(6);
  const [newLevelDesc, setNewLevelDesc] = useState('');

  // Form states - Financial Year
  const [newFyYear, setNewFyYear] = useState('');
  const [newFyStartDate, setNewFyStartDate] = useState('');
  const [newFyEndDate, setNewFyEndDate] = useState('');
  const [newFyStatus, setNewFyStatus] = useState<'Planning' | 'Active' | 'Closed'>('Planning');
  const [newFyIsCurrent, setNewFyIsCurrent] = useState(false);
  const [newFyDesc, setNewFyDesc] = useState('');

  // Form states - Deadline
  const [newDlTitle, setNewDlTitle] = useState('');

  // Memoized export dataset for Unified Officer Role Assignments Matrix
  const userRoleAssignmentsExportData: TileExportData = React.useMemo(() => {
    return {
      filename: `Officer_Role_Assignments_Matrix_${new Date().toISOString().slice(0, 10)}`,
      reportTitle: 'Unified Officer Role Assignments Matrix',
      subtitle: 'Centralized Single Login & Multi-Role Access Control (AUTH-01 – AUTH-12)',
      headers: [
        'Officer Name',
        'Username',
        'Assigned Working Roles',
        'Role Count',
        'Default Role',
      ],
      rows: usersWithRolesList
        .filter((u) =>
          !userSearchTerm ||
          (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          (u.username || '').toLowerCase().includes(userSearchTerm.toLowerCase())
        )
        .map((u) => [
          u.name || '-',
          u.username,
          (u.roles || []).map((r: any) => `${r.roleName} [${r.organizationName || 'Ministry'}]`).join('; ') || 'No roles',
          (u.roles || []).length,
          (u.roles || []).find((r: any) => r.isDefault)?.roleName || '-',
        ]),
      summaryStats: [
        { label: 'Total Officers', value: usersWithRolesList.length },
        { label: 'Active Filter', value: usersWithRolesList.filter((u) => !userSearchTerm || (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || (u.username || '').toLowerCase().includes(userSearchTerm.toLowerCase())).length },
        { label: 'System Roles', value: rolesList.length },
        { label: 'Multi-Role Users', value: usersWithRolesList.filter((u) => (u.roles || []).length > 1).length },
        { label: 'Planning Authority', value: usersWithRolesList.filter((u) => (u.roles || []).some((r: any) => r.roleScope === 'Planning')).length },
        { label: 'M&E Specialists', value: usersWithRolesList.filter((u) => (u.roles || []).some((r: any) => r.roleScope === 'Monitoring')).length },
      ],
      orientation: 'landscape',
    };
  }, [usersWithRolesList, rolesList, userSearchTerm]);

  // Memoized export dataset for Centralized System Roles Catalog
  const systemRolesCatalogExportData: TileExportData = React.useMemo(() => {
    return {
      filename: `System_Roles_Catalog_${new Date().toISOString().slice(0, 10)}`,
      reportTitle: 'Centralized System Roles Catalog & Permissions Matrix',
      subtitle: 'Institutional Role-Based Access Control Definitions (AUTH-09 – AUTH-11)',
      headers: [
        'Role Identifier',
        'Role Title',
        'Functional Scope',
        'Authority Level',
        'Assigned Officers',
        'Description',
      ],
      rows: rolesList
        .filter((r) =>
          !roleSearchTerm ||
          (r.name || '').toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
          (r.id || '').toLowerCase().includes(roleSearchTerm.toLowerCase())
        )
        .map((r) => [
          r.id,
          r.name,
          r.scope || 'Normal',
          r.authorityLevel || 'Standard',
          r.userCount || 0,
          r.description || '-',
        ]),
      summaryStats: [
        { label: 'Total Catalog Roles', value: rolesList.length },
        { label: 'Normal Operational', value: rolesList.filter(r => r.scope === 'Normal').length },
        { label: 'Planning Scope', value: rolesList.filter(r => r.scope === 'Planning').length },
        { label: 'Monitoring Scope', value: rolesList.filter(r => r.scope === 'Monitoring').length },
        { label: 'Approval Authority', value: rolesList.filter(r => r.authorityLevel === 'Approval').length },
        { label: 'Verification Authority', value: rolesList.filter(r => r.authorityLevel === 'Verification').length },
      ],
      orientation: 'landscape',
    };
  }, [rolesList, roleSearchTerm]);
  const [newDlFy, setNewDlFy] = useState('2027');
  const [newDlCategory, setNewDlCategory] = useState('AIP Submission');
  const [newDlTargetLevel, setNewDlTargetLevel] = useState<any>('All');
  const [newDlDueDate, setNewDlDueDate] = useState('');
  const [newDlReminderDays, setNewDlReminderDays] = useState(7);
  const [newDlDesc, setNewDlDesc] = useState('');

  // Form states - Announcement
  const [newAnnCircular, setNewAnnCircular] = useState('');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<'Urgent' | 'High' | 'Normal'>('Normal');
  const [newAnnTargetLevel, setNewAnnTargetLevel] = useState<any>('All');
  const [newAnnPublishDate, setNewAnnPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAnnExpiryDate, setNewAnnExpiryDate] = useState('');
  const [newAnnIsPublished, setNewAnnIsPublished] = useState(true);

  // Load all admin data
  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, fyRes, dlRes, annRes, setRes] = await Promise.all([
        fetch('/api/admin/organizations'),
        fetch('/api/admin/financial-years'),
        fetch('/api/admin/deadlines'),
        fetch('/api/admin/announcements?all=true'),
        fetch('/api/admin/settings').catch(() => null),
      ]);

      if (orgsRes.ok) {
        const oData = await orgsRes.json();
        setOrganizations(oData.organizations || []);
        setOrganizationTypes(oData.organizationTypes || []);
      }
      if (fyRes.ok) {
        const fyData = await fyRes.json();
        setFinancialYears(fyData.financialYears || []);
      }
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        setDeadlines(dlData.deadlines || []);
      }
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      }
      if (setRes?.ok) {
        const sData = await setRes.json();
        if (typeof sData.showDashboardProgressMeter === 'boolean') {
          setShowProgressMeter(sData.showDashboardProgressMeter);
        }
      }
      await loadRolesData();
    } catch (err) {
      console.error(err);
      setActionError('Failed to load system management data');
    } finally {
      setLoading(false);
    }
  };

  const loadRolesData = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const json = await res.json();
        setRolesList(json.roles || []);
        setUsersWithRolesList(json.users || []);
      }
    } catch (err) {
      console.error('Error fetching roles data:', err);
    }
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !selectedRoleId || !selectedOrgId) {
      setActionError('Please select user, role, and organization/branch.');
      return;
    }
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_user_role',
          userId: targetUserId,
          roleId: selectedRoleId,
          organizationId: selectedOrgId,
          functionalCategory: selectedScope,
          delegatedAuthority: selectedAuthLevel,
          isDefault: isDefaultAssignment,
        }),
      });
      if (res.ok) {
        setActionSuccess('Role successfully assigned to officer.');
        setShowAssignModal(false);
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to assign role.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error assigning role.');
    }
  };

  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setActionError('Role name is required.');
      return;
    }
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          functionalScope: newRoleScope,
          delegatedAuthority: newRoleAuthority,
          ...newRolePerms,
        }),
      });
      if (res.ok) {
        setActionSuccess(`Role "${newRoleName}" created successfully.`);
        setShowCreateRoleModal(false);
        setNewRoleName('');
        setNewRoleDesc('');
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to create role.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error creating role.');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserFullName.trim() || !newUserOrgId) {
      setActionError('Username, Full Name, and Organization are required.');
      return;
    }
    setCreateUserLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user_account',
          username: newUserUsername.trim(),
          fullName: newUserFullName.trim(),
          email: newUserEmail.trim(),
          designation: newUserDesignation.trim(),
          adminLevel: newUserAdminLevel === 'normal' ? undefined : Number(newUserAdminLevel),
          organizationId: newUserOrgId,
          hasDualRole: newUserDualRole,
          functionalCategory: newUserAdminLevel === 'normal' ? 'Normal' : 'All',
        }),
      });
      if (res.ok) {
        setActionSuccess(`User account "${newUserUsername}" successfully created with Admin Level: ${newUserAdminLevel === 'normal' ? 'Normal' : `Level ${newUserAdminLevel}`}.`);
        setShowCreateUserModal(false);
        setNewUserUsername('');
        setNewUserFullName('');
        setNewUserEmail('');
        setNewUserDesignation('');
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to create user account.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error creating user account.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleApplyBranchDefaults = async () => {
    if (!confirm('Apply standard institutional approval & access policies across all branch entities and officers?')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_branch_defaults' }),
      });
      if (res.ok) {
        const json = await res.json();
        setActionSuccess(json.message || 'Branch defaults applied successfully.');
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to apply defaults.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error applying defaults.');
    }
  };

  const handleRevokeRole = async (userId: string, assignmentId: string) => {
    if (!confirm('Are you sure you want to revoke this working role from the officer?')) return;
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_user_role', userId, assignmentId }),
      });
      if (res.ok) {
        setActionSuccess('Role assignment revoked successfully.');
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to revoke role.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error revoking role.');
    }
  };

  const handleToggleRoleStatus = async (userId: string, assignmentId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify_user_role',
          userId,
          assignmentId,
          isActive: !currentActive,
        }),
      });
      if (res.ok) {
        setActionSuccess(`Role assignment ${!currentActive ? 'activated' : 'suspended'}.`);
        loadRolesData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating status.');
    }
  };

  const handleSetDefaultRole = async (userId: string, assignmentId: string) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify_user_role',
          userId,
          assignmentId,
          isDefault: true,
        }),
      });
      if (res.ok) {
        setActionSuccess('Default working role updated.');
        loadRolesData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error setting default.');
    }
  };

  const handleUpdatePermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleForPerms) return;
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_role_permissions',
          roleId: selectedRoleForPerms.id,
          permissions: {
            canCreateWorkshop: selectedRoleForPerms.canCreateWorkshop,
            canApproveWorkshop: selectedRoleForPerms.canApproveWorkshop,
            canManageUsers: selectedRoleForPerms.canManageUsers,
            canViewReports: selectedRoleForPerms.canViewReports,
            canManageOrganizations: selectedRoleForPerms.canManageOrganizations,
            canSubmit: selectedRoleForPerms.canSubmit,
            canReview: selectedRoleForPerms.canReview,
            canRecommend: selectedRoleForPerms.canRecommend,
            canApprove: selectedRoleForPerms.canApprove,
            canVerify: selectedRoleForPerms.canVerify,
            canMonitor: selectedRoleForPerms.canMonitor,
          },
        }),
      });
      if (res.ok) {
        setActionSuccess(`Permissions for role "${selectedRoleForPerms.name}" updated successfully.`);
        setShowEditPermsModal(false);
        loadRolesData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to update permissions.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error updating permissions.');
    }
  };

  const handleToggleMeter = async () => {
    try {
      setSettingsLoading(true);
      const newVal = !showProgressMeter;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDashboardProgressMeter: newVal }),
      });
      if (res.ok) {
        setShowProgressMeter(newVal);
        setActionSuccess(
          `Real-Time Progress Meter visibility updated to: ${
            newVal ? 'Visible to All Officers' : 'Hidden from Standard Officers'
          }`
        );
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to update settings');
        setTimeout(() => setActionError(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerFeedback = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionSuccess(null);
      setActionError(null);
    }, 4500);
  };

  // Handlers for Organizations & Branches
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-org',
          name: newOrgName,
          code: newOrgCode,
          typeId: newOrgTypeId,
          parentId: newOrgParentId || null,
          functionalCategory: newOrgCategory,
          unitType: newOrgUnitType,
          address: newOrgAddress,
          phone: newOrgPhone,
          email: newOrgEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');

      triggerFeedback(`Successfully registered branch: ${newOrgName}`);
      setShowAddOrg(false);
      setNewOrgName('');
      setNewOrgCode('');
      setNewOrgAddress('');
      setNewOrgEmail('');
      setNewOrgPhone('');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the hierarchy?`)) return;
    try {
      const res = await fetch(`/api/admin/organizations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove branch');

      triggerFeedback(`Removed ${name}`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleToggleOrgActive = async (org: any) => {
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-org',
          id: org.id,
          isActive: !org.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update branch');

      triggerFeedback(`Status updated for ${org.name}`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Handlers for Level / Organization Type
  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-level',
          name: newLevelName,
          level: newLevelNum,
          description: newLevelDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add level');

      triggerFeedback(`Added administrative tier: ${newLevelName}`);
      setShowAddLevel(false);
      setNewLevelName('');
      setNewLevelDesc('');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Handlers for Financial Years
  const handleCreateFy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/financial-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: newFyYear,
          startDate: newFyStartDate,
          endDate: newFyEndDate,
          status: newFyStatus,
          isCurrent: newFyIsCurrent,
          description: newFyDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create financial year');

      triggerFeedback(`Financial Year ${newFyYear} created successfully.`);
      setShowAddYear(false);
      setNewFyYear('');
      setNewFyStartDate('');
      setNewFyEndDate('');
      setNewFyDesc('');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleSetCurrentFy = async (fy: any) => {
    try {
      const res = await fetch('/api/admin/financial-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fy.id,
          isCurrent: true,
          status: 'Active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update current financial year');

      triggerFeedback(`Financial Year ${fy.year} is now set as the active operational year.`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleDeleteFy = async (id: string, year: string) => {
    if (!confirm(`Are you sure you want to delete Financial Year ${year}?`)) return;
    try {
      const res = await fetch(`/api/admin/financial-years?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete financial year');

      triggerFeedback(`Deleted Financial Year ${year}.`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Handlers for Deadlines
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDlTitle,
          financialYear: newDlFy,
          category: newDlCategory,
          targetLevel: newDlTargetLevel === 'All' ? 'All' : Number(newDlTargetLevel),
          dueDate: newDlDueDate,
          reminderDays: newDlReminderDays,
          description: newDlDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create deadline');

      triggerFeedback(`Deadline created: ${newDlTitle}`);
      setShowAddDeadline(false);
      setNewDlTitle('');
      setNewDlDueDate('');
      setNewDlDesc('');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleExtendDeadline = async (dl: any, additionalDays: number) => {
    try {
      const currentDue = new Date(dl.dueDate);
      currentDue.setDate(currentDue.getDate() + additionalDays);
      const newDue = currentDue.toISOString().split('T')[0];

      const res = await fetch('/api/admin/deadlines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dl.id,
          dueDate: newDue,
          status: 'Extended',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend deadline');

      triggerFeedback(`Deadline extended to ${newDue}`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleDeleteDeadline = async (id: string, title: string) => {
    if (!confirm(`Delete deadline "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/deadlines?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete deadline');

      triggerFeedback('Deadline deleted');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Handlers for Announcements
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circularNumber: newAnnCircular,
          title: newAnnTitle,
          content: newAnnContent,
          priority: newAnnPriority,
          targetLevel: newAnnTargetLevel === 'All' ? 'All' : Number(newAnnTargetLevel),
          publishDate: newAnnPublishDate,
          expiryDate: newAnnExpiryDate || undefined,
          isPublished: newAnnIsPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to broadcast announcement');

      triggerFeedback(`Announcement broadcasted: ${newAnnTitle}`);
      setShowAddAnnouncement(false);
      setNewAnnCircular('');
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnExpiryDate('');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleTogglePublishAnnouncement = async (ann: any) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ann.id,
          isPublished: !ann.isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update announcement');

      triggerFeedback(`Announcement ${ann.isPublished ? 'Unpublished' : 'Published'}`);
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete announcement');

      triggerFeedback('Announcement deleted');
      await loadData();
    } catch (err: any) {
      triggerFeedback(err.message, true);
    }
  };

  // Filtered branches
  const filteredOrgs = organizations.filter((org) => {
    const type = organizationTypes.find((t) => t.id === org.typeId);
    const orgLevel = type?.level || 4;
    const matchesLevel = orgLevelFilter === 'all' || orgLevel === orgLevelFilter;
    const matchesSearch =
      !orgSearch ||
      org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      org.code?.toLowerCase().includes(orgSearch.toLowerCase()) ||
      org.functionalCategory?.toLowerCase().includes(orgSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  if (status === 'loading') {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '0.8rem' }}>⏳</div>
          <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Verifying administrator credentials and access scope...</div>
        </div>
      </AppShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '3.5rem auto', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{
            background: '#FFF5F5',
            border: '2px solid #FEB2B2',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 10px 25px -5px rgba(229, 62, 62, 0.15)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 1.25rem auto',
              background: '#E53E3E',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              color: '#fff',
            }}>
              🛡️
            </div>
            <span style={{
              background: '#C53030',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              letterSpacing: '0.05em'
            }}>
              SECURITY BARRIER • 403 ACCESS RESTRICTED
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#9B2C2C', margin: '1rem 0 0.5rem 0' }}>
              Administrator Privilege Required
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#742A2A', maxWidth: '560px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
              The <strong>IPMIS Administrative Console</strong> is restricted to authorized National, Apex, Provincial, Zonal, and Divisional Administrators.
              Your account <strong>({user?.username || 'User'})</strong> is a standard operational user and is restricted to operational workshop and plan modules.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-container" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.4rem' }}>⚙️</span>
              <span
                style={{
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  background: badgeInfo.bg,
                  color: badgeInfo.color,
                  border: `1px solid ${badgeInfo.color}`,
                }}
              >
                {badgeInfo.label}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--teal)', fontWeight: 700 }}>
                {badgeInfo.sub}
              </span>
            </div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {adminLevel === 0 ? 'National System Governance & Institutional Administration' : `${user?.name || 'Administrator'} Management Portal`}
            </h1>
            <p className="page-subtitle" style={{ fontSize: '0.85rem' }}>
              {adminLevel === 0
                ? 'Master control over financial years, statutory deadlines, national broadcast circulars, and the 6-tier educational institutional hierarchy.'
                : `Manage branches, units, workshops, and administrative operations within ${user?.organizationName || 'your institutional jurisdiction'}.`}
            </p>
          </div>

          {(adminLevel === 0 || adminLevel === 1) && (
            <Link
              href="/admin/audit-logs"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #8D153A 0%, #6b0f2b 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(141, 21, 58, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🛡️</span>
              <span>Enterprise Audit Trail</span>
              <span style={{
                background: '#FFBE29',
                color: '#0F172A',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                marginLeft: '0.25rem',
              }}>Super Admin</span>
            </Link>
          )}
        </div>

        {/* Global Action Alerts */}
        {actionSuccess && (
          <div style={{
            padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(0, 83, 78, 0.1)',
            border: '1px solid var(--teal)', color: 'var(--teal)', fontWeight: 600, fontSize: '0.88rem',
            marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span>✓</span> {actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{
            padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid #DC2626', color: '#DC2626', fontWeight: 600, fontSize: '0.88rem',
            marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span>⚠️</span> {actionError}
          </div>
        )}

        {/* 4 Summary Stats Bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem',
        }}>
          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              Registered Institutions
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
              {organizations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Across 6 Administrative Tiers
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              Operational Financial Years
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.2rem' }}>
              {financialYears.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Active: {financialYears.find(f => f.isCurrent)?.year || '2026'}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--teal)' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              System Deadlines & Cutoffs
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--teal)', marginTop: '0.2rem' }}>
              {deadlines.filter(d => d.status === 'Active' || d.status === 'Extended').length} Open
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {deadlines.length} total deadlines configured
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #7E22CE' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
              Circulars & Announcements
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7E22CE', marginTop: '0.2rem' }}>
              {announcements.filter(a => a.isPublished).length} Active
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Live on Dashboard Banner
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div style={{
          display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-light)', marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          {[
            { id: 'access-control', label: '🛡️ Role & Access Control (AUTH-01 – AUTH-12)', count: `${usersWithRolesList.length} Officers` },
            { id: 'branches', label: '🏛️ Branches & Institutional Hierarchy', count: organizations.length },
            { id: 'years', label: '📅 Financial Years', count: financialYears.length },
            { id: 'deadlines', label: '⏰ Deadlines & Cutoffs', count: deadlines.length },
            { id: 'announcements', label: '📢 Circulars & Announcements', count: announcements.length },
            ...(adminLevel === 0 ? [{ id: 'settings', label: '👑 Dashboard & System Settings', count: undefined }] : []),
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '0.65rem 1.25rem',
                  border: 'none',
                  borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
                  background: 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '-2px',
                  fontFamily: 'var(--font)',
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: '12px',
                  background: active ? 'var(--primary-10)' : 'var(--gray-100)',
                  color: active ? 'var(--primary)' : 'var(--text-tertiary)',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          {(adminLevel === 0 || adminLevel === 1) && (
            <Link
              href="/admin/audit-logs"
              style={{
                marginLeft: 'auto',
                padding: '0.65rem 1.25rem',
                border: 'none',
                borderBottom: '3px solid transparent',
                background: 'rgba(141, 21, 58, 0.06)',
                borderRadius: '8px 8px 0 0',
                color: '#8D153A',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '-2px',
                fontFamily: 'var(--font)',
                transition: 'all 0.15s ease',
              }}
              title="Access Enterprise Audit Log and Security Forensics"
            >
              <span>🛡️ System Audit Logs</span>
              <span style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                background: '#8D153A',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}>
                SUPER
              </span>
            </Link>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 0: CENTRALIZED ROLE & ACCESS CONTROL (AUTH-01 – AUTH-12)  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'access-control' && (
          <div>
            {/* Header and Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      background: '#E6FFFA',
                      color: '#0F766E',
                      border: '1px solid #0F766E',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    RBAC • Single Login Architecture
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                    Core Principle: One User Account — Multiple Authorized Roles
                  </span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Centralized Single Login & Multi-Role Access Management
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                  Administer unified officer identities, cross-branch role assignments, delegated authorities, and institutional security scopes.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Create Level Administrator / User (Super Admin only) */}
                {adminLevel === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserUsername('ped.');
                      setNewUserFullName('');
                      setNewUserEmail('');
                      setNewUserDesignation('');
                      setNewUserAdminLevel('3');
                      setNewUserOrgId('');
                      setNewUserDualRole(false);
                      setShowCreateUserModal(true);
                    }}
                    style={{
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                    }}
                    title="Super Admin: Create new administrator account with chosen administrative level"
                  >
                    <span>👤+</span>
                    <span>Create Level Admin / User</span>
                  </button>
                )}

                {/* Apply Branch Defaults (Requirement C) */}
                <button
                  type="button"
                  onClick={handleApplyBranchDefaults}
                  style={{
                    background: '#0F766E',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                  }}
                  title="Apply institutional default approvals and scopes across all branches"
                >
                  <span>⚙️</span>
                  <span>Apply Branch Defaults</span>
                </button>

                {/* Assign Role to User */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetUserId('');
                    setSelectedRoleId('');
                    setSelectedOrgId('');
                    setIsDefaultAssignment(false);
                    setShowAssignModal(true);
                  }}
                  style={{
                    background: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <span>+</span>
                  <span>Assign Role to Officer</span>
                </button>

                {/* Create Custom Role */}
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(true)}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <span>🛡️</span>
                  <span>Create System Role</span>
                </button>
              </div>
            </div>

            {/* AUTH-01 to AUTH-12 Requirements Status Matrix */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  Institutional Security & Access Architecture Matrix (AUTH-01 – AUTH-12)
                </h3>
                <span style={{ fontSize: '0.74rem', background: '#DCFCE7', color: '#15803D', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                  12 of 12 Enforced ✓
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {[
                  { id: 'AUTH-01', title: 'Single Authentication', desc: 'One central authentication mechanism for all branches and modules.' },
                  { id: 'AUTH-02', title: 'Unique User Account', desc: 'Each officer has a unified user account across ministries and tiers.' },
                  { id: 'AUTH-03', title: 'Multi-Role Assignment', desc: 'Users can hold multiple branch and oversight roles concurrently.' },
                  { id: 'AUTH-04', title: 'Post-Login Role Display', desc: 'Dynamic presentation of all assigned active working roles.' },
                  { id: 'AUTH-05', title: 'Mandatory Role Selection', desc: 'Officer selects active working role before entering relevant module.' },
                  { id: 'AUTH-06', title: 'Role-Scoped Workspaces', desc: 'Menus, dashboards, data and approval controls match selected role.' },
                  { id: 'AUTH-07', title: 'In-Session Role Switch', desc: 'Seamless role switching from header without logging out or re-authenticating.' },
                  { id: 'AUTH-08', title: 'Audit Trail Recording', desc: 'All role switches, assignments and revocations logged in audit logs.' },
                  { id: 'AUTH-09', title: 'Unassigned Role Barrier', desc: 'Access denied (403) for any unassigned or suspended role.' },
                  { id: 'AUTH-10', title: 'Admin Role Governance', desc: 'Administrators can assign, modify, suspend, and revoke user roles.' },
                  { id: 'AUTH-11', title: 'Instant Session Updates', desc: 'Role permission updates propagate immediately into active sessions.' },
                  { id: 'AUTH-12', title: 'Common User Profile', desc: 'Maintains invariant officer identity across all operational branches.' },
                ].map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F766E' }}>{item.id}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#16A34A' }}>ENFORCED ✓</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '2px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.35 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 1: Unified Officer Role Assignments Matrix */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Unified Officer Role Assignments Matrix
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Each officer holds a single unified user account with multiple authorized working roles.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="text"
                    placeholder="Filter officers by name or username..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      width: '280px',
                    }}
                  />
                  <TileActionMenu
                    tileTitle="Unified Officer Role Assignments Matrix"
                    exportData={userRoleAssignmentsExportData}
                    position="right"
                  />
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '9px 12px', fontWeight: 800, color: '#0F172A' }}>Officer Identity</th>
                      <th style={{ padding: '9px 12px', fontWeight: 800, color: '#0F172A' }}>Primary Entity</th>
                      <th style={{ padding: '9px 12px', fontWeight: 800, color: '#0F172A' }}>Authorized Working Roles</th>
                      <th style={{ padding: '9px 12px', fontWeight: 800, color: '#0F172A' }}>Remembered Context</th>
                      <th style={{ padding: '9px 12px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersWithRolesList
                      .filter((u) => {
                        if (!userSearchTerm.trim()) return true;
                        const q = userSearchTerm.toLowerCase();
                        return (
                          u.fullName?.toLowerCase().includes(q) ||
                          u.username?.toLowerCase().includes(q) ||
                          u.designation?.toLowerCase().includes(q)
                        );
                      })
                      .map((u, idx) => {
                        const roles = u.assignedRoles || [];

                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            }}
                          >
                            <td style={{ padding: '9px 12px' }}>
                              <div style={{ fontWeight: 800, color: '#0F172A' }}>{u.fullName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                Username: <code style={{ color: '#0F766E', fontWeight: 700 }}>{u.username}</code>
                                {u.aliases && u.aliases.length > 1 && (
                                  <span style={{ marginLeft: '4px', color: '#7E22CE' }}>
                                    (Aliases: {u.aliases.join(', ')})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: '9px 12px' }}>
                              <div style={{ fontWeight: 600, color: '#334155' }}>{u.designation}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{u.organizationId}</div>
                            </td>

                            <td style={{ padding: '9px 12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {roles.map((ra: any) => (
                                  <div
                                    key={ra.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: ra.isDefault ? '#F0FDFA' : '#F1F5F9',
                                      border: ra.isDefault ? '1px solid #0F766E' : '1px solid #E2E8F0',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          background: ra.functionalCategory === 'Planning' ? '#DBEAFE' : ra.functionalCategory === 'Monitoring' ? '#F3E8FF' : '#E2E8F0',
                                          color: ra.functionalCategory === 'Planning' ? '#1E40AF' : ra.functionalCategory === 'Monitoring' ? '#6B21A8' : '#334155',
                                        }}
                                      >
                                        {ra.functionalCategory || 'Normal'}
                                      </span>
                                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{ra.roleName}</span>
                                      {ra.isDefault && (
                                        <span style={{ fontSize: '0.62rem', color: '#0F766E', fontWeight: 800 }}>
                                          ★ Default
                                        </span>
                                      )}
                                      {!ra.isActive && (
                                        <span style={{ fontSize: '0.62rem', color: '#DC2626', fontWeight: 800 }}>
                                          (Suspended)
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {!ra.isDefault && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetDefaultRole(u.id, ra.id)}
                                          title="Set as default working role"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#0F766E' }}
                                        >
                                          Set Default
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRoleStatus(u.id, ra.id, ra.isActive)}
                                        title={ra.isActive ? 'Suspend role' : 'Activate role'}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: ra.isActive ? '#D97706' : '#16A34A' }}
                                      >
                                        {ra.isActive ? 'Suspend' : 'Activate'}
                                      </button>
                                      {roles.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeRole(u.id, ra.id)}
                                          title="Revoke role from officer"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: '#DC2626' }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td style={{ padding: '9px 12px' }}>
                              <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                                {u.rememberLastRole ? '✓ Remembered' : 'Select on login'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                                Last ID: {u.lastSelectedRoleId || 'Default'}
                              </div>
                            </td>

                            <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetUserId(u.id);
                                  setSelectedRoleId('');
                                  setSelectedOrgId(u.organizationId);
                                  setIsDefaultAssignment(false);
                                  setShowAssignModal(true);
                                }}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#0F766E',
                                }}
                              >
                                + Add Role
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Centralized System Roles Catalog & Permissions Matrix */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                    Centralized System Roles Catalog & Permissions Matrix
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Configure functional scopes, delegated authorities, and granular execution rights.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="text"
                    placeholder="Filter system roles..."
                    value={roleSearchTerm}
                    onChange={(e) => setRoleSearchTerm(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      width: '240px',
                    }}
                  />
                  <TileActionMenu
                    tileTitle="Centralized System Roles Catalog & Permissions Matrix"
                    exportData={systemRolesCatalogExportData}
                    position="right"
                  />
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Role Identifier & Title</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Functional Scope</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Authority</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Workshops</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Data & Planning Rights</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A' }}>Administration</th>
                      <th style={{ padding: '8px 10px', fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesList
                      .filter((r) => {
                        if (!roleSearchTerm.trim()) return true;
                        const q = roleSearchTerm.toLowerCase();
                        return r.name?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
                      })
                      .map((r, idx) => (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: '1px solid #E2E8F0',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          }}
                        >
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{r.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}><code>{r.id}</code></div>
                          </td>

                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                background: r.functionalScope === 'Planning' ? '#DBEAFE' : r.functionalScope === 'Monitoring' ? '#F3E8FF' : r.functionalScope === 'All' ? '#FEF3C7' : '#DCFCE7',
                                color: r.functionalScope === 'Planning' ? '#1E40AF' : r.functionalScope === 'Monitoring' ? '#6B21A8' : r.functionalScope === 'All' ? '#B45309' : '#15803D',
                              }}
                            >
                              {r.functionalScope || 'Normal'}
                            </span>
                          </td>

                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>
                            {r.delegatedAuthority || 'Standard'}
                          </td>

                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: r.canCreateWorkshop ? '#16A34A' : '#94A3B8' }}>Create: {r.canCreateWorkshop ? '✓' : '✗'}</span> | <span style={{ color: r.canApproveWorkshop ? '#16A34A' : '#94A3B8' }}>Approve: {r.canApproveWorkshop ? '✓' : '✗'}</span>
                          </td>

                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: r.canSubmit ? '#DCFCE7' : '#F1F5F9', color: r.canSubmit ? '#15803D' : '#94A3B8' }}>Submit</span>
                              <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: r.canReview ? '#DBEAFE' : '#F1F5F9', color: r.canReview ? '#1E40AF' : '#94A3B8' }}>Review</span>
                              <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: r.canApprove ? '#FEF3C7' : '#F1F5F9', color: r.canApprove ? '#B45309' : '#94A3B8' }}>Approve</span>
                              <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: r.canVerify ? '#F3E8FF' : '#F1F5F9', color: r.canVerify ? '#6B21A8' : '#94A3B8' }}>Verify</span>
                            </div>
                          </td>

                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ color: r.canManageUsers ? '#16A34A' : '#94A3B8' }}>Users: {r.canManageUsers ? '✓' : '✗'}</span> | <span style={{ color: r.canManageOrganizations ? '#16A34A' : '#94A3B8' }}>Orgs: {r.canManageOrganizations ? '✓' : '✗'}</span>
                          </td>

                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoleForPerms({ ...r });
                                setShowEditPermsModal(true);
                              }}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                color: '#2563EB',
                              }}
                            >
                              Edit Perms
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal 1: Assign Working Role to Officer */}
            {showAssignModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 999999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    width: '96%',
                    maxWidth: '560px',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      Assign Working Role to Officer (AUTH-10)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAssignRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Select Officer
                      </label>
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      >
                        <option value="">-- Choose Officer Account --</option>
                        {usersWithRolesList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.username}) — {u.designation}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Select Working Role to Assign
                      </label>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => {
                          setSelectedRoleId(e.target.value);
                          const r = rolesList.find((x) => x.id === e.target.value);
                          if (r) {
                            setSelectedScope(r.functionalScope || 'Normal');
                            setSelectedAuthLevel(r.delegatedAuthority || 'Standard');
                          }
                        }}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      >
                        <option value="">-- Choose Role from Catalog --</option>
                        {rolesList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.functionalScope || 'Normal'} Scope)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Assign Organization / Branch Entity
                      </label>
                      <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      >
                        <option value="">-- Choose Branch or Office --</option>
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Functional Scope
                        </label>
                        <select
                          value={selectedScope}
                          onChange={(e) => setSelectedScope(e.target.value as any)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        >
                          <option value="Normal">Normal (Branch Operational)</option>
                          <option value="Planning">Planning (National Oversight)</option>
                          <option value="Monitoring">Monitoring (M&E Specialist)</option>
                          <option value="All">All (System Admin)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Delegated Authority
                        </label>
                        <select
                          value={selectedAuthLevel}
                          onChange={(e) => setSelectedAuthLevel(e.target.value as any)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        >
                          <option value="Standard">Standard</option>
                          <option value="Review">Review</option>
                          <option value="Approval">Approval</option>
                          <option value="Verification">Verification</option>
                        </select>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '4px' }}>
                      <input
                        type="checkbox"
                        checked={isDefaultAssignment}
                        onChange={(e) => setIsDefaultAssignment(e.target.checked)}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E293B' }}>
                        Set as primary default working role for this officer
                      </span>
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Assign Role
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal 2: Create Custom Role */}
            {showCreateRoleModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 999999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    width: '96%',
                    maxWidth: '560px',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      Create Centralized System Role
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateRoleModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Role Name
                      </label>
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. Provincial Planning Director"
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        placeholder="Duties and functional scope..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Functional Scope
                        </label>
                        <select
                          value={newRoleScope}
                          onChange={(e) => setNewRoleScope(e.target.value as any)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        >
                          <option value="Normal">Normal Scope</option>
                          <option value="Planning">Planning Scope</option>
                          <option value="Monitoring">Monitoring Scope</option>
                          <option value="All">All Scope</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Delegated Authority
                        </label>
                        <select
                          value={newRoleAuthority}
                          onChange={(e) => setNewRoleAuthority(e.target.value as any)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        >
                          <option value="Standard">Standard</option>
                          <option value="Review">Review</option>
                          <option value="Approval">Approval</option>
                          <option value="Verification">Verification</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Default Operational Permissions:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canSubmit} onChange={(e) => setNewRolePerms({ ...newRolePerms, canSubmit: e.target.checked })} />
                          <span>Submit Proposals & AIP</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canReview} onChange={(e) => setNewRolePerms({ ...newRolePerms, canReview: e.target.checked })} />
                          <span>Review & Endorse</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canApprove} onChange={(e) => setNewRolePerms({ ...newRolePerms, canApprove: e.target.checked })} />
                          <span>Approve AIP / Budgets</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canVerify} onChange={(e) => setNewRolePerms({ ...newRolePerms, canVerify: e.target.checked })} />
                          <span>M&E Verification</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canCreateWorkshop} onChange={(e) => setNewRolePerms({ ...newRolePerms, canCreateWorkshop: e.target.checked })} />
                          <span>Create Workshops</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={newRolePerms.canApproveWorkshop} onChange={(e) => setNewRolePerms({ ...newRolePerms, canApproveWorkshop: e.target.checked })} />
                          <span>Approve Workshops</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowCreateRoleModal(false)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Create Role
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal 3: Edit Role Permissions */}
            {showEditPermsModal && selectedRoleForPerms && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 999999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    width: '96%',
                    maxWidth: '560px',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                        Edit Permissions: {selectedRoleForPerms.name}
                      </h3>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}><code>{selectedRoleForPerms.id}</code></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEditPermsModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleUpdatePermsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Workshops & Training:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canCreateWorkshop} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canCreateWorkshop: e.target.checked })} />
                          <span>canCreateWorkshop</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canApproveWorkshop} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canApproveWorkshop: e.target.checked })} />
                          <span>canApproveWorkshop</span>
                        </label>
                      </div>

                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginTop: '0.5rem' }}>Planning & AIP Execution:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canSubmit} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canSubmit: e.target.checked })} />
                          <span>canSubmit (Proposals & AIP)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canReview} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canReview: e.target.checked })} />
                          <span>canReview</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canRecommend} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canRecommend: e.target.checked })} />
                          <span>canRecommend</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canApprove} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canApprove: e.target.checked })} />
                          <span>canApprove</span>
                        </label>
                      </div>

                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginTop: '0.5rem' }}>Monitoring & Verification:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canVerify} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canVerify: e.target.checked })} />
                          <span>canVerify</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canMonitor} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canMonitor: e.target.checked })} />
                          <span>canMonitor</span>
                        </label>
                      </div>

                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginTop: '0.5rem' }}>System Administration:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', fontSize: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canManageUsers} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canManageUsers: e.target.checked })} />
                          <span>canManageUsers</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input type="checkbox" checked={selectedRoleForPerms.canManageOrganizations} onChange={(e) => setSelectedRoleForPerms({ ...selectedRoleForPerms, canManageOrganizations: e.target.checked })} />
                          <span>canManageOrganizations</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowEditPermsModal(false)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Save Permissions
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal 4: Create Level Administrator or User Account (Super Admin feature) */}
            {showCreateUserModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.72)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 999999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.25rem',
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    width: '96%',
                    maxWidth: '580px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                        Create Administrator or User Account
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                        Super Admin: Choose institutional access level, username convention, and roles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Access Level Selector */}
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        1. Administrative Access Level (Tier 0 – 5 Scoping)
                      </label>
                      <select
                        value={newUserAdminLevel}
                        onChange={(e) => {
                          const lvl = e.target.value;
                          setNewUserAdminLevel(lvl);
                          // Auto set suggestion username prefix
                          if (lvl === '1') setNewUserUsername('moe.');
                          else if (lvl === '2') setNewUserUsername('nie.');
                          else if (lvl === '3') setNewUserUsername('ped.');
                          else if (lvl === '4') setNewUserUsername('zeo.');
                          else if (lvl === '5') setNewUserUsername('deo.');
                          else setNewUserUsername('');
                        }}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1.5px solid #7C3AED', fontSize: '0.82rem', fontWeight: 700, color: '#4C1D95', background: '#F5F3FF' }}
                      >
                        <option value="1">Level 1 — Ministry Headquarters Admin (National MoE Scope)</option>
                        <option value="2">Level 2 — National Apex Body Admin (NIE / EPD / DoE)</option>
                        <option value="3">Level 3 — Provincial Education Department Admin (e.g. ped.province)</option>
                        <option value="4">Level 4 — Zonal Education Office Admin (e.g. zeo.zone)</option>
                        <option value="5">Level 5 — Divisional Education Office Admin (e.g. deo.division)</option>
                        <option value="normal">Normal User — Operational Branch Officer (Dashboard, AIP, Workshops only)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {/* Username */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Username (level.province / zone)
                        </label>
                        <input
                          type="text"
                          value={newUserUsername}
                          onChange={(e) => setNewUserUsername(e.target.value.toLowerCase())}
                          placeholder={
                            newUserAdminLevel === '1' ? 'e.g. moe' :
                            newUserAdminLevel === '3' ? 'e.g. ped.sp, ped.wp' :
                            newUserAdminLevel === '4' ? 'e.g. zeo.galle' :
                            newUserAdminLevel === '5' ? 'e.g. deo.galle' :
                            'e.g. branch.officer'
                          }
                          required
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>

                      {/* Full Name */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={newUserFullName}
                          onChange={(e) => setNewUserFullName(e.target.value)}
                          placeholder="e.g. Western Provincial Administrator"
                          required
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {/* Email */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Official Email
                        </label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="e.g. ped.wp@wp.edu.lk"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>

                      {/* Designation */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Official Designation
                        </label>
                        <input
                          type="text"
                          value={newUserDesignation}
                          onChange={(e) => setNewUserDesignation(e.target.value)}
                          placeholder="e.g. Provincial Education Director"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        />
                      </div>
                    </div>

                    {/* Assigned Organization */}
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Assigned Institution / Branch Jurisdiction
                      </label>
                      <select
                        value={newUserOrgId}
                        onChange={(e) => setNewUserOrgId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                      >
                        <option value="">-- Select Target Organization --</option>
                        {organizations
                          .filter((o) => {
                            if (newUserAdminLevel === '1') return o.id === 'org-moe' || o.id.startsWith('org-moe');
                            if (newUserAdminLevel === '2') return ['org-nie', 'org-epd', 'org-doe'].includes(o.id);
                            if (newUserAdminLevel === '3') return o.typeId === 'ot-province' || o.id.startsWith('org-prov-');
                            if (newUserAdminLevel === '4') return o.typeId === 'ot-zone' || o.id.startsWith('org-zone-');
                            if (newUserAdminLevel === '5') return o.typeId === 'ot-division' || o.id.startsWith('org-div-');
                            return true;
                          })
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.id})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Dual Role Toggle */}
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newUserDualRole}
                          onChange={(e) => setNewUserDualRole(e.target.checked)}
                          style={{ accentColor: '#7C3AED', marginTop: '3px' }}
                        />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                            Enable Dual Working Role (Normal Branch Role + Governance Role)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                            Gives officer dual capacities: subject-specific governance (e.g. Planning, Monitoring, or Admin) alongside operational branch execution (submit proposals, workshop schedule).
                          </div>
                        </div>
                      </label>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#0F766E', fontWeight: 600 }}>
                      ℹ️ Default initial password will be set to: <strong>123</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowCreateUserModal(false)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createUserLoading}
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#7C3AED', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', opacity: createUserLoading ? 0.6 : 1 }}
                      >
                        {createUserLoading ? 'Creating...' : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: BRANCHES & INSTITUTIONAL HIERARCHY */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'branches' && (() => {
          const availableOrgTypes = organizationTypes.filter((t) => {
            if (adminLevel === 0) return true;
            if (adminLevel === 1) return t.level === 1;
            if (adminLevel === 2) return t.level === 2;
            if (adminLevel === 3) return t.level >= 3;
            if (adminLevel === 4) return t.level >= 4;
            if (adminLevel === 5) return t.level >= 5;
            return false;
          });

          const availableParents = organizations.filter((o) => {
            if (!o.isActive) return false;
            if (adminLevel === 0) return true;
            if (adminLevel === 1) return o.id === 'org-moe' || o.id.startsWith('org-moe-') || o.typeId === 'ot-moe';
            if (adminLevel === 2) return ['org-nie', 'org-epd', 'org-doe'].includes(o.id);
            if (adminLevel === 3) {
              const userOrgId = user?.organizationId || 'org-prov-southern';
              return o.id === userOrgId || o.parentId === userOrgId;
            }
            if (adminLevel === 4) {
              const userOrgId = user?.organizationId || 'org-zone-galle';
              return o.id === userOrgId || o.parentId === userOrgId;
            }
            if (adminLevel === 5) {
              const userOrgId = user?.organizationId || 'org-div-galle-galle';
              return o.id === userOrgId || o.parentId === userOrgId;
            }
            return true;
          });

          return (
          <div>
            {/* Top Toolbar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (availableOrgTypes.length > 0 && !availableOrgTypes.some((t) => t.id === newOrgTypeId)) {
                      setNewOrgTypeId(availableOrgTypes[0].id);
                    }
                    setShowAddOrg(!showAddOrg);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <span>➕</span> Add New Branch / Unit
                </button>
                {adminLevel === 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddLevel(!showAddLevel)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                  >
                    <span>🏛️</span> Manage Levels
                  </button>
                )}
              </div>

              {/* Search & Filter */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="form-input"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}
                  value={String(orgLevelFilter)}
                  onChange={(e) => setOrgLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All Administrative Levels</option>
                  <option value="1">Level 1: MoE Headquarters Branches</option>
                  <option value="2">Level 2: National Apex (NIE/EPD/DoE)</option>
                  <option value="3">Level 3: Provincial Departments (9)</option>
                  <option value="4">Level 4: Zonal Offices (100)</option>
                  <option value="5">Level 5: Divisional Offices (312)</option>
                  <option value="6">Level 6: Schools & Centers</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search branch name or code..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.65rem', minWidth: '220px' }}
                />
              </div>
            </div>

            {/* ADD BRANCH FORM MODAL / COLLAPSIBLE CARD */}
            {showAddOrg && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                    ➕ Register New Institutional Branch / Unit
                  </h3>
                  <button type="button" onClick={() => setShowAddOrg(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateOrg}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Branch / Institution Name *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Distance Learning Promotion Branch"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Official Code *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. MOE-DLP"
                        value={newOrgCode}
                        onChange={(e) => setNewOrgCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Administrative Level *</label>
                      <select
                        className="form-input"
                        value={newOrgTypeId}
                        onChange={(e) => setNewOrgTypeId(e.target.value)}
                      >
                        {availableOrgTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            Level {t.level}: {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Parent Reporting Institution</label>
                      <select
                        className="form-input"
                        value={newOrgParentId}
                        onChange={(e) => setNewOrgParentId(e.target.value)}
                      >
                        <option value="">{adminLevel === 0 ? 'No Parent (Root / MoE Apex)' : 'Select Parent Institution'}</option>
                        {availableParents
                          .slice(0, 150)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.code ? `[${o.code}] ` : ''}{o.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Functional Branch Category</label>
                      <select
                        className="form-input"
                        value={newOrgCategory}
                        onChange={(e) => setNewOrgCategory(e.target.value as any)}
                      >
                        <option value="Normal">Normal Division (Operational & Activity Delivery)</option>
                        <option value="Planning">Planning Division (Special Authority: AIP & Budgeting)</option>
                        <option value="Monitoring">Monitoring Division (Special Authority: Audits & Verification)</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Unit Type</label>
                      <select
                        className="form-input"
                        value={newOrgUnitType}
                        onChange={(e) => setNewOrgUnitType(e.target.value as any)}
                      >
                        <option value="branch">Administrative Branch / Division</option>
                        <option value="location">Host Venue / Training Center</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contact Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="branch@moe.gov.lk"
                        value={newOrgEmail}
                        onChange={(e) => setNewOrgEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Contact Phone</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="011-278XXXX"
                        value={newOrgPhone}
                        onChange={(e) => setNewOrgPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddOrg(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                      ✓ Save & Register Branch
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ADD LEVEL FORM */}
            {showAddLevel && (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '2px solid var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', margin: 0 }}>
                    🏛️ Define / Configure Administrative Level
                  </h3>
                  <button type="button" onClick={() => setShowAddLevel(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateLevel}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Level Number (e.g. 1 to 6)</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        required
                        className="form-input"
                        value={newLevelNum}
                        onChange={(e) => setNewLevelNum(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Level Designation Title</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Divisional Education Office"
                        value={newLevelName}
                        onChange={(e) => setNewLevelName(e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Description & Statutory Mandate</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Administrative role, institutional hierarchy tier, and reporting cascade"
                        value={newLevelDesc}
                        onChange={(e) => setNewLevelDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddLevel(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-accent btn-sm" style={{ fontWeight: 700 }}>
                      ✓ Add Level Tier
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Organizations Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '0.85rem 1.25rem', background: 'var(--gray-100)', borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Institutional Units ({filteredOrgs.length} displayed)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Showing filtered results
                </span>
              </div>

              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-tertiary)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Institution / Branch Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Level Tier</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Functional Scope</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Parent Office</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgs.map((org) => {
                      const type = organizationTypes.find((t) => t.id === org.typeId);
                      const parent = organizations.find((p) => p.id === org.parentId);
                      const level = type?.level || 4;
                      return (
                        <tr key={org.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {org.code || '—'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <BranchBadge
                              name={org.name}
                              code={org.abbreviation}
                              subText={org.email}
                              size="sm"
                            />
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                              background: level === 1 ? 'var(--primary-10)' : level === 2 ? 'rgba(126, 34, 206, 0.1)' : level === 3 ? 'var(--accent-10)' : 'var(--teal-10)',
                              color: level === 1 ? 'var(--primary)' : level === 2 ? '#7E22CE' : level === 3 ? 'var(--accent)' : 'var(--teal)',
                            }}>
                              Level {level}: {type?.name || `Tier ${level}`}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                              background: org.functionalCategory === 'Planning' ? 'rgba(235, 116, 0, 0.1)' : org.functionalCategory === 'Monitoring' ? 'rgba(0, 83, 78, 0.1)' : 'var(--gray-100)',
                              color: org.functionalCategory === 'Planning' ? '#EB7400' : org.functionalCategory === 'Monitoring' ? 'var(--teal)' : 'var(--text-secondary)',
                            }}>
                              {org.functionalCategory || 'Normal'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                            {parent ? parent.name : '— Root —'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleOrgActive(org)}
                              style={{
                                border: 'none', background: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                color: org.isActive ? 'var(--teal)' : 'var(--error)',
                                fontWeight: 700, fontSize: '0.74rem',
                              }}
                              title="Click to toggle Active / Inactive"
                            >
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
                              {org.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            {org.id !== 'org-moe' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteOrg(org.id, org.name)}
                                style={{
                                  border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                                  padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        })()}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: FINANCIAL YEARS MANAGEMENT */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'years' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Financial Years Planning & Operational Cycles
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Manage active financial years, open new planning cycles for AIP drafting, and close audited years.
                </p>
              </div>
              {(adminLevel === 0 || adminLevel === 1) && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddYear(!showAddYear)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <span>➕</span> Add Financial Year
                </button>
              )}
            </div>

            {/* ADD FINANCIAL YEAR FORM */}
            {showAddYear && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                    ➕ Open New Financial Year Cycle
                  </h3>
                  <button type="button" onClick={() => setShowAddYear(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateFy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Financial Year (YYYY) *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. 2028"
                        value={newFyYear}
                        onChange={(e) => setNewFyYear(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Start Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={newFyStartDate}
                        onChange={(e) => setNewFyStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>End Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={newFyEndDate}
                        onChange={(e) => setNewFyEndDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Operational Status</label>
                      <select
                        className="form-input"
                        value={newFyStatus}
                        onChange={(e) => setNewFyStatus(e.target.value as any)}
                      >
                        <option value="Planning">Planning (AIP Preparation & Budget Drafting)</option>
                        <option value="Active">Active (Live Implementation & Workshop Delivery)</option>
                        <option value="Closed">Closed (Audited & Locked)</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description / Treasury Notes</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Upcoming fiscal year for digital curriculum rollout and STEM labs"
                        value={newFyDesc}
                        onChange={(e) => setNewFyDesc(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                      <input
                        type="checkbox"
                        id="fyCurrentCheck"
                        checked={newFyIsCurrent}
                        onChange={(e) => setNewFyIsCurrent(e.target.checked)}
                      />
                      <label htmlFor="fyCurrentCheck" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Set as Current Primary Financial Year
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddYear(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                      ✓ Create Financial Year
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Financial Years List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {financialYears.map((fy) => (
                <div
                  key={fy.id}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderLeft: fy.isCurrent ? '5px solid var(--primary)' : '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '54px', height: '54px', borderRadius: '12px',
                      background: fy.isCurrent ? 'var(--primary)' : 'var(--gray-100)',
                      color: fy.isCurrent ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: 800,
                    }}>
                      {fy.year}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Financial Year {fy.year}
                        </h3>
                        {fy.isCurrent && (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                            ★ CURRENT OPERATIONAL YEAR
                          </span>
                        )}
                        <span style={{
                          padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700,
                          background: fy.status === 'Active' ? 'var(--teal-10)' : fy.status === 'Planning' ? 'var(--accent-10)' : 'var(--gray-100)',
                          color: fy.status === 'Active' ? 'var(--teal)' : fy.status === 'Planning' ? 'var(--accent)' : 'var(--text-tertiary)',
                        }}>
                          {fy.status} Cycle
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        📅 {fy.startDate} to {fy.endDate} {fy.description && `• ${fy.description}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!fy.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSetCurrentFy(fy)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', fontWeight: 600 }}
                      >
                        Set as Current Year
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFy(fy.id, fy.year)}
                      style={{
                        border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                        padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: SYSTEM DEADLINES & CUTOFFS */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'deadlines' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Statutory Submission Deadlines & Operational Windows
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Enforce strict submission cutoffs for AIP activity drafting, budget ceilings, and quarterly monitoring verification.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddDeadline(!showAddDeadline)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <span>➕</span> Create New Deadline
              </button>
            </div>

            {/* ADD DEADLINE FORM */}
            {showAddDeadline && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid var(--teal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--teal)', margin: 0 }}>
                    ➕ Set Statutory Submission Deadline
                  </h3>
                  <button type="button" onClick={() => setShowAddDeadline(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateDeadline}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Deadline Title / Directive *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Final Submission of Annual Implementation Plan (AIP) 2027"
                        value={newDlTitle}
                        onChange={(e) => setNewDlTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Financial Year</label>
                      <select className="form-input" value={newDlFy} onChange={(e) => setNewDlFy(e.target.value)}>
                        {financialYears.map((f) => (
                          <option key={f.id} value={f.year}>FY {f.year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Category</label>
                      <select className="form-input" value={newDlCategory} onChange={(e) => setNewDlCategory(e.target.value)}>
                        <option value="AIP Submission">AIP Submission</option>
                        <option value="Budget Request">Budget Request</option>
                        <option value="Progress Return">Progress Return</option>
                        <option value="Workshop Scheduling">Workshop Scheduling</option>
                        <option value="Audit & Compliance">Audit & Compliance</option>
                        <option value="General">General Administrative</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Target Administrative Level</label>
                      <select className="form-input" value={newDlTargetLevel} onChange={(e) => setNewDlTargetLevel(e.target.value)}>
                        <option value="All">All Administrative Levels (National Scope)</option>
                        <option value="1">Level 1: Ministry Headquarters Only</option>
                        <option value="2">Level 2: National Apex Bodies (NIE/EPD/DoE)</option>
                        <option value="3">Level 3: Provincial Departments</option>
                        <option value="4">Level 4: Zonal Education Offices</option>
                        <option value="5">Level 5: Divisional Education Offices</option>
                        <option value="6">Level 6: Schools & Centers</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Due Cutoff Date *</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={newDlDueDate}
                        onChange={(e) => setNewDlDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Reminder Advance (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="form-input"
                        value={newDlReminderDays}
                        onChange={(e) => setNewDlReminderDays(Number(e.target.value))}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Instructions / Notes</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder="Details on required documents, approvals, or consequences of late submission..."
                        value={newDlDesc}
                        onChange={(e) => setNewDlDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddDeadline(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-teal btn-sm" style={{ fontWeight: 700, color: '#fff' }}>
                      ✓ Activate Deadline
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Deadlines List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deadlines.map((dl) => {
                const due = new Date(dl.dueDate);
                const today = new Date();
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;

                return (
                  <div
                    key={dl.id}
                    className="card"
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      borderLeft: isOverdue ? '5px solid var(--error)' : '5px solid var(--teal)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          background: 'var(--teal-10)', color: 'var(--teal)',
                        }}>
                          {dl.category}
                        </span>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          background: dl.status === 'Extended' ? 'var(--accent-10)' : 'var(--gray-100)',
                          color: dl.status === 'Extended' ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                          {dl.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          Target: {dl.targetLevel === 'All' ? 'All Tiers' : `Level ${dl.targetLevel}`} • FY {dl.financialYear}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {dl.title}
                      </h3>
                      {dl.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                          {dl.description}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          DUE CUTOFF
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: isOverdue ? 'var(--error)' : 'var(--text-primary)' }}>
                          {dl.dueDate}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isOverdue ? 'var(--error)' : 'var(--teal)' }}>
                          {isOverdue ? `Closed ${Math.abs(diffDays)} days ago` : `${diffDays} days remaining`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleExtendDeadline(dl, 7)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem', fontWeight: 600 }}
                        >
                          +7 Days Extension
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDeadline(dl.id, dl.title)}
                          style={{
                            border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: CIRCULARS & BROADCAST ANNOUNCEMENTS */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'announcements' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  National Ministry Circulars & Broadcast Notifications
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Broadcast priority circulars, directives, and system notices visible immediately to all educational personnel on their dashboard.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddAnnouncement(!showAddAnnouncement)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <span>📢</span> Broadcast New Circular
              </button>
            </div>

            {/* ADD ANNOUNCEMENT FORM */}
            {showAddAnnouncement && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid #7E22CE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#7E22CE', margin: 0 }}>
                    📢 Issue Broadcast Circular / National Announcement
                  </h3>
                  <button type="button" onClick={() => setShowAddAnnouncement(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateAnnouncement}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Circular / Memo Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. ED/CIR/2026/AIP-05"
                        value={newAnnCircular}
                        onChange={(e) => setNewAnnCircular(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Priority Level *</label>
                      <select
                        className="form-input"
                        value={newAnnPriority}
                        onChange={(e) => setNewAnnPriority(e.target.value as any)}
                      >
                        <option value="Normal">Normal (Routine Administrative Circular)</option>
                        <option value="High">High (Important Compliance Directive)</option>
                        <option value="Urgent">Urgent (Immediate Action Required)</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Announcement Subject Title *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Submission of Approved Teacher Roll Sheets for Workshop Reimbursements"
                        value={newAnnTitle}
                        onChange={(e) => setNewAnnTitle(e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Circular Body / Directive Text *</label>
                      <textarea
                        required
                        className="form-input"
                        rows={3}
                        placeholder="Detailed directive, guidelines, deadlines, and action points for target offices..."
                        value={newAnnContent}
                        onChange={(e) => setNewAnnContent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Target Audience Level</label>
                      <select className="form-input" value={newAnnTargetLevel} onChange={(e) => setNewAnnTargetLevel(e.target.value)}>
                        <option value="All">All Levels (National Broadcast)</option>
                        <option value="1">Level 1: Ministry Headquarters</option>
                        <option value="2">Level 2: National Apex Institutions</option>
                        <option value="3">Level 3: Provincial Departments</option>
                        <option value="4">Level 4: Zonal Education Offices</option>
                        <option value="5">Level 5: Divisional Offices</option>
                        <option value="6">Level 6: Schools & Centers</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Publish Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newAnnPublishDate}
                        onChange={(e) => setNewAnnPublishDate(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                      <input
                        type="checkbox"
                        id="annPublishCheck"
                        checked={newAnnIsPublished}
                        onChange={(e) => setNewAnnIsPublished(e.target.checked)}
                      />
                      <label htmlFor="annPublishCheck" style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Publish Live Immediately
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddAnnouncement(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                      📢 Broadcast Circular
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Announcements List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderLeft: ann.priority === 'Urgent' ? '5px solid #DC2626' : ann.priority === 'High' ? '5px solid var(--accent)' : '5px solid var(--teal)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ann.circularNumber && (
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700,
                          background: 'var(--gray-100)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
                        }}>
                          {ann.circularNumber}
                        </span>
                      )}
                      <span style={{
                        padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        background: ann.priority === 'Urgent' ? 'rgba(220, 38, 38, 0.1)' : ann.priority === 'High' ? 'var(--accent-10)' : 'var(--teal-10)',
                        color: ann.priority === 'Urgent' ? '#DC2626' : ann.priority === 'High' ? 'var(--accent)' : 'var(--teal)',
                      }}>
                        {ann.priority} Priority
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        Target: {ann.targetLevel === 'All' ? 'National Scope' : `Tier ${ann.targetLevel}`} • Published: {ann.publishDate}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePublishAnnouncement(ann)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: '0.76rem',
                          color: ann.isPublished ? 'var(--teal)' : 'var(--text-tertiary)',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />
                        {ann.isPublished ? 'Live on Dashboard' : 'Draft / Hidden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                        style={{
                          border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <h3 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {ann.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {ann.content}
                  </p>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                    Issued by: {ann.authorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: SYSTEM & DASHBOARD SETTINGS (SUPER ADMIN ONLY)         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && adminLevel === 0 && (
          <div>
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.75rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                maxWidth: '850px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(217, 119, 6, 0.12)',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    flexShrink: 0,
                  }}
                >
                  👑
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Super Administrator System Controls
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Apex configuration governing system telemetry, central dashboard components, and access visibility
                  </p>
                </div>
              </div>

              {/* Progress Meter Setting Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚡</span>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      Real-Time Capacity & Execution Progress Meter
                    </strong>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        background: showProgressMeter ? '#D1FAE5' : '#FEE2E2',
                        color: showProgressMeter ? '#065F46' : '#991B1B',
                      }}
                    >
                      {showProgressMeter ? 'Currently VISIBLE to All Users' : 'Currently HIDDEN from Standard Users'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Controls whether the live Speedometer gauge and execution capacity breakdown are displayed to standard officers on the central dashboard (<code>/dashboard</code>). When hidden, standard users see an uncluttered executive layout, while Super Administrators retain control.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleToggleMeter}
                    disabled={settingsLoading}
                    className="btn"
                    style={{
                      background: showProgressMeter ? '#DC2626' : '#0F766E',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <span>{settingsLoading ? 'Updating...' : showProgressMeter ? '🔒 Hide from Users' : '✓ Show to All Users'}</span>
                  </button>
                </div>
              </div>

              {/* Information Footnote */}
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.75rem 1rem',
                  background: '#F1F5F9',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>ℹ️</span>
                <span>
                  Super Administrators can also toggle this meter directly from the dashboard header with one click.
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

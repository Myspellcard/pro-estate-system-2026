import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useBranch } from '@/context/BranchContext';

export function useUserPermissions() {
  const { user } = useAuth();
  const { activeBranch } = useBranch();

  const { data: permissions = [] } = useQuery({
    queryKey: ['user_permissions'],
    queryFn: () => firebaseApi.entities.UserPermission.list(),
    enabled: !!user,
  });

  const userEmail = String(user?.email || '').trim().toLowerCase();
  const userPerms = permissions.filter((p) => {
    const permEmail = String(p.user_email || p.email || '').trim().toLowerCase();
    return p.user_id === user?.id
      || p.app_user_id === user?.id
      || p.user_uid === user?.uid
      || (userEmail && permEmail === userEmail);
  });

  // Find best matching perm: exact branch match first, then global (no branch_id)
  const activePerm = userPerms.find(p => p.branch_id === activeBranch?.id)
    || userPerms.find(p => !p.branch_id);

  // null = all branches; array = only specific branches
  const allowedBranchIds = userPerms.some(p => p.branch_id)
    ? userPerms.filter(p => p.branch_id).map(p => p.branch_id)
    : null;

  const allProjectPerms = userPerms.flatMap(p => p.project_permissions || []);
  const crossBranchProjectIds = [...new Set(
    allProjectPerms.filter(p => p.can_read).map(p => p.project_id)
  )];
  const crossBranchWriteProjectIds = [...new Set(
    allProjectPerms.filter(p => p.can_write).map(p => p.project_id)
  )];
  const crossBranchDeleteProjectIds = [...new Set(
    allProjectPerms.filter(p => p.can_delete).map(p => p.project_id)
  )];

  const isPermissionAdmin = userPerms.some(p => p.role === 'admin');
  const isPlatformAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.is_admin || user?.is_owner;
  const isAdmin = isPlatformAdmin || isPermissionAdmin;

  const permissionAliases = {
    can_view_invoices: ['can_view_rent_invoices'],
    can_edit_invoices: ['can_edit_rent_invoices'],
    can_delete_invoices: ['can_delete_rent_invoices'],
    can_view_properties: ['can_view_sales'],
    can_edit_properties: ['can_edit_sales'],
    can_delete_properties: ['can_delete_sales'],
    can_view_contracts: ['can_view_sale_contracts'],
    can_edit_contracts: ['can_edit_sale_contracts'],
    can_delete_contracts: ['can_delete_sale_contracts'],
  };

  const can = (key) => {
    if (isAdmin) return true;
    if (!activePerm) return key.startsWith('can_view_') || key.startsWith('dash_');
    if (key.startsWith('dash_')) return activePerm[key] !== false;
    if (activePerm[key]) return true;
    return (permissionAliases[key] || []).some(alias => !!activePerm[alias]);
  };

  return {
    isAdmin,
    can,
    perm: activePerm,
    allowedBranchIds,
    customRoleName: activePerm?.custom_role_name || '',
    employeesVisibilityMode: activePerm?.employees_visibility_mode || 'all',
    visibleEmployeeIds: activePerm?.visible_employee_ids || [],
    contractsVisibilityMode: activePerm?.contracts_visibility_mode || 'all',
    visibleContractIds: activePerm?.visible_contract_ids || [],
    crmVisibilityMode: activePerm?.crm_visibility_mode || 'all',
    visibleCrmUserIds: activePerm?.visible_crm_user_ids || [],
    crmContactVisibilityMode: activePerm?.crm_contact_visibility_mode || 'own',
    visibleCrmContactUserIds: activePerm?.visible_crm_contact_user_ids || [],
    projectPermissions: activePerm?.project_permissions || [],
    contractPropertiesScope: activePerm?.contract_properties_scope || 'branch',
    crossBranchProjectIds,
    crossBranchWriteProjectIds,
    crossBranchDeleteProjectIds,
  };
}

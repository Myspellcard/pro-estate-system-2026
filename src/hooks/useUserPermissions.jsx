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

  // Platform admins and owners always have full access
  if (user?.role === 'admin' || user?.role === 'owner' || user?.is_admin || user?.is_owner) {
    return { isAdmin: true, can: () => true, perm: null, allowedBranchIds: null };
  }

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

  return {
    isAdmin: false,
    can: (key) => {
      if (!activePerm) return key.startsWith('can_view_') || key.startsWith('dash_');
      if (key.startsWith('dash_')) return activePerm[key] !== false;
      return !!activePerm[key];
    },
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
  };
}

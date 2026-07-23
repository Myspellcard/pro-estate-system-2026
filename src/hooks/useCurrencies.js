import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useBranch } from '@/context/BranchContext';

/**
 * Returns active currencies for the current branch.
 * Falls back to a built-in IQD if none configured.
 */
export function useCurrencies() {
  const { activeBranch } = useBranch();

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['currencies', activeBranch?.id],
    queryFn: () =>
      firebaseApi.entities.Currency.filter(
        activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
      ),
  });

  const fallback = [{ id: 'iqd', code: 'IQD', symbol: 'د.ع', name: 'دينار عراقي', exchange_rate: 1, is_default: true }];
  const list = currencies.length > 0 ? currencies : fallback;
  // Always prioritize IQD as default if available, otherwise use is_default flag, otherwise first currency
  const defaultCurrency = list.find(c => c.code === 'IQD') || list.find(c => c.is_default) || list[0];

  return { currencies: list, defaultCurrency, isLoading };
}
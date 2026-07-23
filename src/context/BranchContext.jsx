import React, { createContext, useState, useContext, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useAuth } from '@/lib/AuthContext';

const BranchContext = createContext();

const LOCAL_PREVIEW_BRANCH = {
  id: 'local-preview-branch',
  name: 'فرع المعاينة',
  name_ku: 'لقی پێشبینین',
  company_name: 'دار العقار',
  company_name_ku: 'دار العقار',
  company_slogan: 'نظام إدارة الإيجارات والمبيعات',
  company_slogan_ku: 'سیستەمی بەڕێوەبردنی کرێ و فرۆشتن',
  business_mode: 'both',
};

const isLocalPreview = () => {
  if (typeof window === 'undefined') return false;
  return ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    && localStorage.getItem('darRentNestLocalPreview') === 'true';
};

export const BranchProvider = ({ children }) => {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isLoadingAuth) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated && !isLocalPreview()) {
      setBranches([]);
      setActiveBranch(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await firebaseApi.entities.Branch.list('-created_date');
        if (cancelled) return;
        const branchesData = data.length > 0 ? data : (isLocalPreview() ? [LOCAL_PREVIEW_BRANCH] : []);
        setBranches(branchesData);
        // Restore saved branch or use first
        const savedId = localStorage.getItem('activeBranchId');
        const found = branchesData.find(b => b.id === savedId) || branchesData[0] || null;
        setActiveBranch(found);
      } catch (e) {
        console.error('Failed to load branches', e);
        if (cancelled) return;
        if (isLocalPreview()) {
          setBranches([LOCAL_PREVIEW_BRANCH]);
          setActiveBranch(LOCAL_PREVIEW_BRANCH);
        } else {
          setBranches([]);
          setActiveBranch(null);
          window.setTimeout(() => {
            if (!cancelled) load();
          }, 1200);
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth, user?.uid, user?.email]);

  const switchBranch = (branch) => {
    if (!branch?.id) return;
    setActiveBranch(branch);
    localStorage.setItem('activeBranchId', branch.id);
  };

  const refreshBranches = async () => {
    try {
      setLoading(true);
      const loaded = await firebaseApi.entities.Branch.list('-created_date');
      const data = loaded.length > 0 ? loaded : (isLocalPreview() ? [LOCAL_PREVIEW_BRANCH] : []);
      setBranches(data);
      // If active branch was updated, refresh it
      if (activeBranch) {
        const updated = data.find(b => b.id === activeBranch.id);
        if (updated) setActiveBranch(updated);
        else setActiveBranch(data[0] || null);
      } else {
        const savedId = localStorage.getItem('activeBranchId');
        setActiveBranch(data.find(b => b.id === savedId) || data[0] || null);
      }
    } catch (error) {
      console.error('Failed to refresh branches', error);
      if (isLocalPreview()) {
        setBranches([LOCAL_PREVIEW_BRANCH]);
        setActiveBranch(LOCAL_PREVIEW_BRANCH);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BranchContext.Provider value={{ branches, activeBranch, switchBranch, refreshBranches, loading }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
};

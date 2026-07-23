import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Users, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function OrganizationStructure() {
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();

  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Department.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Employee.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const [expandedDepts, setExpandedDepts] = useState({});

  const toggleDept = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const rootDepts = departments.filter(d => !d.parent_department_id);
  const childDepts = departments.filter(d => d.parent_department_id);

  const getDeptEmployees = (deptId) => {
    return employees.filter(emp => emp.department === deptId);
  };

  const getManager = (dept) => {
    if (dept.manager_id) {
      return employees.find(emp => emp.id === dept.manager_id);
    }
    return null;
  };

  const renderDeptTree = (dept, level = 0) => {
    const isExpanded = expandedDepts[dept.id];
    const children = childDepts.filter(d => d.parent_department_id === dept.id);
    const deptEmployees = getDeptEmployees(dept.id);
    const manager = getManager(dept);

    return (
      <div key={dept.id} className="space-y-3" style={{ marginRight: level * 20 }}>
        <Card className={`border-l-4 ${level === 0 ? 'border-l-[#1a2744]' : 'border-l-blue-500'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dept.color + '20' }}>
                  <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                </div>
                <div>
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                  {dept.name_ku && <p className="text-xs text-gray-500">{dept.name_ku}</p>}
                </div>
              </div>
              {children.length > 0 && (
                <button onClick={() => toggleDept(dept.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {manager && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">{L('مدير القسم', 'بەڕێوەبەری بەش')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                    {manager.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{manager.full_name}</p>
                    <p className="text-xs text-gray-500">{manager.position}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Users className="w-3 h-3" />
              <span>{deptEmployees.length} {L('موظفين', 'کارمەند')}</span>
            </div>
            <div className="grid gap-2">
              {deptEmployees.slice(0, 5).map(emp => (
                <div key={emp.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-bold">
                    {emp.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                  </div>
                </div>
              ))}
              {deptEmployees.length > 5 && (
                <p className="text-xs text-gray-500 text-center">+{deptEmployees.length - 5} {L('آخرين', 'کەسانی تر')}</p>
              )}
            </div>
          </CardContent>
        </Card>
        {isExpanded && children.map(child => renderDeptTree(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a2744]">{L('الهيكل التنظيمي', 'ساختاری ڕێکخراو')}</h1>
        <p className="text-sm text-gray-500">{L('هيكلية الشركة والأقسام', 'ساختاری کۆمپانیا و بەشەکان')}</p>
      </div>

      {/* Company Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-sm font-medium">{L('إجمالي الأقسام', 'کۆی گشتی بەشەکان')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{departments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <CardTitle className="text-sm font-medium">{L('إجمالي الموظفين', 'کۆی گشتی کارمەندان')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-sm font-medium">{L('المدراء', 'بەڕێوەبەرەکان')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{departments.filter(d => d.manager_id).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Tree */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#1a2744]">{L('الأقسام', 'بەشەکان')}</h2>
        {rootDepts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rootDepts.map(dept => renderDeptTree(dept))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{L('لا توجد أقسام', 'هیچ بەشێک نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
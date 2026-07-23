import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, FileText, Award, MessageSquare, FileBarChart, TrendingUp, ClipboardList, UserCheck, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import EmployeeProfileTab from '@/components/employees/EmployeeProfileTab';
import EmployeeCVTab from '@/components/employees/EmployeeCVTab';
import EmployeeBadgesTab from '@/components/employees/EmployeeBadgesTab';
import EmployeeFeedbackTab from '@/components/employees/EmployeeFeedbackTab';
import EmployeeReportTab from '@/components/employees/EmployeeReportTab';
import EmployeeSkillsTab from '@/components/employees/EmployeeSkillsTab';
import EmployeeRequirementsTab from '@/components/employees/EmployeeRequirementsTab';
import EmployeeTasksTab from '@/components/employees/EmployeeTasksTab';

const TABS = [
  { id: 'profile', label: 'الملف الشخصي', labelKu: 'پرۆفایل', icon: User },
  { id: 'cv', label: 'السيرة الذاتية', labelKu: 'ژیانامە', icon: FileText },
  { id: 'tasks', label: 'المهام', labelKu: 'ئەرکەکان', icon: CheckSquare },
  { id: 'badges', label: 'الشارات', labelKu: 'نیشانەکان', icon: Award },
  { id: 'feedback', label: 'التغذية الراجعة', labelKu: 'فیدباک', icon: MessageSquare },
  { id: 'reports', label: 'التقارير', labelKu: 'ڕاپۆرتەکان', icon: FileBarChart },
  { id: 'skills', label: 'المهارات', labelKu: 'توانایەکان', icon: TrendingUp },
  { id: 'requirements', label: 'متطلبات الشركة', labelKu: 'پێداویستییەکان', icon: ClipboardList },
];

export default function EmployeeProfile() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [activeTab, setActiveTab] = useState('profile');

  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get('id');

  const { data: employee, isLoading, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => firebaseApi.entities.Employee.filter({ id: employeeId }).then(r => r[0]),
    enabled: !!employeeId,
  });

  const handleUpdate = (updated) => {
    refetch();
  };

  if (!employeeId) return (
    <div className="p-8 text-center text-muted-foreground">
      <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>{L('لم يتم تحديد موظف', 'هیچ کارمەندێک دیاری نەکراوە')}</p>
      <Link to="/admin/employees"><Button variant="outline" className="mt-4 gap-2"><ArrowRight className="w-4 h-4" />{L('العودة', 'گەڕانەوە')}</Button></Link>
    </div>
  );

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!employee) return (
    <div className="p-8 text-center text-muted-foreground">
      <p>{L('الموظف غير موجود', 'کارمەندەکە نەدۆزرایەوە')}</p>
      <Link to="/admin/employees"><Button variant="outline" className="mt-4">{L('العودة', 'گەڕانەوە')}</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background -m-4 lg:-m-8 overflow-x-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary to-primary/80 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/admin/employees">
              <Button variant="ghost" size="icon" className="shrink-0 text-primary-foreground hover:bg-white/20 hover:text-white">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <span className="text-primary-foreground/70 text-sm">{L('ملف الموظف', 'پرۆفایلی کارمەند')}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-lg">
              {employee.photo_url
                ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-white/80" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xl text-white truncate">{lang === 'ku' ? (employee.full_name_ku || employee.full_name) : employee.full_name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {(employee.position || employee.position_ku) && (
                  <span className="text-sm text-primary-foreground/80">{lang === 'ku' ? (employee.position_ku || employee.position) : employee.position}</span>
                )}
                {employee.department && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{employee.department}</span>
                )}
                {employee.user_id && (
                  <span className="flex items-center gap-1 text-xs bg-green-400/30 text-green-100 border border-green-300/30 px-2 py-0.5 rounded-full">
                    <UserCheck className="w-3 h-3" />{L('مرتبط بمستخدم', 'بەستراوەتەوە')}
                  </span>
                )}
                {!employee.is_active && (
                  <span className="text-xs bg-red-400/30 text-red-100 border border-red-300/30 px-2 py-0.5 rounded-full">{L('غير نشط', 'چالاک نییە')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — 4-column grid on mobile, single row on desktop */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto p-2">
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:flex lg:flex-row gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-[11px] font-semibold transition-all duration-200 w-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.02]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground bg-muted/40"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isActive ? "bg-white/20" : "bg-background"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="leading-tight text-center line-clamp-2">
                    {lang === 'ku' ? tab.labelKu : tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 py-5">
        {activeTab === 'profile' && <EmployeeProfileTab employee={employee} onUpdate={handleUpdate} />}
        {activeTab === 'cv' && <EmployeeCVTab employee={employee} onUpdate={handleUpdate} />}
        {activeTab === 'badges' && <EmployeeBadgesTab employee={employee} />}
        {activeTab === 'feedback' && <EmployeeFeedbackTab employee={employee} />}
        {activeTab === 'reports' && <EmployeeReportTab employee={employee} />}
        {activeTab === 'skills' && <EmployeeSkillsTab employee={employee} onUpdate={handleUpdate} />}
        {activeTab === 'tasks' && <EmployeeTasksTab employee={employee} />}
        {activeTab === 'requirements' && <EmployeeRequirementsTab employee={employee} onUpdate={handleUpdate} />}
      </div>
    </div>
  );
}
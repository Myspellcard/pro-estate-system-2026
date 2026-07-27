import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Shield, Search, Home, MapPin, Layers, ChevronDown, LayoutGrid, List } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import PropertyGridCard from '@/components/properties/PropertyGridCard';
import PropertyListItem from '@/components/properties/PropertyListItem';
import PropertyDetail from '@/components/properties/PropertyDetail';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';

export default function AdminPropertyAccess() {
  const { lang } = useLanguage();
  const L = (ar, ku) => (lang === 'ku' ? ku : ar);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState(null);
  const [accessProject, setAccessProject] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCats, setCollapsedCats] = useState(new Set());
  const [usageMode, setUsageMode] = useState('rent');
  const [viewMode, setViewMode] = useState('grid');

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-all-access'],
    queryFn: () => firebaseApi.entities.Project.list(),
  });
  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches-all-access'],
    queryFn: () => firebaseApi.entities.Branch.list(),
  });
  const { data: allProperties = [] } = useQuery({
    queryKey: ['properties-all-access'],
    queryFn: () => firebaseApi.entities.Property.list('-created_date'),
  });
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories-all-access'],
    queryFn: () => firebaseApi.entities.ProjectCategory.list(),
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all-access'],
    queryFn: () => firebaseApi.entities.User.list(),
  });
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['user_permissions-access'],
    queryFn: () => firebaseApi.entities.UserPermission.list(),
  });

  const branchName = (branchId) => {
    const b = allBranches.find(br => br.id === branchId);
    return b ? L(b.name, b.name_ku) : L('بدون فرع', 'بێ لق');
  };

  const getProjectProperties = (projectId) => allProperties.filter(p =>
    p.project_id === projectId &&
    (usageMode === 'rent'
      ? (p.usage_type === 'rent' || p.usage_type === 'both' || !p.usage_type)
      : (p.usage_type === 'sale' || p.usage_type === 'both'))
  );

  const toggleCat = (catId) => {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const getProjectCategories = (projectId) =>
    allCategories
      .filter(c => c.project_id === projectId && (
        usageMode === 'rent'
          ? (c.usage_type === 'rent' || c.usage_type === 'both' || !c.usage_type)
          : (c.usage_type === 'sale' || c.usage_type === 'both')
      ))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const groupPropertiesByCategory = (properties, categories) => {
    const uncategorizedKey = L('بدون تصنيف', 'بێ پۆل');
    const grouped = properties.reduce((acc, prop) => {
      const catId = prop.category_id;
      if (catId) {
        const cat = categories.find(c => c.id === catId);
        const key = cat ? L(cat.name, cat.name_ku) : L('غير مصنف', 'بەشەنەکراو');
        if (!acc[key]) acc[key] = [];
        acc[key].push(prop);
      } else {
        if (!acc[uncategorizedKey]) acc[uncategorizedKey] = [];
        acc[uncategorizedKey].push(prop);
      }
      return acc;
    }, {});
    return grouped;
  };

  const getUserProjectAccess = (userId, projectId) => {
    const userPerms = allPermissions.filter(p => p.user_id === userId);
    const allProjPerms = userPerms.flatMap(p => p.project_permissions || []);
    const pp = allProjPerms.find(p => p.project_id === projectId);
    return {
      can_read: !!pp?.can_read,
      can_write: !!pp?.can_write,
      can_delete: !!pp?.can_delete,
    };
  };

  const handleToggleAccess = async (userId, projectId, field) => {
    const userPerms = allPermissions.filter(p => p.user_id === userId);
    const current = getUserProjectAccess(userId, projectId);
    const newValue = !current[field];

    if (userPerms.length === 0) {
      await firebaseApi.entities.UserPermission.create({
        user_id: userId,
        role: 'viewer',
        project_permissions: [{
          project_id: projectId,
          can_read: field === 'can_read' ? newValue : false,
          can_write: field === 'can_write' ? newValue : false,
          can_delete: field === 'can_delete' ? newValue : false,
        }],
      });
    } else {
      const permWithProject = userPerms.find(p =>
        (p.project_permissions || []).some(pp => pp.project_id === projectId)
      ) || userPerms[0];
      const existingPerms = permWithProject.project_permissions || [];
      const existing = existingPerms.find(p => p.project_id === projectId);
      let updatedPerms;
      if (existing) {
        updatedPerms = existingPerms.map(p =>
          p.project_id === projectId ? { ...p, [field]: newValue } : p
        );
      } else {
        updatedPerms = [...existingPerms, {
          project_id: projectId,
          can_read: field === 'can_read' ? newValue : false,
          can_write: field === 'can_write' ? newValue : false,
          can_delete: field === 'can_delete' ? newValue : false,
        }];
      }
      await firebaseApi.entities.UserPermission.update(permWithProject.id, { project_permissions: updatedPerms });
    }
    queryClient.invalidateQueries({ queryKey: ['user_permissions'] });
    queryClient.invalidateQueries({ queryKey: ['user_permissions-access'] });
  };

  const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');

  const projectCats = selectedProject ? getProjectCategories(selectedProject.id) : [];
  const groupedByCat = selectedProject
    ? groupPropertiesByCategory(getProjectProperties(selectedProject.id), projectCats)
    : {};

  const modeProjects = useMemo(() => allProjects.filter(p =>
    usageMode === 'rent'
      ? (!p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both')
      : (p.usage_type === 'sale' || p.usage_type === 'both' ||
         allCategories.some(c => c.project_id === p.id && (c.usage_type === 'sale' || c.usage_type === 'both')))
  ), [allProjects, usageMode, allCategories]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return modeProjects;
    const q = searchQuery.toLowerCase();
    return modeProjects.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.name_ku || '').toLowerCase().includes(q) ||
      branchName(p.branch_id).toLowerCase().includes(q)
    );
  }, [modeProjects, searchQuery, allBranches]);

  return (
    <div>
      <PageHeader
        title={selectedProject ? L(selectedProject.name, selectedProject.name_ku) : L('صلاحيات الوصول للعقارات', 'مۆڵەتەکانی دەستگەیشتن بە خانووبەرەکان')}
        subtitle={selectedProject ? L('عرض عقارات المشروع', 'پیشاندانی خانووبەرەکانی پڕۆژە') : L('إدارة رؤية العقارات عبر المشاريع والفروع - يمكنك منح المستخدمين رؤية عقارات مشاريع خارج فرعهم', 'بەڕێوەبردنی بینینی خانووبەرەکان بەپێی پڕۆژە و لقەکان - دەتوانیت مۆڵەت بە بەکارهێنەران بدەیت بۆ بینینی خانووبەرەکانی پڕۆژەکانی دەرەوەی لقیان')}
        actionLabel={selectedProject ? L('العودة لكل المشاريع', 'گەڕانەوە بۆ هەموو پڕۆژەکان') : null}
        onAction={selectedProject ? () => setSelectedProject(null) : null}
      />

      {selectedProject ? (
        <div className="pb-16">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">{L('عقارات المشروع', 'خانووبەرەکانی پڕۆژە')}</h2>
                <p className="text-sm text-muted-foreground">{getProjectProperties(selectedProject.id).length} {L('عقار', 'خانووبەر')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                  title={L('شبكة', 'تۆڕ')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                  title={L('قائمة', 'لیست')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button
                className="gap-1.5"
                onClick={() => setAccessProject(selectedProject)}
              >
                <Shield className="w-4 h-4" />
                {L('صلاحيات الوصول', 'مۆڵەتەکانی دەستگەیشتن')}
              </Button>
            </div>
          </div>

          {getProjectProperties(selectedProject.id).length === 0 ? (
            <EmptyState
              icon={Home}
              title={L('لا توجد عقارات في هذا المشروع', 'هیچ خانووبەرێک نییە لەم پڕۆژەیە')}
              description={L('لم تتم إضافة عقارات لهذا المشروع بعد', 'هێشتا هیچ خانووبەرێک بۆ ئەم پڕۆژەیە زیادنەکراوە')}
            />
          ) : projectCats.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={L('لا توجد تصنيفات', 'هیچ پۆلێک نییە')}
              description={L('أضف تصنيفات للمشروع من لوحة الإدارة', 'پۆل بۆ پڕۆژەکە زیادبکە لە بەشی بەڕێوەبردن')}
            />
          ) : (
            <div className={viewMode === 'grid' ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-6'}>
              {projectCats.map(catObj => {
                const props = groupedByCat[L(catObj.name, catObj.name_ku)] || [];
                return (
                  <div key={catObj.id} className="flex flex-col">
                    <div
                      className="rounded-t-2xl px-4 py-3 flex items-center justify-between mb-2 cursor-pointer select-none"
                      style={{ backgroundColor: catObj.color || '#3b82f6' }}
                      onClick={() => toggleCat(catObj.id)}
                    >
                      <span className="font-bold text-white text-sm truncate">{L(catObj.name, catObj.name_ku)}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{props.length}</span>
                        <ChevronDown className={`w-4 h-4 text-white transition-transform ${collapsedCats.has(catObj.id) ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {!collapsedCats.has(catObj.id) && (
                      <div className="space-y-3 flex-1">
                        {props.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-6 text-center">
                            <p className="text-sm text-muted-foreground">{L('لا توجد عقارات في هذا التصنيف', 'هیچ خانووبەرێک لەم پۆلەدا نییە')}</p>
                          </div>
                        ) : (
                          props.map(prop => (
                            viewMode === 'grid' ? (
                              <PropertyGridCard
                                key={prop.id}
                                property={prop}
                                onView={setViewingProperty}
                                creatorName={(() => { const u = allUsers.find(u => u.id === prop.created_by_id); return u ? u.full_name : ''; })()}
                              />
                            ) : (
                              <PropertyListItem
                                key={prop.id}
                                property={prop}
                                onView={setViewingProperty}
                                creatorName={(() => { const u = allUsers.find(u => u.id === prop.created_by_id); return u ? u.full_name : ''; })()}
                              />
                            )
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {groupedByCat[L('بدون تصنيف', 'بێ پۆل')]?.length > 0 && (
                <div className="flex flex-col">
                  <div className="rounded-t-2xl px-4 py-3 flex items-center justify-between mb-2 bg-gray-400">
                    <span className="font-bold text-white text-sm">{L('بدون تصنيف', 'بێ پۆل')}</span>
                    <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{groupedByCat[L('بدون تصنيف', 'بێ پۆل')].length}</span>
                  </div>
                  <div className="space-y-3">
                    {groupedByCat[L('بدون تصنيف', 'بێ پۆل')].map(prop => (
                      viewMode === 'grid' ? (
                        <PropertyGridCard
                          key={prop.id}
                          property={prop}
                          onView={setViewingProperty}
                          creatorName={(() => { const u = allUsers.find(u => u.id === prop.created_by_id); return u ? u.full_name : ''; })()}
                        />
                      ) : (
                        <PropertyListItem
                          key={prop.id}
                          property={prop}
                          onView={setViewingProperty}
                          creatorName={(() => { const u = allUsers.find(u => u.id === prop.created_by_id); return u ? u.full_name : ''; })()}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant={usageMode === 'rent' ? 'default' : 'outline'}
              onClick={() => setUsageMode('rent')}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              {L('الإيجار', 'کرێ')}
            </Button>
            <Button
              variant={usageMode === 'sale' ? 'default' : 'outline'}
              onClick={() => setUsageMode('sale')}
              className="gap-2"
            >
              <Building2 className="w-4 h-4" />
              {L('البيع', 'فرۆشتن')}
            </Button>
          </div>

          <div className="mb-6 relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={L('ابحث باسم المشروع أو الفرع...', 'گەڕان بە ناوی پڕۆژە یان لق...')}
              className="pr-10"
            />
          </div>

          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={L('لا توجد مشاريع', 'هیچ پڕۆژەیەک نییە')}
              description={L('أضف مشاريع جديدة من لوحة الإدارة', 'پڕۆژەی نوێ زیادبکە لە بەشی بەڕێوەبردن')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProjects.map(project => {
                const props = getProjectProperties(project.id);
                const usersWithAccess = nonAdminUsers.filter(u => getUserProjectAccess(u.id, project.id).can_read).length;

                return (
                  <div
                    key={project.id}
                    className="group relative bg-card rounded-3xl border border-border shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => setSelectedProject(project)}>
                      {project.image_url ? (
                        <img src={project.image_url} alt={L(project.name, project.name_ku)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Building2 className="w-16 h-16 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 right-4 left-4">
                        <h3 className="text-xl font-bold text-white mb-1">{L(project.name, project.name_ku)}</h3>
                        <div className="flex items-center gap-1.5 text-white/80 text-xs">
                          <Building2 className="w-3 h-3" />
                          <span>{branchName(project.branch_id)}</span>
                        </div>
                      </div>
                      {usersWithAccess > 0 && (
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-emerald-500 text-white border-0 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {usersWithAccess} {L('مستخدم', 'بەکارهێنەر')}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{L(project.description, project.description_ku)}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Home className="w-4 h-4" />
                            <span>{props.length}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{L('عقار', 'خانووبەر')}</span>
                        </div>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => { e.stopPropagation(); setAccessProject(project); }}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          {L('صلاحيات', 'مۆڵەت')}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {viewingProperty && (
        <PropertyDetail
          property={viewingProperty}
          onClose={() => setViewingProperty(null)}
          creatorName={(() => {
            const u = allUsers.find(u => u.id === viewingProperty.created_by_id);
            return u ? u.full_name : '';
          })()}
        />
      )}

      {/* Access Management Dialog */}
      {accessProject && (
        <Dialog open onOpenChange={(o) => !o && setAccessProject(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {L('صلاحيات الوصول - ', 'مۆڵەتەکانی دەستگەیشتن - ')}
                {L(accessProject.name, accessProject.name_ku)}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {L('الفرع: ', 'لق: ')}{branchName(accessProject.branch_id)} • {getProjectProperties(accessProject.id).length} {L('عقار', 'خانووبەر')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {L('امنح المستخدمين رؤية عقارات هذا المشروع حتى لو كان خارج فرعهم', 'مۆڵەت بە بەکارهێنەران بدە بۆ بینینی خانووبەرەکانی ئەم پڕۆژەیە تەنانەت ئەگەر دەرەوەی لقیان بێت')}
              </p>
            </DialogHeader>

            {nonAdminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{L('لا يوجد مستخدمون غير المدير', 'هیچ بەکارهێنەرێک نییە جگە لە بەڕێوەبەر')}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs font-bold text-muted-foreground">
                  <span className="flex-1">{L('المستخدم', 'بەکارهێنەر')}</span>
                  <span className="w-16 text-center">{L('قراءة', 'خوێندنەوە')}</span>
                  <span className="w-16 text-center">{L('كتابة', 'نووسین')}</span>
                  <span className="w-16 text-center">{L('حذف', 'سڕینەوە')}</span>
                </div>
                {nonAdminUsers.map(u => {
                  const access = getUserProjectAccess(u.id, accessProject.id);
                  return (
                    <div key={u.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {(u.full_name || u.username || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || u.username}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="w-16 flex justify-center">
                        <input
                          type="checkbox"
                          checked={access.can_read}
                          onChange={() => handleToggleAccess(u.id, accessProject.id, 'can_read')}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                      </div>
                      <div className="w-16 flex justify-center">
                        <input
                          type="checkbox"
                          checked={access.can_write}
                          onChange={() => handleToggleAccess(u.id, accessProject.id, 'can_write')}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                      </div>
                      <div className="w-16 flex justify-center">
                        <input
                          type="checkbox"
                          checked={access.can_delete}
                          onChange={() => handleToggleAccess(u.id, accessProject.id, 'can_delete')}
                          className="w-4 h-4 cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
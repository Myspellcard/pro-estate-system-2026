import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Pencil, Trash2, Download, Layers, User, Phone, MessageCircle, Smartphone, X, Plus } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import PropertyForm from '@/components/properties/PropertyForm';
import PropertyDetail from '@/components/properties/PropertyDetail';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const statusColors = {
  "متاح": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "مؤجر": "bg-blue-50 text-blue-700 border-blue-200",
  "صيانة": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function Properties() {
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [contactOpen, setContactOpen] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    firebaseApi.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can } = useUserPermissions();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Project.filter({ is_active: true, branch_id: activeBranch.id })
      : firebaseApi.entities.Project.filter({ is_active: true }),
  });

  const { data: allProperties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Property.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Property.list('-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => firebaseApi.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Property.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['properties'] }); setShowForm(false); setEditingProperty(null); },
    onError: (err) => { alert('خطأ في الحفظ: ' + (err?.message || 'يرجى التحقق من الحقول المطلوبة')); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Property.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['properties'] }); setShowForm(false); setEditingProperty(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Property.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  const currentUserName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || '';

  const handleSubmit = (data) => {
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate({
        ...data,
        branch_id: activeBranch?.id || '',
        created_by_id: currentUser?.id || data.created_by_id || null,
        created_by_uid: currentUser?.uid || data.created_by_uid || null,
        created_by_email: currentUser?.email || data.created_by_email || '',
        created_by_name: currentUserName || data.created_by_name || '',
        created_by_full_name: currentUserName || data.created_by_full_name || '',
      });
    }
  };

  if (projectsLoading || propertiesLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const projectProperties = selectedProject
    ? allProperties.filter(p => p.project_id === selectedProject.id)
    : [];

  const getPropertyCreatorName = (property) => {
    const savedName = property?.created_by_name || property?.created_by_full_name || property?.creator_name || property?.creatorName;
    if (savedName) return savedName;

    const savedEmail = String(property?.created_by_email || property?.creator_email || '').toLowerCase();
    const savedIds = [
      property?.created_by_id,
      property?.created_by_uid,
      property?.created_by,
      property?.creator_id,
      property?.user_id,
      property?.uid,
    ].filter(Boolean).map(String);

    const user = allUsers.find((u) => {
      const candidates = [u.id, u.uid, u.user_id].filter(Boolean).map(String);
      const email = String(u.email || '').toLowerCase();
      return candidates.some((value) => savedIds.includes(value)) || (savedEmail && email === savedEmail);
    });

    return user?.full_name || user?.name || user?.username || user?.email || savedEmail || '';
  };

  return (
    <div>
      <PageHeader
        title={selectedProject ? L(selectedProject.name, selectedProject.name_ku) : L('المشاريع', 'پڕۆژەکان')}
        subtitle={selectedProject ? L('عرض عقارات المشروع', 'پیشاندانی خانووبەرەکانی پڕۆژە') : L('استعراض العقارات حسب المشاريع', 'پیشاندانی خانووبەرەکان بەپێی پڕۆژەکان')}
        actionLabel={selectedProject ? L('العودة لكل المشاريع', 'گەڕانەوە بۆ هەموو پڕۆژەکان') : null}
        onAction={selectedProject ? () => setSelectedProject(null) : null}
      />

      {!selectedProject ? (
        projects.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={L('لا توجد مشاريع', 'هیچ پڕۆژەیەک نییە')}
            description={L('أضف مشاريع جديدة من لوحة الإدارة', 'پڕۆژەی نوێ زیادبکە لە بەشی بەڕێوەبردن')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map(project => {
              const projectProps = allProperties.filter(p => p.project_id === project.id);
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="group relative bg-card rounded-3xl border border-border shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
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
                      {project.city && (
                        <div className="flex items-center gap-1.5 text-white/80 text-xs">
                          <Building2 className="w-3 h-3" />
                          <span>{L(project.city, project.city_ku)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{L(project.description, project.description_ku)}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{projectProps.length}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{L('عقار', 'خانووبەر')}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                        }}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {L('عرض العقارات', 'پیشاندانی خانووبەرەکان')}
                      </Button>
                    </div>
                  </div>

                  {project.is_active && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-emerald-500 text-white border-0">
                        {L('نشط', 'چالاک')}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{L('عقارات المشروع', 'خانووبەرەکانی پڕۆژە')}</h2>
              <p className="text-sm text-muted-foreground">{projectProperties.length} {L('عقار', 'خانووبەر')}</p>
            </div>
            {can('can_edit_properties') && (
              <Button onClick={() => { setEditingProperty(null); setShowForm(true); }} className="gap-1.5">
                <Plus className="w-4 h-4" />
                {L('إضافة عقار', 'زیادکردنی خانووبەرە')}
              </Button>
            )}
          </div>

          {projectProperties.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={L('لا توجد عقارات', 'هیچ خانووبەرێک نییە')}
              description={L('أضف عقارات لهذا المشروع', 'خانووبەر بۆ ئەم پڕۆژەیە زیادبکە')}
              actionLabel={can('can_edit_properties') ? L('إضافة عقار', 'زیادکردنی خانووبەرە') : null}
              onAction={can('can_edit_properties') ? () => { setEditingProperty(null); setShowForm(true); } : null}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projectProperties.map(prop => (
                <div
                  key={prop.id}
                  className="bg-card rounded-2xl border border-border shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                  onClick={() => setViewingProperty(prop)}
                >
                  {prop.image_url ? (
                    <img src={prop.image_url} alt={L(prop.name, prop.name_ku)} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-muted/50">
                      <Building2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-4">
                  <h4 className="font-bold text-base mb-2">{L(prop.name, prop.name_ku)}</h4>
                  {getPropertyCreatorName(prop) && (
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{getPropertyCreatorName(prop)}</span>
                    </div>
                  )}
                  {prop.monthly_rent > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-secondary">{prop.monthly_rent?.toLocaleString()}</span>
                    </div>
                  )}
                  {(prop.owner_name || prop.owner_phone) && (
                    <div className="mb-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-900 truncate">
                            {L(prop.owner_name || 'غير متوفر', prop.owner_name_ku || 'بەردەست نییە')}
                          </p>
                          {prop.owner_phone && (
                            <p className="text-[10px] text-blue-700">{prop.owner_phone}</p>
                          )}
                        </div>
                      </div>
                      {prop.owner_phone && (
                        <div className="flex gap-2">
                          <a
                            href={`tel:${prop.owner_phone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{L('اتصال', 'پەیوەندی')}</span>
                          </a>
                          <a
                            href={`https://wa.me/${prop.owner_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{prop.status}</Badge>
                      <div className="flex gap-1">
                        {can('can_edit_properties') && (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); setShowForm(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {can('can_delete_properties') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{L('حذف العقار', 'سڕینەوەی خانووبەرە')}</AlertDialogTitle>
                                <AlertDialogDescription>{L('هل أنت متأكد من حذف هذا العقار؟', 'دڵنیایت لە سڕینەوەی ئەم خانووبەرەیە؟')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(prop.id)} className="bg-destructive text-destructive-foreground">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto flex items-start justify-center p-4 pt-10">
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-end mb-3">
              <button onClick={() => { setShowForm(false); setEditingProperty(null); }} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <PropertyForm
              property={editingProperty}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingProperty(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              selectedProject={selectedProject}
              hideHeader
            />
          </div>
        </div>
      )}

      {viewingProperty && (
        <PropertyDetail
          property={viewingProperty}
          currentUser={currentUser}
          onClose={() => setViewingProperty(null)}
          onEdit={(p) => { setEditingProperty(p); setShowForm(true); }}
        />
      )}
    </div>
  );
}

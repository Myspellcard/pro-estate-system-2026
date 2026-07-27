import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { ArrowRight, Building2, Tag, Home, MapPin, Layers, Pencil, LayoutGrid, FolderOpen, ListFilter, Download, Phone, MessageCircle, X, Check, Search, BedDouble, Maximize, User, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import PropertyForm from '@/components/properties/PropertyForm';
import PropertyGroupAccordion from '@/components/properties/PropertyGroupAccordion';
import PropertyTabsView from '@/components/properties/PropertyTabsView';
import PropertyFilterView from '@/components/properties/PropertyFilterView';
import PropertyDetail from '@/components/properties/PropertyDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generatePropertiesPDF } from '@/utils/pdfExport';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function ProjectsView() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const { crossBranchProjectIds = [] } = useUserPermissions();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [addingProperty, setAddingProperty] = useState(false);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [viewMode, setViewMode] = useState('categories');
  const [collapsedCats, setCollapsedCats] = useState(new Set());
  const toggleCat = (id) => setCollapsedCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [catLabelPicker, setCatLabelPicker] = useState(null);
  const [catDefaultLabelsPicker, setCatDefaultLabelsPicker] = useState(null);
  const [statusOpen, setStatusOpen] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(null);

  const { data: statusColors } = useQuery({
    queryKey: ['property-status-colors'],
    queryFn: () => firebaseApi.entities.PropertyStatusColor.list(),
  });

  const getStatusStyle = (status) => {
    const statusColor = statusColors?.find(s => s.status === status);
    if (statusColor && statusColor.is_active) {
      return {
        backgroundColor: statusColor.bg_color,
        color: statusColor.text_color,
        borderColor: statusColor.border_color,
      };
    }
    return {
      backgroundColor: '#f5f5f5',
      color: '#333333',
      borderColor: '#e0e0e0',
    };
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchLabels, setSearchLabels] = useState([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [searchStatuses, setSearchStatuses] = useState([]);
  const [includeAllProperties, setIncludeAllProperties] = useState(false);
  
  const queryClient = useQueryClient();

  const bulkLabelMutation = useMutation({
    mutationFn: async ({ catProps, labelId, add }) => {
      await Promise.all(catProps.map(prop => {
        const current = prop.labels || [];
        const updated = add
          ? (current.includes(labelId) ? current : [...current, labelId])
          : current.filter(id => id !== labelId);
        return firebaseApi.entities.Property.update(prop.id, { labels: updated });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L('تم تطبيق التسمية على جميع العقارات', 'برچەسب بۆ هەموو خانووبەرەکان جێبەجێکرا'));
    },
  });

  const updateCategoryDefaultLabelsMutation = useMutation({
    mutationFn: async ({ categoryId, defaultLabels }) => {
      await firebaseApi.entities.ProjectCategory.update(categoryId, { default_labels: defaultLabels });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] });
      toast.success(L('تم تحديث التسميات الافتراضية', 'برچەسبە بنەڕەتییەکان نوێکرانەوە'));
    },
  });

  const updatePropertyStatusMutation = useMutation({
    mutationFn: async ({ propertyId, newStatus }) => {
      await firebaseApi.entities.Property.update(propertyId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L('تم تغيير الحالة', 'دۆخ گۆڕا'));
      setStatusOpen(null);
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Property.update(editingProperty.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L('تم تحديث العقار', 'خانووبەر نوێکرایەوە'));
      setEditingProperty(null);
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Property.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L('تم إضافة العقار', 'خانووبەر زیادکرا'));
      setAddingProperty(false);
    },
  });

  // Also inject branch_id when creating a property
  const handlePropertySubmit = (formData) => {
    if (editingProperty) {
      updatePropertyMutation.mutate(formData);
    } else {
      createPropertyMutation.mutate({
        ...formData,
        project_id: selectedProject?.id || formData.project_id || null,
        usage_type: formData.usage_type || 'rent',
        branch_id: activeBranch?.id || null,
      });
    }
  };



  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-all-projectsview'],
    queryFn: () => firebaseApi.entities.Project.filter({ is_active: true }),
  });
  // Include cross-branch projects the user has read access to + multi-branch assigned projects
  const visibleProjects = activeBranch?.id
    ? allProjects.filter(p => p.branch_id === activeBranch.id || (p.branch_ids || []).includes(activeBranch.id) || crossBranchProjectIds.includes(p.id))
    : allProjects;
  const projects = visibleProjects.filter(p => !p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both');

  const { data: propertiesRaw = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties-all-projectsview'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });
  // Include properties from active branch + cross-branch accessible projects + multi-branch project properties
  const visibleProjectIds = new Set(visibleProjects.map(p => p.id));
  const properties = activeBranch?.id
    ? propertiesRaw.filter(p => p.branch_id === activeBranch.id || (p.project_id && (visibleProjectIds.has(p.project_id) || crossBranchProjectIds.includes(p.project_id))))
    : propertiesRaw;

  const { data: labels = [] } = useQuery({
    queryKey: ['property-labels'],
    queryFn: () => firebaseApi.entities.PropertyLabel.filter({ is_active: true }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories'],
    queryFn: () => firebaseApi.entities.ProjectCategory.filter({ is_active: true }),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Contract.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Contract.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => firebaseApi.entities.User.list(),
  });

  const getUserById = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown';
  };

  // Helper to check if property is rented (has active contract OR status "مؤجر")
  const isPropertyRented = (property) => {
    const hasActiveContract = contracts.some(c => 
      c.property_id === property.id && 
      c.status === 'نشط'
    );
    const isRentedStatus = property.status === 'مؤجر';
    return hasActiveContract || isRentedStatus;
  };

  let filteredProperties = selectedProject
    ? selectedProject._isVirtual
      ? properties.filter(p => !p.project_id)
      : properties.filter(p => p.project_id === selectedProject.id)
    : properties;

  // Filter only rent properties (or both or unset for backward compatibility)
  filteredProperties = filteredProperties.filter(p => !p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both');

  // Hide rented properties unless searching by status "مؤجر" or includeAllProperties is true
  // Only hide if the property is truly rented (has active contract) - don't hide based on status alone
  if (!includeAllProperties && !searchStatuses.includes('مؤجر')) {
    filteredProperties = filteredProperties.filter(p => {
      const hasActiveContract = contracts.some(c => c.property_id === p.id && c.status === 'نشط');
      return !hasActiveContract;
    });
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProperties = filteredProperties.filter(p => 
      L(p.name, p.name_ku).toLowerCase().includes(q) ||
      L(p.address, p.address_ku).toLowerCase().includes(q) ||
      L(p.project_or_area, p.project_or_area_ku).toLowerCase().includes(q)
    );
  }
  if (searchProject) {
    filteredProperties = filteredProperties.filter(p => p.project_id === searchProject);
  }
  if (searchArea) {
    const a = searchArea.toLowerCase();
    filteredProperties = filteredProperties.filter(p => 
      L(p.project_or_area, p.project_or_area_ku).toLowerCase().includes(a) ||
      L(p.city, p.city_ku).toLowerCase().includes(a)
    );
  }
  if (searchLabels.length > 0) {
    filteredProperties = filteredProperties.filter(p => 
      searchLabels.every(lbl => (p.labels || []).includes(lbl))
    );
  }
  if (searchCategory) {
    filteredProperties = filteredProperties.filter(p => p.category_id === searchCategory);
  }
  if (searchStatuses.length > 0) {
    filteredProperties = filteredProperties.filter(p => searchStatuses.includes(p.status));
  }

  // Show rent categories only (usage_type === 'rent' or 'both' or unset)
  const projectCategories = selectedProject
    ? categories.filter(c => c.project_id === selectedProject.id && (c.usage_type === 'rent' || c.usage_type === 'both' || !c.usage_type)).sort((a, b) => (a.order || 0) - (b.order || 0))
    : categories.filter(c => (!searchProject || c.project_id === searchProject) && (c.usage_type === 'rent' || c.usage_type === 'both' || !c.usage_type)).sort((a, b) => (a.order || 0) - (b.order || 0));

  const uncategorizedKey = L('بدون تصنيف', 'بێ پۆل');
  const groupedByCategory = selectedProject
    ? filteredProperties.reduce((acc, prop) => {
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
      }, {})
    : {};
  const uncategorizedProps = groupedByCategory[uncategorizedKey] || [];

  const groupedByType = filteredProperties.reduce((acc, prop) => {
    const type = prop.type || L('غير مصنف', 'بەشەنەکراو');
    if (!acc[type]) acc[type] = [];
    acc[type].push(prop);
    return acc;
  }, {});

  const groupedByLabels = filteredProperties.reduce((acc, prop) => {
    if (!prop.labels || prop.labels.length === 0) {
      const key = L('بدون تسميات', 'بێ برچەسب');
      if (!acc[key]) acc[key] = [];
      acc[key].push(prop);
    } else {
      prop.labels.forEach(labelId => {
        const label = labels.find(l => l.id === labelId);
        const key = label ? L(label.name, label.name_ku) : L('أخرى', 'هی تر');
        if (!acc[key]) acc[key] = [];
        acc[key].push(prop);
      });
    }
    return acc;
  }, {});

  if (projectsLoading || propertiesLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={selectedProject ? (selectedProject._isVirtual ? L('عقارات بدون مشروع', 'خانووبەرەکانی بێ پڕۆژە') : L(selectedProject.name, selectedProject.name_ku)) : L('الإيجار', 'کرێ')}
        subtitle={selectedProject ? L('عرض عقارات المشروع', 'پیشاندانی خانووبەرەکانی پڕۆژە') : L('استعراض العقارات', 'پیشاندانی خانووبەرەکان')}
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
          <>
          <div className="mb-4">
            <Button className="gap-2" onClick={() => setAddingProperty(true)}>
              <Home className="w-4 h-4" />
              {L('إضافة عقار جديد', 'زیادکردنی خانووبەرێکی نوێ')}
            </Button>
          </div>
          {/* Unassigned properties virtual project */}
          {(() => {
            const unassignedProps = properties.filter(p =>
              !p.project_id &&
              (!p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both') &&
              !contracts.some(c => c.property_id === p.id && c.status === 'نشط')
            );
            if (unassignedProps.length === 0) return null;
            const VIRTUAL_PROJECT = { id: '__unassigned__', _isVirtual: true };
            return (
              <div className="mb-4">
                <div
                  onClick={() => setSelectedProject(VIRTUAL_PROJECT)}
                  className="group relative bg-card rounded-3xl border-2 border-dashed border-muted-foreground/30 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex items-center gap-5 p-5"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Home className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground">{L('عقارات بدون مشروع', 'خانووبەرەکانی بێ پڕۆژە')}</h3>
                    <p className="text-sm text-muted-foreground">{unassignedProps.length} {L('عقار غير مُصنَّف', 'خانووبەری پۆلنەکراو')}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" onClick={e => { e.stopPropagation(); setSelectedProject(VIRTUAL_PROJECT); }}>
                    <Layers className="w-3.5 h-3.5" />
                    {L('عرض', 'پیشاندان')}
                  </Button>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map(project => {
              const projectProps = properties.filter(p => 
                p.project_id === project.id && 
                (p.usage_type === 'rent' || p.usage_type === 'both' || !p.usage_type) &&
                !contracts.some(c => c.property_id === p.id && c.status === 'نشط')
              );
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
                          <MapPin className="w-3 h-3" />
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
                          <Home className="w-4 h-4" />
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
          </>
        )
      ) : (
        <div className="pb-16">
          <div className="mb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSearchOpen(!searchOpen)}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              {L('بحث متقدم', 'گەڕانی پێشکەوتووی')}
            </Button>
          </div>

          {searchOpen && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('بحث عام', 'گەڕانی گشتی')}</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder={L('الاسم، العنوان...', 'ناو، ناونیشان...')}
                    className="pr-9"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('المشروع', 'پڕۆژە')}</Label>
                <Select value={searchProject} onValueChange={setSearchProject}>
                  <SelectTrigger>
                    <SelectValue placeholder={L('كل المشاريع', 'هەموو پڕۆژەکان')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{L('كل المشاريع', 'هەموو پڕۆژەکان')}</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{L(p.name, p.name_ku)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('المنطقة/المدينة', 'ناوچە/شار')}</Label>
                <Input 
                  value={searchArea} 
                  onChange={e => setSearchArea(e.target.value)} 
                  placeholder={L('المنطقة أو المدينة', 'ناوچە یان شار')}
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('التصنيف', 'پۆل')}</Label>
                <Select value={searchCategory} onValueChange={setSearchCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={L('كل التصنيفات', 'هەموو پۆلەکان')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{L('كل التصنيفات', 'هەموو پۆلەکان')}</SelectItem>
                    {projectCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{L(c.name, c.name_ku)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('التسميات', 'برچەسبەکان')}</Label>
                <Select onValueChange={v => {
                  if (v && !searchLabels.includes(v)) {
                    setSearchLabels([...searchLabels, v]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={L('أضف تسمية...', 'برچەسبێک زیادکرد...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {labels.filter(l => !searchLabels.includes(l.id)).map(l => (
                      <SelectItem key={l.id} value={l.id}>{L(l.name, l.name_ku)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {searchLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {searchLabels.map(lblId => {
                      const lbl = labels.find(l => l.id === lblId);
                      return lbl ? (
                        <Badge key={lblId} style={{ backgroundColor: lbl.color, color: '#fff' }} className="text-xs px-2 py-0.5 cursor-pointer" onClick={() => setSearchLabels(searchLabels.filter(l => l !== lblId))}>
                          {L(lbl.name, lbl.name_ku)} <X className="w-3 h-3 mr-1" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('الحالة', 'دۆخ')}</Label>
                <Select onValueChange={v => {
                  if (v === 'all') {
                    setIncludeAllProperties(true);
                    setSearchStatuses([]);
                  } else if (v) {
                    setIncludeAllProperties(false);
                    if (!searchStatuses.includes(v)) {
                      setSearchStatuses([...searchStatuses, v]);
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={L('أضف حالة...', 'دۆخێک زیادکرد...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{L('كل الخصائص', 'هەموو خانووبەرەکان')}</SelectItem>
                    {['متاح', 'مؤجر', 'صيانة', 'حجز مؤقت', 'قريباً', 'حجز', 'تأمين', 'دفع', 'انذار الأخير'].filter(s => !searchStatuses.includes(s)).map(status => (
                      <SelectItem key={status} value={status}>{L(status, status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {includeAllProperties && (
                  <Badge className="mt-2 bg-primary text-primary-foreground" variant="default">
                    {L('عرض جميع الخصائص', 'پیشاندانی هەموو خانووبەرەکان')}
                  </Badge>
                )}
                {searchStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {searchStatuses.map(status => (
                      <Badge key={status} variant="secondary" className="text-xs px-2 py-0.5 cursor-pointer" onClick={() => setSearchStatuses(searchStatuses.filter(s => s !== status))}>
                        {L(status, status)} <X className="w-3 h-3 mr-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {(searchLabels.length > 0 || searchQuery || searchProject || searchArea || searchCategory || searchStatuses.length > 0 || includeAllProperties) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{L('الفلاتر النشطة:', 'فلتەرە چالاکەکان:')}</span>
              {includeAllProperties && (
                <Badge className="text-xs cursor-pointer bg-primary text-primary-foreground" onClick={() => setIncludeAllProperties(false)}>
                  {L('كل الخصائص', 'هەموو خانووبەرەکان')} <X className="w-3 h-3 mr-1" />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearchQuery('')}>
                  {searchQuery} <X className="w-3 h-3 mr-1" />
                </Badge>
              )}
              {searchProject && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearchProject('')}>
                  {L(projects.find(p => p.id === searchProject)?.name || '', projects.find(p => p.id === searchProject)?.name_ku || '')} <X className="w-3 h-3 mr-1" />
                </Badge>
              )}
              {searchArea && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearchArea('')}>
                  {searchArea} <X className="w-3 h-3 mr-1" />
                </Badge>
              )}
              {searchCategory && (
                <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearchCategory('')}>
                  {L(projectCategories.find(c => c.id === searchCategory)?.name || '', projectCategories.find(c => c.id === searchCategory)?.name_ku || '')} <X className="w-3 h-3 mr-1" />
                </Badge>
              )}
              {searchLabels.map(lblId => {
                const lbl = labels.find(l => l.id === lblId);
                return lbl ? (
                  <Badge key={lblId} style={{ backgroundColor: lbl.color, color: '#fff' }} className="text-xs cursor-pointer" onClick={() => setSearchLabels(searchLabels.filter(l => l !== lblId))}>
                    {L(lbl.name, lbl.name_ku)} <X className="w-3 h-3 mr-1" />
                  </Badge>
                ) : null;
              })}
              {searchStatuses.map(status => (
                <Badge key={status} variant="secondary" className="text-xs cursor-pointer" onClick={() => setSearchStatuses(searchStatuses.filter(s => s !== status))}>
                  {L(status, status)} <X className="w-3 h-3 mr-1" />
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => {
                  setSearchQuery('');
                  setSearchProject('');
                  setSearchArea('');
                  setSearchLabels([]);
                  setSearchCategory('');
                  setSearchStatuses([]);
                  setIncludeAllProperties(false);
                }}
              >
                {L('مسح الكل', 'سڕینەوەی هەموو')}
              </Button>
            </div>
            )}
          </div>
          )}
          
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold">{L('عقارات المشروع', 'خانووبەرەکانی پڕۆژە')}</h2>
                <p className="text-sm text-muted-foreground">{filteredProperties.length} {L('عقار', 'خانووبەر')}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button className="gap-2" onClick={() => setAddingProperty(true)}>
                <Home className="w-4 h-4" />
                {L('إضافة عقار', 'زیادکردنی خانووبەر')}
              </Button>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="categories">
                    <span className="flex items-center gap-2"><Layers className="w-4 h-4" />{L('حسب التصنيفات', 'بەپێی پۆلەکان')}</span>
                  </SelectItem>
                  <SelectItem value="accordion">
                    <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" />{L('مجموعات', 'گرووپەکان')}</span>
                  </SelectItem>
                  <SelectItem value="tabs">
                    <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />{L('تبويبات', 'تابەکان')}</span>
                  </SelectItem>
                  <SelectItem value="filter">
                    <span className="flex items-center gap-2"><ListFilter className="w-4 h-4" />{L('فلاتر', 'فلتەرەکان')}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => generatePropertiesPDF(filteredProperties)}>
                <Download className="w-4 h-4" /> {L('تحميل PDF', 'داگرتنی PDF')}
              </Button>
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <EmptyState
              icon={Home}
              title={L('لا توجد عقارات', 'هیچ خانووبەرێک نییە')}
              description={L('لا توجد عقارات تطابق معايير البحث', 'هیچ خانووبەرێک هاوتا نییە لەگەڵ پێوەرەکانی گەڕان')}
            />
          ) : (
            <>
              {viewMode === 'categories' && projectCategories.length > 0 && (
                <div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projectCategories.map(catObj => {
                      const props = groupedByCategory[L(catObj.name, catObj.name_ku)] || [];
                      return (
                        <div key={catObj.id} className="flex flex-col">
                          <div
                            className="rounded-t-2xl px-4 py-3 flex items-center justify-between mb-2 cursor-pointer select-none"
                            style={{ backgroundColor: catObj.color || '#3b82f6' }}
                            onClick={() => toggleCat(catObj.id)}
                          >
                            <span className="font-bold text-white text-sm truncate">{L(catObj.name, catObj.name_ku)}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                className="bg-white/20 hover:bg-white/40 text-white rounded-full p-1 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setCatLabelPicker(catLabelPicker === catObj.id ? null : catObj.id); }}
                                title={L('تطبيق تسمية على الكل', 'برچەسب بۆ هەموو')}
                              >
                                <Tag className="w-3 h-3" />
                              </button>
                              <button
                                className="bg-white/20 hover:bg-white/40 text-white rounded-full p-1 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setCatDefaultLabelsPicker(catDefaultLabelsPicker === catObj.id ? null : catObj.id); }}
                                title={L('تعيين التسميات الافتراضية', 'دیاریکردنی برچەسبە بنەڕەتییەکان')}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{props.length}</span>
                              <span className="text-white text-xs">{collapsedCats.has(catObj.id) ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          {catLabelPicker === catObj.id && (
                            <div className="mb-2 bg-card rounded-xl border border-border shadow-lg p-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">{L('تطبيق تسمية على جميع عقارات هذا التصنيف', 'برچەسب بۆ هەموو خانووبەرەکانی ئەم پۆلە جێبەجێبکە')}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {labels.map(label => {
                                  const allHave = props.length > 0 && props.every(p => (p.labels || []).includes(label.id));
                                  const someHave = props.some(p => (p.labels || []).includes(label.id));
                                  return (
                                    <button
                                      key={label.id}
                                      onClick={() => bulkLabelMutation.mutate({ catProps: props, labelId: label.id, add: !allHave })}
                                      disabled={bulkLabelMutation.isPending}
                                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border-2 transition-all"
                                      style={{
                                        backgroundColor: allHave ? label.color : 'transparent',
                                        borderColor: label.color,
                                        color: allHave ? '#fff' : label.color,
                                        opacity: someHave && !allHave ? 0.7 : 1,
                                      }}
                                    >
                                      {allHave && <Check className="w-3 h-3" />}
                                      {L(label.name, label.name_ku)}
                                      {someHave && !allHave && <span className="text-[9px] opacity-60">({L('جزئي', 'بەشێک')})</span>}
                                    </button>
                                  );
                                })}
                              </div>
                              <button className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCatLabelPicker(null)}>{L('إغلاق', 'داخستن')}</button>
                            </div>
                          )}
                          {catDefaultLabelsPicker === catObj.id && (
                            <div className="mb-2 bg-card rounded-xl border border-border shadow-lg p-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">{L('التسميات الافتراضية لهذا التصنيف', 'برچەسبە بنەڕەتییەکانی ئەم پۆلە')}</p>
                              <p className="text-[10px] text-muted-foreground mb-2">{L('أي عقار جديد يُضاف لهذا التصنيف سيأخذ هذه التسميات تلقائياً', 'هەر خانووبەرێکی نوێ بۆ ئەم پۆلە زیادبکرێت ئەم برچەسبانە وەردەگرێت')}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {labels.map(label => {
                                  const hasDefault = (catObj.default_labels || []).includes(label.id);
                                  return (
                                    <button
                                      key={label.id}
                                      onClick={() => {
                                        const current = catObj.default_labels || [];
                                        const updated = hasDefault
                                          ? current.filter(id => id !== label.id)
                                          : [...current, label.id];
                                        updateCategoryDefaultLabelsMutation.mutate({ categoryId: catObj.id, defaultLabels: updated });
                                      }}
                                      disabled={updateCategoryDefaultLabelsMutation.isPending}
                                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border-2 transition-all"
                                      style={{
                                        backgroundColor: hasDefault ? label.color : 'transparent',
                                        borderColor: label.color,
                                        color: hasDefault ? '#fff' : label.color,
                                      }}
                                    >
                                      {hasDefault && <Check className="w-3 h-3" />}
                                      {L(label.name, label.name_ku)}
                                    </button>
                                  );
                                })}
                              </div>
                              <button className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setCatDefaultLabelsPicker(null)}>{L('إغلاق', 'داخستن')}</button>
                            </div>
                          )}
                          {!collapsedCats.has(catObj.id) && (
                            <div className="space-y-3 flex-1">
                              {props.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                                  <p className="text-sm text-muted-foreground mb-1">{L('لا توجد عقارات في هذا التصنيف', 'هیچ خانووبەرێک لەم پۆلەدا نییە')}</p>
                                  <p className="text-xs text-muted-foreground">{L('أضف عقاراً جديداً من قسم العقارات', 'خانووبەرێکی نوێ زیادبکە لە بەشی خانووبەرەکان')}</p>
                                </div>
                              ) : (
                                props.map(prop => (
                                  <div
                                    key={prop.id}
                                    className="bg-card rounded-2xl border border-border shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                                    onClick={() => setViewingProperty(prop)}
                                  >
                                    {prop.image_url ? (
                                      <img src={prop.image_url} alt={L(prop.name, prop.name_ku)} className="w-full h-40 object-cover" />
                                    ) : (
                                      <div className="w-full h-32 flex items-center justify-center" style={{ backgroundColor: (catObj.color || '#3b82f6') + '15' }}>
                                        <Home className="w-12 h-12" style={{ color: catObj.color || '#3b82f6' }} />
                                      </div>
                                    )}
                                    <div className="p-4 text-center">
                                      <div className="mb-2">
                                        <h4 className="font-bold text-base leading-tight">{L(prop.name, prop.name_ku)}</h4>
                                      </div>
                                      {prop.monthly_rent > 0 && (
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                          <span className="text-sm font-bold text-primary">{prop.monthly_rent?.toLocaleString()}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-center gap-2 mb-3">
                                        <Popover open={statusOpen === prop.id} onOpenChange={(open) => setStatusOpen(open ? prop.id : null)}>
                                          <PopoverTrigger asChild>
                                            <div onClick={e => e.stopPropagation()}>
                                              <Badge className="border-0 text-xs px-2 py-1 h-6 cursor-pointer hover:shadow-md" style={getStatusStyle(prop.status)}>
                                                {prop.status}
                                              </Badge>
                                            </div>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-40 p-2 z-[9999]" side="bottom" align="end">
                                            <div className="space-y-1">
                                              {['متاح', 'حجز مؤقت', 'مؤجر', 'صيانة'].map(status => (
                                                <button
                                                  key={status}
                                                  onClick={() => updatePropertyStatusMutation.mutate({ propertyId: prop.id, newStatus: status })}
                                                  disabled={updatePropertyStatusMutation.isPending}
                                                  className={`w-full px-3 py-2 text-xs rounded-md text-left transition-colors ${
                                                    prop.status === status
                                                      ? 'bg-primary text-primary-foreground font-semibold'
                                                      : 'hover:bg-muted'
                                                  }`}
                                                >
                                                  {status}
                                                </button>
                                              ))}
                                              <div className="border-t mt-2 pt-2">
                                                <button
                                                  onClick={() => {
                                                    if (confirm(L('هل تريد إلغاء هذا العقار؟', 'دەتەوێت ئەم خانووبەرە هەڵبوەشێنیتەوە؟'))) {
                                                      updatePropertyStatusMutation.mutate({ propertyId: prop.id, newStatus: 'ملغى' });
                                                    }
                                                  }}
                                                  disabled={updatePropertyStatusMutation.isPending}
                                                  className="w-full px-3 py-2 text-xs rounded-md text-left transition-colors text-red-600 hover:bg-red-50"
                                                >
                                                  {L('إلغاء العقار', 'هەڵوەشاندنەوەی خانووبەر')}
                                                </button>
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                        <a
                                          href={prop.owner_phone ? `tel:${prop.owner_phone}` : '#'}
                                          onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                            prop.owner_phone ? 'hover:bg-green-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                                          }`}
                                          title={prop.owner_phone || 'No phone'}
                                        >
                                          <Phone className={`w-5 h-5 ${ prop.owner_phone ? 'text-green-600' : 'text-muted-foreground' }`} />
                                        </a>
                                        <a
                                          href={prop.owner_phone ? `https://wa.me/${prop.owner_phone.replace(/\D/g, '')}` : '#'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                            prop.owner_phone ? 'hover:bg-emerald-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                                          }`}
                                          title={prop.owner_phone ? 'WhatsApp' : 'No phone'}
                                        >
                                          <MessageCircle className={`w-5 h-5 ${ prop.owner_phone ? 'text-emerald-500' : 'text-muted-foreground' }`} />
                                        </a>
                                        <button className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); }}>
                                          <Pencil className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                      </div>
                                      <div className="space-y-2 mt-3">
                                        <div className="flex items-center justify-center px-2">
                                          <a
                                            href={prop.owner_phone ? `https://wa.me/${prop.owner_phone.replace(/\D/g, '')}` : '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                              prop.owner_phone 
                                                ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-300 text-blue-700 hover:shadow-md cursor-pointer' 
                                                : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                                            }`}
                                          >
                                            <MessageCircle className={`w-2.5 h-2.5 ${prop.owner_phone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                            <span className="truncate max-w-[100px]">{getUserById(prop.created_by_id)}</span>
                                          </a>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                          {prop.area_sqm > 0 && (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                              <Maximize className="w-3.5 h-3.5" />
                                              <span className="text-xs font-medium">{prop.area_sqm} {L('م²', 'م²')}</span>
                                            </div>
                                          )}
                                          {prop.rooms > 0 && (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                              <BedDouble className="w-3.5 h-3.5" />
                                              <span className="text-xs font-medium">{prop.rooms} {L('غرف', 'ژوور')}</span>
                                            </div>
                                          )}
                                          {prop.bathrooms > 0 && (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                              <span className="text-xs">🚿</span>
                                              <span className="text-xs font-medium">{prop.bathrooms}</span>
                                            </div>
                                          )}
                                          {(prop.view || prop.view_ku) && (
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                                              <span className="text-xs">🧭</span>
                                              <span className="text-xs font-medium">{L(prop.view, prop.view_ku)}</span>
                                            </div>
                                          )}
                                        </div>
                                        {prop.address && (
                                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground px-2">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate max-w-full">{L(prop.address, prop.address_ku)}</span>
                                          </div>
                                        )}
                                      </div>
                                      {prop.labels && prop.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                          {prop.labels.slice(0, 4).map(labelId => {
                                            const label = labels.find(l => l.id === labelId);
                                            return label ? (
                                              <Badge key={labelId} style={{ backgroundColor: label.color, color: '#fff' }} className="text-xs px-2 py-0.5">
                                                {L(label.name, label.name_ku)}
                                              </Badge>
                                            ) : null;
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {groupedByCategory[L('بدون تصنيف', 'بێ پۆل')]?.length > 0 && (
                      <div className="flex flex-col">
                        <div className="rounded-t-2xl px-4 py-3 flex items-center justify-between mb-2 bg-gray-400">
                          <span className="font-bold text-white text-sm">{L('بدون تصنيف', 'بێ پۆل')}</span>
                          <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{groupedByCategory[L('بدون تصنيف', 'بێ پۆل')].length}</span>
                        </div>
                        <div className="space-y-2">
                          {groupedByCategory[L('بدون تصنيف', 'بێ پۆل')].map(prop => (
                            <div
                              key={prop.id}
                              className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer p-3"
                              onClick={() => setViewingProperty(prop)}
                            >
                              <div className="text-center space-y-2">
                                <h4 className="font-semibold text-xs">{L(prop.name, prop.name_ku)}</h4>
                                {prop.monthly_rent > 0 && (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs font-bold text-primary">{prop.monthly_rent?.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-center gap-2">
                                  <Popover open={statusOpen === prop.id} onOpenChange={(open) => setStatusOpen(open ? prop.id : null)}>
                                    <PopoverTrigger asChild>
                                      <div onClick={e => e.stopPropagation()}>
                                        <Badge className="border-0 text-xs px-2 py-1 h-6 cursor-pointer hover:shadow-md" style={getStatusStyle(prop.status)}>
                                          {prop.status}
                                        </Badge>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-32 p-2 z-[100]" side="bottom" align="end">
                                      <div className="space-y-1">
                                        {['متاح', 'حجز مؤقت'].map(status => (
                                          <button
                                            key={status}
                                            onClick={() => updatePropertyStatusMutation.mutate({ propertyId: prop.id, newStatus: status })}
                                            disabled={updatePropertyStatusMutation.isPending}
                                            className={`w-full px-3 py-2 text-xs rounded-md text-left transition-colors ${
                                              prop.status === status
                                                ? 'bg-primary text-primary-foreground font-semibold'
                                                : 'hover:bg-muted'
                                            }`}
                                          >
                                            {status}
                                          </button>
                                        ))}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <a
                                    href={prop.owner_phone ? `tel:${prop.owner_phone}` : '#'}
                                    onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                      prop.owner_phone ? 'hover:bg-green-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                                    }`}
                                    title={prop.owner_phone || 'No phone'}
                                  >
                                    <Phone className={`w-5 h-5 ${ prop.owner_phone ? 'text-green-600' : 'text-muted-foreground' }`} />
                                  </a>
                                  <a
                                    href={prop.owner_phone ? `https://wa.me/${prop.owner_phone.replace(/\D/g, '')}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                      prop.owner_phone ? 'hover:bg-emerald-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                                    }`}
                                    title={prop.owner_phone ? 'WhatsApp' : 'No phone'}
                                  >
                                    <MessageCircle className={`w-5 h-5 ${ prop.owner_phone ? 'text-emerald-500' : 'text-muted-foreground' }`} />
                                  </a>
                                  <button className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); }}>
                                    <Pencil className="w-5 h-5 text-muted-foreground" />
                                  </button>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                  <div className="flex items-center justify-center px-1">
                                    <a
                                      href={prop.owner_phone ? `https://wa.me/${prop.owner_phone.replace(/\D/g, '')}` : '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => { if (!prop.owner_phone) e.preventDefault(); e.stopPropagation(); }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                                        prop.owner_phone 
                                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-300 text-blue-700 hover:shadow-md cursor-pointer' 
                                          : 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                                      }`}
                                    >
                                      <MessageCircle className={`w-2.5 h-2.5 ${prop.owner_phone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                      <span className="truncate max-w-[100px]">{getUserById(prop.created_by_id)}</span>
                                    </a>
                                  </div>
                                  <div className="flex items-center justify-center gap-2">
                                    {prop.area_sqm > 0 && (
                                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
                                        <Maximize className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">{prop.area_sqm} {L('م²', 'م²')}</span>
                                      </div>
                                    )}
                                    {prop.rooms > 0 && (
                                      <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
                                        <BedDouble className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">{prop.rooms} {L('غرف', 'ژوور')}</span>
                                      </div>
                                    )}
                                  </div>
                                  {prop.address && (
                                    <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground px-1">
                                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span className="truncate max-w-full">{L(prop.address, prop.address_ku)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'accordion' && (
                <div>
                  {(() => {
                    const grouped = filteredProperties.reduce((acc, prop) => {
                      const key = prop.project_or_area || L('بدون مشروع', 'بێ پڕۆژە');
                      if (!acc[key]) acc[key] = { ar: key, ku: prop.project_or_area_ku || key, items: [] };
                      acc[key].items.push(prop);
                      return acc;
                    }, {});
                    return Object.entries(grouped).map(([key, data]) => (
                      <PropertyGroupAccordion
                        key={key}
                        title={data.ar}
                        titleKu={data.ku}
                        properties={data.items}
                        onEdit={(p) => setEditingProperty(p)}
                        onView={setViewingProperty}
                      />
                    ));
                  })()}
                </div>
              )}

              {viewMode === 'tabs' && (
                <PropertyTabsView
                  properties={filteredProperties}
                  onEdit={(p) => setEditingProperty(p)}
                  onView={setViewingProperty}
                />
              )}

              {viewMode === 'filter' && (
                <PropertyFilterView
                  properties={filteredProperties}
                  onEdit={(p) => setEditingProperty(p)}
                  onView={setViewingProperty}
                />
              )}

              {viewMode === 'categories' && projectCategories.length === 0 && (
                <EmptyState
                  icon={Layers}
                  title={L('لا توجد تصنيفات', 'هیچ پۆلێک نییە')}
                  description={L('أضف تصنيفات للمشروع من لوحة الإدارة', 'پۆل بۆ پڕۆژەکە زیادبکە لە بەشی بەڕێوەبردن')}
                  actionLabel={L('العودة للمجموعات', 'گەڕانەوە بۆ گرووپەکان')}
                  onAction={() => setViewMode('accordion')}
                />
              )}
            </>
          )}

          <Dialog open={addingProperty} onOpenChange={setAddingProperty}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{L('إضافة عقار جديد', 'زیادکردنی خانووبەرێکی نوێ')}</DialogTitle>
              </DialogHeader>
              <PropertyForm
                property={null}
                onSubmit={handlePropertySubmit}
                onCancel={() => setAddingProperty(false)}
                isLoading={createPropertyMutation.isPending}
                categoryUsageType="rent"
                selectedProject={selectedProject?._isVirtual ? null : selectedProject}
                hideHeader
              />
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible" onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{L('تعديل العقار', 'دەستکاریکردنی خانووبەر')}</DialogTitle>
              </DialogHeader>
              <PropertyForm
                property={editingProperty}
                onSubmit={handlePropertySubmit}
                onCancel={() => setEditingProperty(null)}
                isLoading={updatePropertyMutation.isPending}
                categoryUsageType="rent"
                hideHeader
              />
            </DialogContent>
          </Dialog>

          {viewingProperty && (
            <PropertyDetail
              property={viewingProperty}
              onClose={() => setViewingProperty(null)}
              onEdit={(p) => { setEditingProperty(p); setViewingProperty(null); }}
            />
          )}
        </div>
      )}

      {/* Add property dialog from start page (no project selected) */}
      {!selectedProject && (
        <Dialog open={addingProperty} onOpenChange={setAddingProperty}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{L('إضافة عقار جديد', 'زیادکردنی خانووبەرێکی نوێ')}</DialogTitle>
            </DialogHeader>
            <PropertyForm
              property={null}
              onSubmit={handlePropertySubmit}
              onCancel={() => setAddingProperty(false)}
              isLoading={createPropertyMutation.isPending}
              categoryUsageType="rent"
              selectedProject={null}
              hideHeader
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
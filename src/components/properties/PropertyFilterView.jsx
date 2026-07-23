import React, { useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import PropertyGridCard from './PropertyGridCard';

export default function PropertyFilterView({ properties, onEdit, onDelete, onView }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique projects/areas
  const projects = [...new Set(properties.map(p => p.project_or_area).filter(Boolean))];

  // Filter properties
  const filtered = properties.filter(p => {
    const matchProject = selectedProject === 'all' || p.project_or_area === selectedProject;
    const matchSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name_ku && p.name_ku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.project_or_area && p.project_or_area.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchProject && matchSearch;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card rounded-xl border border-border">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={L('بحث...', 'گەڕان...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full md:w-[250px]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder={L('جميع المشاريع', 'هەموو پڕۆژەکان')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('جميع المشاريع', 'هەموو پڕۆژەکان')}</SelectItem>
              {projects.map(project => (
                <SelectItem key={project} value={project}>
                  {L(project, properties.find(p => p.project_or_area === project)?.project_or_area_ku)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{L('لا توجد نتائج', 'هیچ ئەنجامێک نییە')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(property => (
            <PropertyGridCard
              key={property.id}
              property={property}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
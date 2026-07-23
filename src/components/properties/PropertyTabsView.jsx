import React from 'react';
import { Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/context/LanguageContext';
import PropertyGridCard from './PropertyGridCard';

export default function PropertyTabsView({ properties, onEdit, onDelete, onView }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  // Group properties by project/area
  const grouped = properties.reduce((acc, prop) => {
    const key = prop.project_or_area || L('بدون مشروع', 'بێ پڕۆژە');
    if (!acc[key]) acc[key] = [];
    acc[key].push(prop);
    return acc;
  }, {});

  const tabs = Object.keys(grouped);

  if (tabs.length === 0) return null;

  return (
    <Tabs defaultValue={tabs[0]} className="w-full">
      <TabsList className="w-full justify-start gap-2 bg-transparent border-b border-border rounded-none p-0 h-auto overflow-x-auto">
        {tabs.map((tab, idx) => (
          <TabsTrigger
            key={tab}
            value={tab}
            className="px-4 py-2.5 rounded-t-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary-foreground whitespace-nowrap"
          >
            {L(tab, properties.find(p => p.project_or_area === tab)?.project_or_area_ku)}
            <span className="mr-2 text-xs opacity-70">({grouped[tab].length})</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab} value={tab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {grouped[tab].map(property => (
              <PropertyGridCard
                key={property.id}
                property={property}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
import React from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Home, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseISO, addMonths, isBefore } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';

export default function AnalyticsPage() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  
  const t = {
    revenue: L('الإيرادات حسب العقار', 'داهات بەپێی خانووبەرە'),
    paymentStatus: L('حالة الدفع', 'دۆخی پارەدان'),
    maintenanceCosts: L('تكاليف الصيانة حسب الفئة', 'تێچووی چاککردنەوە بەپێی جۆر'),
    financialSummary: L('الملخص المالي', 'پوختەی دارایی'),
    leaseAlerts: L('تنبيهات انتهاء العقود (خلال 90 يوم)', 'ئاگادارکردنەوەی کۆتاییهاتنی گرێبەستەکان (لە ٩٠ ڕۆژدا)'),
    daysRemaining: L('يوم متبقي', 'ڕۆژ ماوە'),
    collectedRevenue: L('الإيرادات المستحصلة', 'داهاتە بەدەستهاتووەکان'),
    overduePayments: L('المدفوعات المتأخرة', 'پارەدانە دواکەوتووەکان'),
    occupancyRate: L('معدل الإشغال', 'ڕێژەی داگیرکردن'),
    pendingPayments: L('المدفوعات المعلقة', 'پارەدانە وەستاوەکان'),
    maintenanceCost: L('تكاليف الصيانة', 'تێچووی چاککردنەوە'),
  };
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => firebaseApi.entities.Contract.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => firebaseApi.entities.Invoice.list(),
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => firebaseApi.entities.Maintenance.list(),
  });

  // Calculate metrics
  const totalRevenue = invoices
    .filter(i => i.status === 'مدفوعة')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const pendingPayments = invoices
    .filter(i => i.status === 'معلقة')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const overduePayments = invoices
    .filter(i => i.status === 'متأخرة')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const occupancyRate = properties.length > 0
    ? Math.round((contracts.filter(c => c.status === 'نشط').length / properties.length) * 100)
    : 0;

  const maintenanceCost = maintenance
    .filter(m => m.status === 'مكتمل')
    .reduce((sum, m) => sum + (m.cost || 0), 0);

  // Revenue by property
  const revenueByProperty = properties.map(property => {
    const propertyInvoices = invoices.filter(i => i.property_name === property.name && i.status === 'مدفوعة');
    return {
      name: property.name,
      revenue: propertyInvoices.reduce((sum, i) => sum + (i.amount || 0), 0),
    };
  }).filter(p => p.revenue > 0).slice(0, 8);

  // Lease expiration alerts
  const upcomingExpirations = contracts
    .filter(c => c.status === 'نشط')
    .map(c => ({
      ...c,
      daysUntilExpiry: Math.ceil((parseISO(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(c => c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 90)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 5);

  // Payment status breakdown
  const paymentBreakdown = [
    { name: 'مدفوعة', value: invoices.filter(i => i.status === 'مدفوعة').length, color: '#10b981' },
    { name: 'معلقة', value: invoices.filter(i => i.status === 'معلقة').length, color: '#f59e0b' },
    { name: 'متأخرة', value: invoices.filter(i => i.status === 'متأخرة').length, color: '#ef4444' },
  ];

  // Maintenance by category
  const maintenanceByCategory = {};
  maintenance.forEach(m => {
    maintenanceByCategory[m.category] = (maintenanceByCategory[m.category] || 0) + (m.cost || 0);
  });
  const maintenanceData = Object.entries(maintenanceByCategory).map(([category, cost]) => ({
    name: category,
    cost,
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title={L('التحليلات والتقارير', 'شیكاری و ڕاپۆرتەکان')} 
        subtitle={L('عرض شامل للأداء المالي والتشغيلي', 'پێشاندانێکی تەواوی کارایی دارایی و کرداری')}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={DollarSign}
          title={t.collectedRevenue}
          value={totalRevenue.toLocaleString()}
          color="emerald"
        />
        <StatCard 
          icon={AlertTriangle}
          title={t.overduePayments}
          value={overduePayments.toLocaleString()}
          color="destructive"
        />
        <StatCard 
          icon={Home}
          title={t.occupancyRate}
          value={`${occupancyRate}%`}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Property */}
        {revenueByProperty.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.revenue}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByProperty}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#2d3e50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Payment Status */}
        {paymentBreakdown.some(p => p.value > 0) && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.paymentStatus}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Costs */}
        {maintenanceData.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t.maintenanceCosts}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cost" fill="#e8b748" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t.financialSummary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-muted-foreground">{t.collectedRevenue}</span>
              <span className="font-bold text-emerald-600">{totalRevenue.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-muted-foreground">{t.pendingPayments}</span>
              <span className="font-bold text-amber-600">{pendingPayments.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <span className="text-muted-foreground">{t.overduePayments}</span>
              <span className="font-bold text-red-600">{overduePayments.toLocaleString()} د.ع</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground">{t.maintenanceCost}</span>
              <span className="font-bold">{maintenanceCost.toLocaleString()} د.ع</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lease Expiration Alerts */}
      {upcomingExpirations.length > 0 && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5" />
              {t.leaseAlerts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingExpirations.map(contract => (
                <div key={contract.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-amber-200">
                  <div>
                    <p className="font-medium">{contract.tenant_name}</p>
                    <p className="text-sm text-muted-foreground">{contract.property_name}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">{contract.daysUntilExpiry} {t.daysRemaining}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
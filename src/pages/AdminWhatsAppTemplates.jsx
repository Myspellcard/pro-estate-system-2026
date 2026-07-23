import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { firebaseApi } from '@/api/firebaseClient';
import { MessageSquare, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

const ALL_VARIABLES = [
  { key: '{tenant_name}',    label: 'اسم المستأجر',    label_ku: 'ناوی کرێچی' },
  { key: '{owner_name}',     label: 'اسم المالك',      label_ku: 'ناوی خاوەن' },
  { key: '{property_code}',  label: 'كود العقار',      label_ku: 'کۆدی خانوو' },
  { key: '{amount}',         label: 'المبلغ',          label_ku: 'بڕی پارە' },
  { key: '{month}',          label: 'الشهر',           label_ku: 'مانگ' },
  { key: '{duration_months}',label: 'مدة العقد',       label_ku: 'ماوەی گرێبەست' },
  { key: '{start_date}',     label: 'تاريخ البداية',   label_ku: 'بەرواری دەستپێکردن' },
  { key: '{end_date}',       label: 'تاريخ الانتهاء',  label_ku: 'بەرواری کۆتایی' },
  { key: '{invoice_number}', label: 'رقم الفاتورة',    label_ku: 'ژمارەی پارەدان' },
  { key: '{due_date}',       label: 'تاريخ الاستحقاق', label_ku: 'بەرواری کاتی پارەدان' },
];

const EVENT_VARIABLES = {
  payment_to_tenant:  ['{tenant_name}', '{property_code}', '{amount}', '{month}'],
  payment_to_owner:   ['{owner_name}',  '{property_code}', '{amount}', '{month}'],
  contract_to_tenant: ['{tenant_name}', '{property_code}', '{amount}', '{duration_months}', '{start_date}', '{end_date}'],
  contract_to_owner:  ['{owner_name}',  '{property_code}', '{amount}', '{duration_months}', '{start_date}', '{end_date}'],
  invoice_to_tenant:  ['{tenant_name}', '{property_code}', '{invoice_number}', '{amount}', '{due_date}'],
  invoice_to_owner:   ['{owner_name}',  '{property_code}', '{invoice_number}', '{amount}', '{due_date}'],
  late_invoice_to_tenant: ['{tenant_name}', '{property_code}', '{invoice_number}', '{amount}', '{due_date}'],
};

export default function AdminWhatsAppTemplates() {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formEventType, setFormEventType] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [messageKu, setMessageKu] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageTr, setMessageTr] = useState('');
  const [title, setTitle] = useState('');
  const textareaArRef = useRef(null);

  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const eventTypes = {
    payment_to_tenant:  L('شكر دفع — مستأجر',  'سوپاسی پارەدان — کرێچی'),
    payment_to_owner:   L('شكر دفع — مالك',    'سوپاسی پارەدان — خاوەن'),
    contract_to_tenant: L('شكر عقد — مستأجر',  'سوپاسی گرێبەست — کرێچی'),
    contract_to_owner:  L('شكر عقد — مالك',    'سوپاسی گرێبەست — خاوەن'),
    invoice_to_tenant:  L('فاتورة — مستأجر',   'پارەدان — کرێچی'),
    invoice_to_owner:   L('فاتورة — مالك',     'پارەدان — خاوەن'),
    late_invoice_to_tenant:  L('فاتورة متأخرة — مستأجر',   'پارەدانی دواکەوتوو — کرێچی'),
  };

  const { data: templates = [] } = useQuery({
    queryKey: ['messageTemplates'],
    queryFn: () => firebaseApi.entities.MessageTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.MessageTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.MessageTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.MessageTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messageTemplates'] }),
  });

  const openForm = (template = null) => {
    setEditingTemplate(template);
    setFormEventType(template?.event_type || '');
    setTitle(template?.title || '');
    setMessageAr(template?.message_ar || '');
    setMessageKu(template?.message_ku || '');
    setMessageEn(template?.message_en || '');
    setMessageTr(template?.message_tr || '');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormEventType('');
    setTitle('');
    setMessageAr('');
    setMessageKu('');
    setMessageEn('');
    setMessageTr('');
  };

  const insertVariable = (varKey) => {
    const ta = textareaArRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = messageAr.substring(0, start) + varKey + messageAr.substring(end);
    setMessageAr(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const toggleActive = (template) => {
    updateMutation.mutate({ id: template.id, data: { ...template, is_active: !template.is_active } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      event_type: formEventType,
      title,
      message_ar: messageAr,
      message_ku: messageKu,
      message_en: messageEn,
      message_tr: messageTr,
      is_active: true,
      variables: EVENT_VARIABLES[formEventType] || [],
    };
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate({ ...data, branch_id: activeBranch?.id || '' });
    }
  };

  const availableVars = formEventType
    ? ALL_VARIABLES.filter(v => EVENT_VARIABLES[formEventType]?.includes(v.key))
    : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{L('قوالب رسائل واتساب', 'داڕشتەی پەیامەکانی واتسەپ')}</h1>
          <p className="text-sm text-muted-foreground">{L('إدارة الرسائل التلقائية', 'بەڕێوەبردنی پەیامە ئۆتۆماتیکییەکان')}</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="w-4 h-4" /> {L('إضافة قالب', 'زیادکردنی داڕشتە')}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingTemplate ? L('تعديل القالب', 'دەستکاری داڕشتە') : L('إضافة قالب جديد', 'زیادکردنی داڕشتەی نوێ')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Event type */}
              <div className="space-y-2">
                <Label>{L('نوع الحدث — من يستلم الرسالة؟', 'جۆری ڕووداو — کێ پەیامەکە وەردەگرێت؟')}</Label>
                <Select value={formEventType} onValueChange={setFormEventType} required>
                  <SelectTrigger>
                    <SelectValue placeholder={L('اختر نوع الحدث', 'جۆری ڕووداو هەڵبژێرە')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>{L('عنوان القالب', 'ناونیشانی داڕشتە')}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              {/* Variable chips */}
              {availableVars.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {L('المتغيرات المتاحة — انقر لإدراجها في الرسالة', 'گۆڕاوە بەردەستەکان — کلیک بکە بۆ زیادکردن لە پەیامەکە')}
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border">
                    {availableVars.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="inline-flex flex-col items-center px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-medium transition-colors cursor-pointer"
                      >
                        <span className="font-mono text-[10px] text-primary/70">{v.key}</span>
                        <span>{L(v.label, v.label_ku)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{L('انقر على أي متغير لإدراجه في موضع المؤشر داخل الرسالة', 'کلیک لە هەر گۆڕاوێک بکە بۆ زیادکردنی لە شوێنی کursor لە پەیامەکە')}</p>
                </div>
              )}

              {/* Message Arabic */}
              <div className="space-y-2">
                <Label>{L('نص الرسالة بالعربية', 'دەقی پەیام بە عەرەبی')}</Label>
                <Textarea
                  ref={textareaArRef}
                  value={messageAr}
                  onChange={e => setMessageAr(e.target.value)}
                  className="h-36 font-mono text-sm"
                  required
                />
              </div>

              {/* Message Kurdish */}
              <div className="space-y-2">
                <Label>{L('نص الرسالة بالكردية (اختياري)', 'دەقی پەیام بە کوردی (ئارەزوومەندانە)')}</Label>
                <Textarea
                  value={messageKu}
                  onChange={e => setMessageKu(e.target.value)}
                  className="h-36 font-mono text-sm"
                />
              </div>

              {/* Message English */}
              <div className="space-y-2">
                <Label>Message in English (optional)</Label>
                <Textarea
                  value={messageEn}
                  onChange={e => setMessageEn(e.target.value)}
                  className="h-36 font-mono text-sm"
                />
              </div>

              {/* Message Turkish */}
              <div className="space-y-2">
                <Label>Türkçe mesaj (isteğe bağlı)</Label>
                <Textarea
                  value={messageTr}
                  onChange={e => setMessageTr(e.target.value)}
                  className="h-36 font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTemplate ? L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری') : L('إنشاء القالب', 'دروستکردنی داڕشتە')}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  {L('إلغاء', 'پاشگەزبوونەوە')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 mt-2">
        {templates.map(template => (
          <Card key={template.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold">{template.title}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                      {eventTypes[template.event_type]}
                    </span>
                    {template.is_active ? (
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">{L('نشط', 'چالاک')}</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">{L('غير نشط', 'ناچالاک')}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-mono">{template.message_ar}</p>
                  {template.message_ku && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-mono border-t">{template.message_ku}</p>
                  )}
                  {template.message_en && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-mono border-t">English: {template.message_en}</p>
                  )}
                  {template.message_tr && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 font-mono border-t">Türkçe: {template.message_tr}</p>
                  )}
                  {template.variables?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.variables.map(v => (
                        <span key={v} className="text-[10px] px-2 py-0.5 rounded bg-secondary/20 text-secondary-foreground font-mono border border-secondary/30">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(template)}>
                    {template.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openForm(template)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{L('حذف القالب', 'سڕینەوەی داڕشتە')}</AlertDialogTitle>
                        <AlertDialogDescription>{L('هل أنت متأكد من حذف هذا القالب؟', 'دڵنیای لە سڕینەوەی ئەم داڕشتەیە؟')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(template.id)} className="bg-destructive">
                          {L('حذف', 'سڕینەوە')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
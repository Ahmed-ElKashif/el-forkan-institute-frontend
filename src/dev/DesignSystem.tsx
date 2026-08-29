import { useState, type ReactNode } from 'react';
import {
  Alert, ArchPanel, ATTENDANCE_STATES, AttendanceCell, Badge, Breadcrumbs, Button, Card,
  CertificateSheet, Checkbox, CommitBar, ConfirmDialog, DataTable, DensityToggle, Dialog,
  EmptyState, Field, Icon, IconButton, Input, LockBanner, Logo, Pagination, PrintSheet,
  RadioGroup, ResultPill, RoleGate, ScoreInput, SearchInput, Seal, Select, SideNav, Skeleton,
  SortHeader, StatCard, Switch, Tabs, Textarea, Toast, TopBar,
  formatNumber, formatScore,
  type Column, type Density, type IconName, type NavItem, type Role,
} from '../ds';

/* ---------------------------------------------------------------------------
   The design-system gallery — F0a's exit test.

   All 40 components in the barrel are rendered here at least once, in RTL, so the
   port can be checked by eye against the handoff bundle's guideline cards.
   Dev-only: F0b replaces the route table and this page moves behind a flag.
--------------------------------------------------------------------------- */

function Section({ id, title, note, children }: {
  id: string; title: string; note?: string; children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-ink-900">{title}</h2>
        {note ? <p className="m-0 mt-1 text-sm text-ink-500">{note}</p> : null}
      </div>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ token, name }: { token: string; name: string }) {
  return (
    <div className="grid gap-1">
      <div
        className="h-14 w-full rounded-md border border-subtle"
        style={{ background: `var(${token})` }}
      />
      <div className="text-xs text-ink-700">{name}</div>
      <div className="ef-num text-xs text-ink-400">{token}</div>
    </div>
  );
}

function Ramp({ title, prefix, steps }: { title: string; prefix: string; steps: number[] }) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-ink-900">{title}</div>
      <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
        {steps.map((s) => (
          <Swatch key={s} token={`--${prefix}-${s}`} name={`${prefix}-${s}`} />
        ))}
      </div>
    </div>
  );
}

interface DemoRow {
  id: number;
  name: string;
  code: string;
  level: string;
  score: number;
  decision: 'promote' | 'promote_with_carry' | 'makeup_required' | 'repeat' | 'graduate';
}

const ROWS: DemoRow[] = [
  { id: 1, name: 'عبد الرحمن محمد عبد العزيز إبراهيم', code: '1447-0001', level: 'المستوى الثالث', score: 92.5, decision: 'promote' },
  { id: 2, name: 'فاطمة الزهراء أحمد سيد', code: '1447-0002', level: 'المستوى الثالث', score: 71, decision: 'promote_with_carry' },
  { id: 3, name: 'يوسف كريم فؤاد', code: '1447-0003', level: 'المستوى الرابع', score: 48, decision: 'makeup_required' },
  { id: 4, name: 'مريم عبد الله حسن', code: '1447-0004', level: 'المستوى الرابع', score: 96, decision: 'graduate' },
  { id: 5, name: 'أحمد طارق منصور', code: '1447-0005', level: 'المستوى الثاني', score: 33, decision: 'repeat' },
];

const COLUMNS: Column<DemoRow>[] = [
  { key: 'name', header: 'الطالب', sticky: true, width: 240 },
  { key: 'code', header: 'الكود', numeric: true, width: 110 },
  { key: 'level', header: 'المستوى', width: 140 },
  { key: 'score', header: <SortHeader label="الدرجة" dir="desc" />, numeric: true, align: 'center', width: 90, render: (r) => formatScore(r.score) },
  { key: 'decision', header: 'القرار', width: 190, render: (r) => <ResultPill decision={r.decision} size="sm" /> },
];

const NAV: NavItem[] = [
  { key: 'dash', label: 'اللوحة', icon: 'chart-column', group: 'عام' },
  { key: 'students', label: 'الطلاب', icon: 'users', badge: 248, group: 'عام' },
  { key: 'attendance', label: 'الحضور', icon: 'clipboard-check', group: 'التدريس' },
  { key: 'scores', label: 'الدرجات', icon: 'clipboard-list', group: 'التدريس' },
  { key: 'import', label: 'الاستيراد', icon: 'file-spreadsheet', headTeacherOnly: true, group: 'الإدارة' },
  { key: 'certificates', label: 'الشهادات', icon: 'award', headTeacherOnly: true, group: 'الإدارة' },
  { key: 'audit', label: 'سجل المراجعة', icon: 'history', headTeacherOnly: true, group: 'الإدارة' },
];

const ICONS: IconName[] = [
  'award', 'book-open', 'calendar-days', 'chart-column', 'check', 'chevron-down', 'chevron-left',
  'circle-alert', 'circle-check', 'clipboard-check', 'file-spreadsheet', 'graduation-cap',
  'history', 'inbox', 'info', 'lock', 'lock-open', 'log-out', 'menu', 'printer', 'search',
  'settings', 'shield-alert', 'triangle-alert', 'upload', 'user', 'users',
];

export function DesignSystem() {
  const [role, setRole] = useState<Role>('head_teacher');
  const [density, setDensity] = useState<Density>('comfortable');
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [radio, setRadio] = useState('promote');
  const [tab, setTab] = useState('overview');
  const [nav, setNav] = useState('dash');
  const [page, setPage] = useState(2);
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [score, setScore] = useState<string>('88.5');

  return (
    <div className="min-h-screen bg-app">
      <TopBar
        title="نظام التصميم"
        subtitle="40 مكوّنًا · اختبار المرحلة F0a"
        context={<DensityToggle value={density} onChange={setDensity} />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="user"
            onClick={() => setRole(role === 'head_teacher' ? 'teacher' : 'head_teacher')}
          >
            تبديل الدور
          </Button>
        }
        user={{ name: 'أ. محمود عبد الله', role }}
      />

      <div className="mx-auto grid max-w-[1200px] gap-12 p-6">
        {/* ---------------------------------------------------------------- */}
        <Section id="color" title="الألوان" note="مأخوذة من الشعار، غير مُخترعة. النسبة 80 / 15 / 5.">
          <Ramp title="Forkan Teal — أساسي" prefix="teal" steps={[50, 100, 200, 300, 400, 500, 600, 700, 800, 900]} />
          <Ramp title="Forkan Gold — للمناسبات فقط" prefix="gold" steps={[50, 100, 200, 300, 400, 500, 600, 700, 800, 900]} />
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-ink-900">محايدة ودلالية</div>
            <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
              <Swatch token="--ink-900" name="ink-900" />
              <Swatch token="--ink-700" name="ink-700" />
              <Swatch token="--ink-500" name="ink-500" />
              <Swatch token="--ink-400" name="ink-400" />
              <Swatch token="--line-300" name="line-300" />
              <Swatch token="--line-200" name="line-200" />
              <Swatch token="--canvas" name="canvas" />
              <Swatch token="--paper" name="paper" />
              <Swatch token="--success" name="success" />
              <Swatch token="--warning" name="warning" />
              <Swatch token="--danger" name="danger" />
              <Swatch token="--info" name="info" />
            </div>
          </div>
          <Card title="حالات الحضور — لون + رمز + نص">
            <div className="flex flex-wrap gap-3">
              {(Object.keys(ATTENDANCE_STATES) as (keyof typeof ATTENDANCE_STATES)[]).map((k) => (
                <div key={k} className="w-28">
                  <AttendanceCell status={k} showLabel />
                </div>
              ))}
            </div>
            <p className="m-0 mt-3 text-xs text-ink-500">
              اللون ليس الإشارة الوحيدة أبدًا — هذه الكشوف تُطبع بالأبيض والأسود.
            </p>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="type" title="الخطوط" note="IBM Plex Sans Arabic — مستضاف ذاتيًا، لا يُجلب من شبكة خارجية.">
          <Card>
            <div className="grid gap-3">
              <div className="text-4xl font-bold">دورات الفرقان التثقيفية</div>
              <div className="text-3xl font-bold">شهادة إتمام مستوى</div>
              <div className="text-2xl font-semibold">كشف الحضور — القسم أ</div>
              <div className="text-xl font-semibold">إدخال الدرجات</div>
              <div className="text-lg">نص عادي بحجم متوسط للعناوين الفرعية</div>
              <div className="text-base leading-body">
                نص المتن بارتفاع سطر 1.75 — العربية تحتاج مساحة رأسية أكبر، ولا تُباعد حروفها أبدًا.
              </div>
              <div className="ef-longform max-w-prose text-base">
                نص طويل بارتفاع سطر 1.9، كما يظهر على الشهادات والمطبوعات الرسمية.
              </div>
              <div className="ef-num text-base">
                أرقام لاتينية جدولية: {formatNumber(1447)} · {formatScore(88.5)} · L4-1447-0001
              </div>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="foundations" title="المسافات والحواف والارتفاع">
          <Card>
            <Row label="المسافات · 4 8 12 16 24 32 48 64">
              {[1, 2, 3, 4, 6, 8, 12, 16].map((s) => (
                <div key={s} className="grid gap-1 text-center">
                  <div className="bg-teal-200" style={{ width: s * 4, height: s * 4 }} />
                  <div className="ef-num text-xs text-ink-500">{s * 4}</div>
                </div>
              ))}
            </Row>
            <div className="mt-6" />
            <Row label="الحواف · sm 4 · md 8 · lg 12 · xl 16 · full">
              <div className="grid size-16 place-items-center rounded-sm bg-teal-50 text-xs">sm</div>
              <div className="grid size-16 place-items-center rounded-md bg-teal-50 text-xs">md</div>
              <div className="grid size-16 place-items-center rounded-lg bg-teal-50 text-xs">lg</div>
              <div className="grid size-16 place-items-center rounded-xl bg-teal-50 text-xs">xl</div>
              <div className="grid size-16 place-items-center rounded-full bg-teal-50 text-xs">full</div>
            </Row>
            <div className="mt-6" />
            <Row label="الارتفاع · ثلاث درجات فقط">
              <div className="grid h-16 w-32 place-items-center rounded-lg bg-surface text-xs shadow-card">card</div>
              <div className="grid h-16 w-32 place-items-center rounded-lg bg-surface text-xs shadow-raised">raised</div>
              <div className="grid h-16 w-32 place-items-center rounded-lg bg-surface text-xs shadow-modal">modal</div>
            </Row>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="core" title="المكوّنات الأساسية">
          <Card title="Button">
            <Row label="variant">
              <Button variant="primary">حفظ</Button>
              <Button variant="secondary">إلغاء</Button>
              <Button variant="ghost">تخطٍّ</Button>
              <Button variant="danger" icon="trash">حذف نهائي</Button>
              <Button variant="ceremony" icon="award">إصدار شهادة</Button>
            </Row>
            <div className="mt-4" />
            <Row label="size · icon · state">
              <Button size="sm" icon="plus">صغير</Button>
              <Button size="md" icon="upload">متوسط</Button>
              <Button size="lg" icon="printer">كبير</Button>
              <Button icon="log-out" iconMirror>خروج</Button>
              <Button loading>جارٍ الحفظ</Button>
              <Button disabled>غير متاح</Button>
            </Row>
          </Card>

          <Card title="IconButton · Badge · Icon">
            <Row label="IconButton">
              <IconButton icon="pencil" label="تعديل" variant="ghost" />
              <IconButton icon="printer" label="طباعة" variant="outline" />
              <IconButton icon="check" label="اعتماد" variant="solid" />
              <IconButton icon="trash" label="حذف" disabled />
            </Row>
            <div className="mt-4" />
            <Row label="Badge">
              <Badge>محايد</Badge>
              <Badge tone="brand" icon="users">قسم أ</Badge>
              <Badge tone="success" icon="circle-check">مكتمل</Badge>
              <Badge tone="warning" icon="triangle-alert">تجاوز الغياب</Badge>
              <Badge tone="danger" icon="circle-x">مرفوض</Badge>
              <Badge tone="info" icon="info">قيد المراجعة</Badge>
              <Badge tone="ceremony" icon="award">صدرت الشهادة</Badge>
            </Row>
            <div className="mt-4" />
            <Row label="Icon — مجموعة Lucide محلية، لا CDN">
              {ICONS.map((n) => (
                <span key={n} className="grid size-9 place-items-center rounded-md border border-subtle text-ink-700" title={n}>
                  <Icon name={n} size={18} />
                </span>
              ))}
            </Row>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="إجمالي الطلاب" value={formatNumber(248)} icon="users" trend="+12 عن العام الماضي" trendTone="up" />
            <StatCard label="نسبة الحضور" value="94.2" unit="%" icon="clipboard-check" trend="-1.4 عن الشهر الماضي" trendTone="down" />
            <StatCard label="الشهادات الصادرة" value={formatNumber(37)} icon="award" trend="المستوى الرابع" />
            <StatCard label="الأقسام" value={formatNumber(12)} icon="book-open" />
          </div>

          <Card title="Card — نبرة المناسبات" tone="ceremony" action={<Badge tone="ceremony" icon="award">ذهبي</Badge>}>
            <p className="m-0 text-sm text-ink-700">
              سطح ورقي عاجي بحافة ذهبية. يُستخدم للشهادات والمطبوعات فقط، ولا يُستخدم كبطاقة عادية.
            </p>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="forms" title="النماذج">
          <Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم الطالب" required hint="يُطبَّع الاسم العربي تلقائيًا عند الحفظ.">
                <Input defaultValue="عبد الرحمن محمد عبد العزيز" />
              </Field>
              <Field label="الرقم القومي" required headTeacherOnly error="الرقم القومي يجب أن يتكوّن من 14 رقمًا">
                <Input numeric defaultValue="2980112" invalid />
              </Field>
              <Field label="المستوى">
                <Select
                  options={[
                    { value: '1', label: 'المستوى الأول' },
                    { value: '2', label: 'المستوى الثاني' },
                    { value: '3', label: 'المستوى الثالث' },
                  ]}
                  placeholder="اختر مستوى"
                />
              </Field>
              <Field label="بحث">
                <SearchInput />
              </Field>
              <Field label="الدرجة" hint="النهاية العظمى 100">
                <Input numeric suffix="/ 100" defaultValue="88.50" />
              </Field>
              <Field label="حقل مقفل — بعد قفل الامتحان">
                <Input readOnly defaultValue="92.00" numeric />
              </Field>
              <Field label="سبب التعديل" required hint="يُحفظ السبب في سجل المراجعة ولا يمكن حذفه لاحقًا.">
                <Textarea rows={3} placeholder="اكتب سببًا واضحًا لا يقل عن ثلاثة أحرف" />
              </Field>
              <div className="grid content-start gap-4">
                <Checkbox label="إظهار الطلاب المنسحبين" checked={checked} onChange={() => setChecked(!checked)} />
                <Checkbox label="تحديد جزئي" indeterminate />
                <Checkbox label="غير متاح" disabled />
                <Switch label="تفعيل تذكيرات واتساب" checked={switched} onChange={() => setSwitched(!switched)} />
                <RadioGroup
                  name="decision"
                  value={radio}
                  onChange={setRadio}
                  options={[
                    { value: 'promote', label: 'ينتقل', hint: 'اجتاز كل المواد الإلزامية' },
                    { value: 'repeat', label: 'يعيد المستوى', hint: 'رسب في مادة إلزامية' },
                  ]}
                />
              </div>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="data" title="الجداول والبيانات" note="الكثافة المضغوطة تُثبّت عمود الاسم ورأس الجدول.">
          <Card title="DataTable" action={<DensityToggle value={density} onChange={setDensity} />} bodyClassName="p-0">
            <DataTable
              columns={COLUMNS}
              rows={ROWS}
              density={density}
              getRowKey={(r) => r.id}
              rowTone={(r) => (r.decision === 'repeat' ? 'danger' : r.decision === 'graduate' ? 'brand' : undefined)}
              className="rounded-none border-0"
            />
            <Pagination page={page} pageCount={12} total={248} onPage={setPage} />
          </Card>

          <Card title="خلايا الشبكة">
            <Row label="AttendanceCell">
              <div className="w-20"><AttendanceCell status="present" /></div>
              <div className="w-20"><AttendanceCell status="absent" /></div>
              <div className="w-20"><AttendanceCell status="excused" /></div>
              <div className="w-20"><AttendanceCell status="late" /></div>
              <div className="w-20"><AttendanceCell status={null} /></div>
            </Row>
            <div className="mt-4" />
            <Row label="ScoreInput">
              <ScoreInput value={score} onChange={(e) => setScore(e.target.value)} />
              <ScoreInput value="120" max={100} />
              <ScoreInput value="92" locked />
              <ScoreInput absent />
            </Row>
            <div className="mt-4" />
            <Row label="ResultPill — القرارات الخمسة">
              <ResultPill decision="promote" />
              <ResultPill decision="promote_with_carry" />
              <ResultPill decision="makeup_required" />
              <ResultPill decision="repeat" />
              <ResultPill decision="graduate" />
              <ResultPill decision="withdrawn" />
            </Row>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Skeleton">
              <Skeleton rows={4} />
            </Card>
            <Card title="EmptyState" bodyClassName="p-0">
              <EmptyState
                icon="inbox"
                title="لا توجد حصص بعد"
                description="أنشئ جدولًا أسبوعيًا ثم ولّد الحصص."
                action={<Button icon="plus">إنشاء جدول</Button>}
              />
            </Card>
          </div>

          <Card title="EmptyState — منع الوصول (403)" bodyClassName="p-0">
            <EmptyState
              tone="denied"
              title="هذه الصفحة للمدير فقط"
              description="حسابك مسجَّل بصفة معلّم. راجع مدير المعهد إذا كنت تحتاج صلاحية أوسع."
            />
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="feedback" title="الرسائل والتأكيدات">
          <div className="grid gap-3">
            <Alert tone="info" title="معاينة فقط">لم يُكتب أي شيء في قاعدة البيانات حتى الآن.</Alert>
            <Alert tone="success" title="تم حفظ الحضور">سُجِّل حضور 24 طالبًا لحصة الجمعة 09:00.</Alert>
            <Alert tone="warning" title="تغطية أرقام الهواتف غير كافية">
              12 طالبًا من 24 بلا رقم هاتف — لا يمكن إرسال الحملة قبل اكتمال التغطية.
            </Alert>
            <Alert tone="danger" title="الدرجة تتجاوز النهاية العظمى (100)">
              راجع الصف رقم 3 قبل الحفظ.
            </Alert>
          </div>

          <LockBanner locked lockedAt="2026-05-12" lockedBy="أ. محمود عبد الله"
            action={<RoleGate role={role}><Button variant="secondary" size="sm" icon="lock-open">فتح الامتحان</Button></RoleGate>} />
          <LockBanner locked={false} action={<RoleGate role={role}><Button size="sm" icon="lock">قفل الامتحان</Button></RoleGate>} />

          <Row label="Toast">
            <Toast message="تم إصدار الشهادة" detail="L4-1447-0001 · 2026-05-12" onDismiss={() => {}} />
            <Toast tone="danger" message="تعذّر حفظ الدرجات" detail="الامتحان مقفل" onDismiss={() => {}} />
          </Row>

          <Row label="Dialog">
            <Button variant="secondary" onClick={() => setDialog(true)}>فتح نافذة</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>سحب شهادة</Button>
          </Row>

          <Card title="CommitBar — نمط المعاينة ثم التنفيذ" bodyClassName="p-0">
            <CommitBar
              counts={[
                { label: 'إنشاء', value: formatNumber(84), tone: 'create' },
                { label: 'تحديث', value: formatNumber(9), tone: 'update' },
                { label: 'تخطٍّ', value: formatNumber(2), tone: 'skip' },
                { label: 'أخطاء', value: formatNumber(1), tone: 'error' },
              ]}
              note="لن يُكتب أي صف قبل الضغط على تنفيذ."
              confirmLabel="تنفيذ الاستيراد"
              disabled
              onCancel={() => {}}
            />
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="navigation" title="التنقّل" note="القائمة الجانبية للمعلّم أقصر فعليًا — لا أزرار معطّلة.">
          <Card bodyClassName="p-0">
            <div className="flex h-100 overflow-hidden rounded-lg">
              <SideNav items={NAV} active={nav} role={role} onSelect={setNav}
                footer={<Button variant="ghost" size="sm" icon="log-out" iconMirror fullWidth className="text-white hover:bg-teal-700">تسجيل الخروج</Button>} />
              <div className="flex-1 overflow-auto bg-canvas p-6">
                <Breadcrumbs items={[{ label: 'الطلاب' }, { label: 'المستوى الثالث' }, { label: 'عبد الرحمن محمد' }]} />
                <div className="mt-4">
                  <Tabs
                    items={[
                      { key: 'overview', label: 'نظرة عامة' },
                      { key: 'attendance', label: 'الحضور', count: 18 },
                      { key: 'scores', label: 'الدرجات', count: 6 },
                    ]}
                    active={tab}
                    onSelect={setTab}
                  />
                </div>
                <p className="mt-4 text-sm text-ink-500">
                  الدور الحالي: <strong className="text-ink-900">{role === 'head_teacher' ? 'مدير' : 'معلّم'}</strong>.
                  {' '}استخدم «تبديل الدور» بالأعلى لترى الفرق.
                </p>
                <RoleGate role={role} fallback={<Alert tone="warning" title="محتوى مخفي">هذا القسم لا يظهر للمعلّم إطلاقًا.</Alert>}>
                  <Alert tone="success" title="محتوى المدير">يظهر فقط لصاحب صفة مدير.</Alert>
                </RoleGate>
              </div>
            </div>
          </Card>
        </Section>

        {/* ---------------------------------------------------------------- */}
        <Section id="brand" title="الهوية والمطبوعات" note="الشعار كما وُرِّد — لا يُعاد رسمه ولا يُعكس.">
          <Card>
            <Row label="Logo">
              <Logo variant="full" height={72} />
              <Logo variant="mark" height={72} />
            </Row>
            <div className="mt-6" />
            <Row label="ArchPanel · Seal">
              <ArchPanel width={150} height={175}>
                <div className="grid gap-1">
                  <Icon name="graduation-cap" size={28} />
                  <div className="text-sm font-semibold">المستوى الرابع</div>
                </div>
              </ArchPanel>
              <ArchPanel tone="gold" width={150} height={175}>
                <div className="grid gap-1">
                  <Icon name="award" size={28} />
                  <div className="text-sm font-semibold">متخرّج</div>
                </div>
              </ArchPanel>
              <Seal serial="L4-1447-0001" />
            </Row>
          </Card>

          <div className="grid gap-6 overflow-x-auto">
            <div className="origin-top-right scale-[0.55]">
              <PrintSheet
                title="كشف حضور — القسم أ"
                meta={[
                  { label: 'العام', value: '1447' },
                  { label: 'المستوى', value: 'الثالث' },
                  { label: 'التاريخ', value: '2026-05-12' },
                ]}
                footerNote="طُبع من نظام إدارة معهد دورات الفرقان التثقيفية."
              >
                <DataTable columns={COLUMNS} rows={ROWS} density="compact" getRowKey={(r) => r.id} />
              </PrintSheet>
            </div>

            <div className="origin-top-right scale-[0.55]">
              <CertificateSheet
                studentName="مريم عبد الله حسن"
                levelName="المستوى الرابع"
                academicYear="1447"
                serial="L4-1447-0001"
                issuedOn="2026-05-12"
                headTeacher="أ. محمود عبد الله"
              />
            </div>
          </div>
        </Section>
      </div>

      <Dialog
        open={dialog}
        title="تفاصيل الطالب"
        description="البيانات معروضة للقراءة فقط في هذه المعاينة."
        onClose={() => setDialog(false)}
        footer={<Button onClick={() => setDialog(false)}>إغلاق</Button>}
      >
        <div className="grid gap-4">
          <Field label="الاسم"><Input readOnly defaultValue="عبد الرحمن محمد عبد العزيز إبراهيم" /></Field>
          <Field label="الكود"><Input readOnly numeric defaultValue="1447-0001" /></Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        title="سحب الشهادة رقم L4-1447-0001"
        consequence="ستصبح الشهادة رقم L4-1447-0001 ملغاة ولن تظهر ضمن شهادات الطالب، ويبقى سجلها وسبب السحب في سجل المراجعة بشكل دائم."
        confirmLabel="سحب الشهادة"
        requireReason
        reason={reason}
        onReasonChange={setReason}
        onConfirm={() => { setConfirm(false); setReason(''); }}
        onCancel={() => { setConfirm(false); setReason(''); }}
      />
    </div>
  );
}

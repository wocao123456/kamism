import { useEffect, useMemo, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import {
  Save, RefreshCw, Crown, Gift, Plus, Ticket, Trash2, Percent,
  Copy, Pencil, Star, Zap, Shield, Gem, BadgeCheck, Search, X, Wallet, KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

interface PricingOption { key: string; label: string; days: number; price: number | string; }
interface PlanConfig {
  id: string; plan: string; label: string; description?: string;
  max_apps: number; max_cards: number; max_devices: number; max_gen_once: number;
  price_month: any; price_quarter: any; price_year: any;
  pricing_options?: PricingOption[]; sort_order: number;
  is_active: boolean; updated_at: string;
}
interface RechargeItem {
  id: string; code: string; plan: string; label: string;
  duration_days: number; status: string; merchant?: string; recharge_type?: string; balance_amount?: number;
  created_at: string; used_at?: string; note?: string;
}
type EditState = Record<string, string>;

const editFields = [
  ['label', '套餐名称', 'text', '显示给商户看的套餐名'],
  ['description', '套餐说明', 'text', '例如：适合团队长期使用'],
  ['max_apps', '应用数', 'number', '-1 表示无限'],
  ['max_cards', '卡密数', 'number', '-1 表示无限'],
  ['max_devices', '设备/张', 'number', '单张卡密可绑定设备数'],
  ['max_gen_once', '单次生成', 'number', '商户一次最多生成数量'],
  ['sort_order', '排序', 'number', '数字越小越靠前'],
] as const;

const createFields = [
  ['plan', '套餐标识', '例如 vip，只能小写字母/数字/-/_'],
  ['label', '套餐名称', '例如 VIP 套餐'],
  ['description', '套餐说明', '可留空'],
  ['max_apps', '应用数', '-1 表示无限'],
  ['max_cards', '卡密数', '-1 表示无限'],
  ['max_devices', '设备/张', '1-100，-1 表示无限'],
  ['max_gen_once', '单次生成', '一次最多生成卡密数量'],
  ['sort_order', '排序', '数字越小越靠前'],
] as const;

function displayVal(v: number) { return v == null ? '0' : v === -1 ? '无限' : String(v); }

function normalizePricing(c: PlanConfig): PricingOption[] {
  const arr = Array.isArray(c.pricing_options) ? c.pricing_options : [];
  if (arr.length) return arr;
  return [{ key: 'month', label: '月付', days: 30, price: c.price_month || 0 }];
}

function toEdit(c: PlanConfig): EditState {
  return {
    label: c.label, description: c.description || '',
    max_apps: String(c.max_apps), max_cards: String(c.max_cards),
    max_devices: String(c.max_devices), max_gen_once: String(c.max_gen_once),
    sort_order: String(c.sort_order ?? 100), is_active: String(c.is_active),
    pricing_options: JSON.stringify(normalizePricing(c)),
  };
}

function planIcon(label: string, size = 20) {
  const t = (label || '').toLowerCase();
  if (t.includes('vip')) return <Crown size={size} />;
  if (t.includes('svip') || t.includes('至尊') || t.includes('max')) return <Gem size={size} />;
  if (t.includes('pro') || t.includes('专业')) return <Zap size={size} />;
  if (t.includes('安全') || t.includes('企业')) return <Shield size={size} />;
  if (t.includes('免费') || t.includes('free')) return <Gift size={size} />;
  if (t.includes('认证') || t.includes('高级')) return <BadgeCheck size={size} />;
  return <Star size={size} />;
}

function parsePricing(value: string): PricingOption[] {
  try { const arr = JSON.parse(value || '[]'); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function PlanConfigs() {
  const [configs, setConfigs] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Record<string, string>>({});
  const [planFilterTab, setPlanFilterTab] = useState('all');
  const [editingIsFree, setEditingIsFree] = useState(false);

  const [recharges, setRecharges] = useState<RechargeItem[]>([]);
  const [rcPage, setRcPage] = useState(1);
  const RC_PAGE = 10;
  const [rcSearch, setRcSearch] = useState('');
  const [rcFilter, setRcFilter] = useState('');
  const [rcTypeFilter, setRcTypeFilter] = useState('');
  const [showRcCreate, setShowRcCreate] = useState(false);
  const [rcCreateForm, setRcCreateForm] = useState({
    recharge_type: 'plan', plan: '', billing_cycle: 'month', duration_days: 30, balance_amount: 10, count: 1, note: '',
  });
  const [rcSelected, setRcSelected] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'plan' | 'recharge' | 'balance'>('plan');
  const [balanceAmounts, setBalanceAmounts] = useState('10,20,50,100,200,500,1000,2000,5000');
  const [balanceDiscounts, setBalanceDiscounts] = useState<{threshold:number; bonus:number}[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getPlanConfigs()
      .then(res => { if (res?.data?.success) setConfigs(res.data.data || []); })
      .catch(err => { console.error('加载套餐失败:', err); setConfigs([]); })
      .finally(() => setLoading(false));
  }, []);

  const loadRecharges = useCallback(async () => {
    try {
      const res: any = await adminApi.getRechargeCodes({ limit: 300 });
      if (res?.data?.success) {
        setRecharges(Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []));
      }
    } catch (err) {
      console.error('加载充值码失败:', err);
      setRecharges([]);
    }
  }, []);

  useEffect(() => { load(); loadRecharges(); adminApi.getSystemConfig().then((res:any)=>{const data=res?.data?.data||{}; const v=data['balance.recharge_amounts']; if(Array.isArray(v)) setBalanceAmounts(v.join(',')); const d=data['balance.recharge_discounts']; if(Array.isArray(d)){const arr=d.map((x:any)=>({threshold:Number(x?.threshold)||0,bonus:Number(x?.bonus)||0})).filter((x:any)=>x.threshold>0); setBalanceDiscounts(arr);}}).catch(()=>{}); }, [load, loadRecharges]);

  const startEdit = (c: PlanConfig) => { setEditing(c.id); setEditState(toEdit(c)); setEditingIsFree(c.plan === 'free'); };
  const cancelEdit = () => { setEditing(null); setEditState({}); };

  const saveEdit = async (c: PlanConfig) => {
    try {
      const body: any = {
        label: editState.label, description: editState.description,
        max_apps: Number(editState.max_apps), max_cards: Number(editState.max_cards),
        max_devices: Number(editState.max_devices), max_gen_once: Number(editState.max_gen_once),
        sort_order: Number(editState.sort_order), is_active: editState.is_active === 'true',
        pricing_options: parsePricing(editState.pricing_options),
      };
      const res = await adminApi.updatePlanConfig(c.id, body);
      if (res.data.success) { toast.success('已保存'); setEditing(null); load(); } else toast.error(res.data.message || '保存失败');
    } catch { toast.error('保存失败'); }
  };

  const doCreate = async () => {
    try {
      const body: any = {};
      createFields.forEach(([k]) => {
        body[k] = ['max_apps', 'max_cards', 'max_devices', 'max_gen_once', 'sort_order'].includes(k)
          ? Number(createForm[k] || 0) : (createForm[k] || '');
      });
      const res = await adminApi.createPlanConfig(body);
      if (res.data.success) { toast.success('已创建'); setShowCreate(false); setCreateForm({}); load(); } else toast.error(res.data.message || '创建失败');
    } catch { toast.error('创建失败'); }
  };

  const deleteConfig = async (c: PlanConfig) => {
    if (!confirm(`确定删除套餐「${c.label}」？`)) return;
    try { const res = await adminApi.deletePlanConfig(c.id); if (res.data.success) { toast.success('已删除'); load(); } else toast.error(res.data.message || '删除失败'); } catch { toast.error('删除失败'); }
  };


  const doCreateRecharge = async () => {
    try {
      const body = rcCreateForm.recharge_type === 'balance' ? { recharge_type: 'balance', balance_amount: Number(rcCreateForm.balance_amount), count: Number(rcCreateForm.count), note: rcCreateForm.note } : { recharge_type: 'plan', plan: rcCreateForm.plan, billing_cycle: rcCreateForm.billing_cycle, duration_days: Number(rcCreateForm.duration_days), count: Number(rcCreateForm.count), note: rcCreateForm.note };
      const res = await adminApi.generateRechargeCodes(body);
      if (res.data.success) {
        toast.success('已生成');
        setShowRcCreate(false);
        setRcCreateForm({ recharge_type: 'plan', plan: '', billing_cycle: 'month', duration_days: 30, balance_amount: 10, count: 1, note: '' });
        // 生成后清空筛选/搜索并回到第一页，避免新充值码被旧筛选条件隐藏。
        setRcSearch('');
        setRcFilter('');
        setRcTypeFilter('');
        setRcSelected(new Set());
        setRcPage(1);
        await loadRecharges();
      } else toast.error(res.data.message || '生成失败');
    } catch { toast.error('生成失败'); }
  };

  const sortedConfigs = useMemo(() => {
    let arr = [...(configs || [])];
    if (planFilterTab === 'active') arr = arr.filter(x => x.is_active);
    if (planFilterTab === 'disabled') arr = arr.filter(x => !x.is_active);
    return arr.sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
  }, [configs, planFilterTab]);

  const filteredRecharges = useMemo(() => {
    let arr = [...(recharges || [])];
    if (rcFilter) arr = arr.filter(r => r.status === rcFilter);
    if (rcTypeFilter) arr = arr.filter(r => (r.recharge_type || 'plan') === rcTypeFilter);
    if (rcSearch.trim()) arr = arr.filter(r => r.code.toLowerCase().includes(rcSearch.trim().toLowerCase()));
    return arr;
  }, [recharges, rcFilter, rcTypeFilter, rcSearch]);

  const planRechargeCount = (recharges || []).filter(r => (r.recharge_type || 'plan') !== 'balance').length;
  const balanceRechargeCount = (recharges || []).filter(r => r.recharge_type === 'balance').length;
  const unusedCount = (recharges || []).filter(r => r.status === 'unused').length;

  const rcPageItems = useMemo(() => {
    const start = (rcPage - 1) * RC_PAGE;
    return filteredRecharges.slice(start, start + RC_PAGE);
  }, [filteredRecharges, rcPage]);

  const rcTotalPages = Math.ceil(filteredRecharges.length / RC_PAGE);

  const switchTab = (tab: 'plan' | 'recharge' | 'balance') => {
    setActiveTab(tab);
    setEditing(null);
    setEditState({});
    setRcSelected(new Set());
  };
  const updatePricingOption = (idx:number, field:keyof PricingOption, value:string) => {
    const arr = parsePricing(editState.pricing_options || '[]');
    arr[idx] = { ...(arr[idx] || {key:'month',label:'月付',days:30,price:0}), [field]: field==='days'||field==='price' ? Math.min(Number(value), 999999999) : value } as PricingOption;
    setEditState(st => ({...st, pricing_options: JSON.stringify(arr)}));
  };
  const addPricingOption = () => { const arr = parsePricing(editState.pricing_options || '[]'); arr.push({key:`custom_${arr.length+1}`,label:'自定义',days:30,price:0}); setEditState(st => ({...st, pricing_options: JSON.stringify(arr)})); };
  const removePricingOption = (idx:number) => { const arr = parsePricing(editState.pricing_options || '[]'); arr.splice(idx,1); setEditState(st => ({...st, pricing_options: JSON.stringify(arr)})); };
  const saveBalanceAmounts = async () => { const nums = balanceAmounts.split(/[，,\s]+/).map(x=>Math.min(Number(x),999999999)).filter(x=>Number.isFinite(x)&&x>0); if(!nums.length) return toast.error('请输入有效金额'); const res = await adminApi.saveSystemConfig('balance.recharge_amounts', nums); if(res?.data?.success) toast.success('余额充值价格已保存'); else toast.error(res?.data?.message||'保存失败'); };
  const addDiscountRule = () => setBalanceDiscounts(arr => [...arr, {threshold:0, bonus:0}]);
  const updateDiscountRule = (i:number, k:'threshold'|'bonus', v:number) => setBalanceDiscounts(arr => arr.map((it,idx)=>idx===i?{...it,[k]:Math.max(0,Number(v)||0)}:it));
  const removeDiscountRule = (i:number) => setBalanceDiscounts(arr => arr.filter((_,idx)=>idx!==i));
  const saveBalanceDiscounts = async () => { const list = balanceDiscounts.filter(x=>x.threshold>0).map(x=>({threshold:Number(x.threshold),bonus:Math.min(Number(x.bonus)||0,500)})).sort((a,b)=>a.threshold-b.threshold); const res = await adminApi.saveSystemConfig('balance.recharge_discounts', list); if(res?.data?.success) toast.success('折扣规则已保存'); else toast.error(res?.data?.message||'保存失败'); };
  const copySelectedCodes = async () => {
    const codes = (recharges || []).filter(r => rcSelected.has(r.id)).map(r => r.code);
    if (!codes.length) return;
    await navigator.clipboard.writeText(codes.join('\n'));
    toast.success(`已复制 ${codes.length} 个充值码`);
  };

  return (
    <div className="dpage">
      {/* ===== 统计卡片 ===== */}
      <div className="stat-grid" style={{ gap: 8 }}>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">套餐总数</div>
            <div className="stat-card-v2__value" style={{ color: '#1890ff' }}>{<AnimatedNumber value={(configs || []).length} />}</div>
            <div className="stat-card-v2__desc">所有套餐</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#e6f4ff', color: '#1890ff' }}><Crown size={20} /></div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">未使用</div>
            <div className="stat-card-v2__value" style={{ color: '#3b82f6' }}>{<AnimatedNumber value={unusedCount} />}</div>
            <div className="stat-card-v2__desc">可用充值码</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#e6f4ff', color: '#3b82f6' }}><KeyRound size={20} /></div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">套餐充值码总数</div>
            <div className="stat-card-v2__value" style={{ color: '#faad14' }}>{<AnimatedNumber value={planRechargeCount} />}</div>
            <div className="stat-card-v2__desc">全部套餐充值码</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fffbe6', color: '#faad14' }}><Ticket size={20} /></div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">余额充值码总数</div>
            <div className="stat-card-v2__value" style={{ color: '#8b5cf6' }}>{<AnimatedNumber value={balanceRechargeCount} />}</div>
            <div className="stat-card-v2__desc">全部余额充值码</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#f3e8ff', color: '#8b5cf6' }}><Wallet size={20} /></div>
        </div>
      </div>
      {/* ===== 并排连接开关（按钮式填满） ===== */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          style={{
            flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 13,
            borderRadius: 8,
            background: activeTab === 'plan' ? 'var(--pri)' : '#f0f0f0',
            color: activeTab === 'plan' ? '#fff' : '#666',
            fontWeight: activeTab === 'plan' ? 600 : 400,
            transition: 'all 0.2s',
          }}
          onClick={() => switchTab('plan')}
        >
          套餐管理
        </button>
        <button
          style={{
            flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 13,
            borderRadius: 8,
            background: activeTab === 'recharge' ? 'var(--pri)' : '#f0f0f0',
            color: activeTab === 'recharge' ? '#fff' : '#666',
            fontWeight: activeTab === 'recharge' ? 600 : 400,
            transition: 'all 0.2s',
          }}
          onClick={() => switchTab('recharge')}
        >
          充值码管理
        </button>
        <button
          style={{
            flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 13,
            borderRadius: 8,
            background: activeTab === 'balance' ? 'var(--pri)' : '#f0f0f0',
            color: activeTab === 'balance' ? '#fff' : '#666',
            fontWeight: activeTab === 'balance' ? 600 : 400,
            transition: 'all 0.2s',
          }}
          onClick={() => switchTab('balance')}
        >
          余额管理
        </button>
        <button
          style={{
            border: 'none', cursor: 'pointer', borderRadius: 8,
            background: '#f0f0f0', color: '#666', padding: '9px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}
          onClick={() => { if (activeTab === 'plan') setShowCreate(true); else if (activeTab === 'recharge') setShowRcCreate(true); else saveBalanceAmounts(); }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* ===== 套餐管理 ===== */}
      {activeTab === 'plan' && (
        <>
          <div className="segmented-control">
            <button className={`seg-item ${planFilterTab === 'all' ? 'is-active' : ''}`} onClick={() => setPlanFilterTab('all')}>全部套餐</button>
            <button className={`seg-item ${planFilterTab === 'active' ? 'is-active' : ''}`} onClick={() => setPlanFilterTab('active')}>已启用</button>
            <button className={`seg-item ${planFilterTab === 'disabled' ? 'is-active' : ''}`} onClick={() => setPlanFilterTab('disabled')}>已禁用</button>
          </div>

          <div className="action-bar">
            <button className="btn-secondary-lg" onClick={() => { load(); loadRecharges(); }}><RefreshCw className="refresh-icon" size={14} /> 刷新</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
          ) : sortedConfigs.length === 0 ? (
            <div className="data-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>
              <Crown size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>暂无套餐，点击右上角 + 创建</div>
            </div>
          ) : (
            (sortedConfigs || []).map(c => {
              const pricing = normalizePricing(c);
              const isEditing = editing === c.id;
              return (
                <div key={c.id} className="data-card" style={{ maxWidth: '100%', overflow: 'hidden', marginBottom: 8 }}>
                  <div className="data-card__header">
                    <div className="data-card__title">
                      {planIcon(c.label)}
                      <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 8 }}>{c.label}</span>
                      <span className="tag-chip tag-chip--blue" style={{ marginLeft: 6 }}>{c.plan}</span>
                    </div>
                  </div>
                  {c.description && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 8 }}>{c.description}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 16px', marginTop: 14, fontSize: 12 }}>
                    <div><span style={{ color: 'var(--t3)' }}>应用数</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(c.max_apps)}</div></div>
                    <div><span style={{ color: 'var(--t3)' }}>卡密数</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(c.max_cards)}</div></div>
                    <div><span style={{ color: 'var(--t3)' }}>设备/张</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(c.max_devices)}</div></div>
                    <div><span style={{ color: 'var(--t3)' }}>单次生成</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(c.max_gen_once)}</div></div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>定价方案</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {pricing.map((p, i) => <span key={i} className="tag-chip tag-chip--blue">{p.label}：¥{p.price}</span>)}
                    </div>
                  </div>
                  {isEditing && (
                    <div style={{ marginTop: 16, padding: 16, background: 'var(--fcl)', borderRadius: 8, border: '1px solid var(--bd)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {editFields.map(([k, label, type, ph]) => (
                          <div key={k} className="form-group-v2">
                            <label>{label}</label>
                            <input type={type} value={editState[k] || ''} onChange={e => setEditState(s => ({ ...s, [k]: e.target.value }))} placeholder={ph} className="form-input-v2" />
                          </div>
                        ))}
                        <div className="form-group-v2">
                          <label>是否启用</label>
                          <CustomSelect value={editState.is_active || 'true'} options={[{ value: 'true', label: '启用' }, { value: 'false', label: '禁用' }]} onChange={value => setEditState(s => ({ ...s, is_active: value }))} />
                        </div>
                        <div className="form-group-v2" style={{ gridColumn: '1 / -1' }}>
                          <label>套餐购买价格</label>
                          <div className="pricing-editor">
                            {parsePricing(editState.pricing_options || '[]').map((op,idx)=>(
                              <div className="pricing-editor__row" key={idx}>
                                <input value={op.key} disabled={editingIsFree} onChange={e=>updatePricingOption(idx,'key',e.target.value)} placeholder="标识 month" className="form-input-v2" />
                                <input value={op.label} disabled={editingIsFree} onChange={e=>updatePricingOption(idx,'label',e.target.value)} placeholder="月付" className="form-input-v2" />
                                <input type="number" value={op.days} disabled={editingIsFree} onChange={e=>updatePricingOption(idx,'days',e.target.value)} placeholder="天数" max="999999999" className="form-input-v2" />
                                <input type="number" step="0.01" value={op.price} disabled={editingIsFree} onChange={e=>updatePricingOption(idx,'price',e.target.value)} placeholder="价格" max="999999999" className="form-input-v2" />
                                <button type="button" className="act-disable" disabled={editingIsFree} onClick={()=>removePricingOption(idx)}>删</button>
                              </div>
                            ))}
                            <button type="button" className="act-edit" disabled={editingIsFree} onClick={addPricingOption}>+ 添加价格项</button>
                          </div>
                          <small style={{color:'var(--t3)'}}>购买页会直接读取这里的价格；免费套餐不可编辑。</small>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="action-grid" style={{ marginTop: 16 }}>
                    {isEditing ? (
                      <><button className="act-run" onClick={() => saveEdit(c)}><Save size={12} /> 保存</button><button className="act-disable" onClick={cancelEdit}>取消</button></>
                    ) : (
                      <><button className="act-edit" style={{background:'#409eff',color:'#fff',border:'none'}} onClick={() => startEdit(c)}><Pencil size={12} /> 编辑</button><button className="act-log" style={{background:'#fff1f0',color:'#ff4d4f',border:'1px solid #ffccc7'}} onClick={() => deleteConfig(c)}><Trash2 size={12} /> 删除</button></>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ===== 充值码管理 ===== */}
      {activeTab === 'recharge' && (
        <>
          <div className="action-bar" style={{ marginTop: 4 }}>
            {rcSelected.size > 0 ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--t2)', marginRight: 8, whiteSpace: 'nowrap' }}>已选 {rcSelected.size} 项</span>
                <button className="btn-secondary-lg" onClick={copySelectedCodes}><Copy size={14} /> 批量复制</button>
                <button className="btn-secondary-lg" style={{ background: '#ff4d4f', color: '#fff', border: 'none' }} onClick={async () => {
                  if (!confirm(`确定批量删除 ${rcSelected.size} 个充值码？`)) return;
                  try {
                    const res = await adminApi.batchDeleteRechargeCodes(Array.from(rcSelected));
                    if (res.data.success) { toast.success(`已删除 ${rcSelected.size} 个`); setRcSelected(new Set()); loadRecharges(); } else toast.error(res.data.message || '删除失败');
                  } catch { toast.error('删除失败'); }
                }}><Trash2 size={14} /> 批量删除</button>
                <button className="btn-secondary-lg" onClick={() => {
                  const allIds = new Set(rcPageItems.map(r => r.id));
                  if (allIds.size === rcSelected.size && Array.from(allIds).every(id => rcSelected.has(id))) {
                    setRcSelected(new Set());
                  } else {
                    setRcSelected(allIds);
                  }
                }}>全选</button>
              </>
            ) : (
              <>
                <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
                  <Search size={14} />
                  <input value={rcSearch} onChange={e => { setRcSearch(e.target.value); setRcPage(1); }} placeholder="搜索充值码" />
                  {rcSearch && <button className="btn-icon-sm" onClick={() => { setRcSearch(''); setRcPage(1); }} style={{ padding: 0 }}><X size={14} /></button>}
                </div>
                <CustomSelect className="filter-select" value={rcFilter} options={[{ value: '', label: '全部状态' }, { value: 'unused', label: '未使用' }, { value: 'used', label: '已使用' }, { value: 'disabled', label: '已禁用' }]} onChange={value => { setRcFilter(value); setRcPage(1); }} />
                <CustomSelect className="filter-select" value={rcTypeFilter} options={[{ value: '', label: '全部类型' }, { value: 'balance', label: '余额' }, { value: 'plan', label: '套餐' }]} onChange={value => { setRcTypeFilter(value); setRcPage(1); }} />
                <button className="btn-secondary-lg" onClick={loadRecharges}><RefreshCw className="refresh-icon" size={14} /> 刷新</button>
              </>
            )}
          </div>

          {filteredRecharges.length === 0 ? (
            <div className="data-card" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--t3)' }}>
              <Ticket size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>{rcSearch || rcFilter ? '无匹配的充值码' : '暂无充值码，点击右上角 + 生成'}</div>
            </div>
          ) : (
            <>
              {(rcPageItems || []).map(r => (
                <div key={r.id} className="data-card" style={{ maxWidth: '100%', overflow: 'hidden', marginBottom: 8 }}>
                  <div className="data-card__header">
                    <div className="data-card__title">
                      <input type="checkbox" checked={rcSelected.has(r.id)} onChange={() => {
                        setRcSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                          return next;
                        });
                      }} style={{ marginRight: 8, accentColor: 'var(--pri)' }} />
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{r.code}</span>
                      <span className={`status-badge ${r.status === 'unused' ? 'status-badge--success' : r.status === 'used' ? 'status-badge--info' : 'status-badge--danger'}`} style={{whiteSpace:'nowrap'}}>{r.status === 'unused' ? '未使用' : r.status === 'used' ? '已使用' : '已禁用'}</span><span className="tag-chip" style={{whiteSpace:'nowrap',fontSize:12,padding:'4px 8px',lineHeight:1.1,background:r.recharge_type === 'balance' ? '#f3e8ff' : '#e6f4ff',color:r.recharge_type === 'balance' ? '#8b5cf6' : '#1677ff',border:`1px solid ${r.recharge_type === 'balance' ? '#d8b4fe' : '#91caff'}`}}>{r.recharge_type === 'balance' ? '余额' : '套餐'}</span>
                      {r.note && <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 4 }}>— {r.note}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px', marginTop: 10, fontSize: 12 }}>
                    <div><span style={{ color: 'var(--t3)' }}>{r.recharge_type === 'balance' ? '类型' : '套餐'}</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{r.label}</div></div>
                    <div><span style={{ color: 'var(--t3)' }}>{r.recharge_type === 'balance' ? '余额金额' : '时长'}</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{r.recharge_type === 'balance' ? `¥${Number(r.balance_amount || 0).toFixed(2)}` : `${r.duration_days} 天`}</div></div>
                    <div><span style={{ color: 'var(--t3)' }}>创建时间</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{new Date(r.created_at).toLocaleString('zh-CN')}</div></div>
                    {r.merchant && <div><span style={{ color: 'var(--t3)' }}>使用者</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{r.merchant}</div></div>}
                    {r.used_at && <div><span style={{ color: 'var(--t3)' }}>使用时间</span><div style={{ color: 'var(--t1)', marginTop: 2 }}>{new Date(r.used_at).toLocaleString('zh-CN')}</div></div>}
                  </div>
                </div>
              ))}

              {rcTotalPages > 1 && (
                <div className="pagination-v2">
                  <span>共 {filteredRecharges.length} 条（筛选后）</span>
                  <div className="pagination-v2__btns">
                    <button className="pagination-v2__btn" onClick={() => setRcPage(p => Math.max(1, p - 1))} disabled={rcPage === 1}>&lt;</button>
                    {Array.from({ length: Math.min(rcTotalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(rcPage - 2, rcTotalPages - 4));
                      const p = start + i;
                      if (p > rcTotalPages) return null;
                      return <button key={p} className={`pagination-v2__btn ${p === rcPage ? 'is-active' : ''}`} onClick={() => setRcPage(p)}>{p}</button>;
                    })}
                    <button className="pagination-v2__btn" onClick={() => setRcPage(p => Math.min(rcTotalPages, p + 1))} disabled={rcPage >= rcTotalPages}>&gt;</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}


            {/* ===== 余额管理 ===== */}
      {activeTab === 'balance' && (
        <div className="balance-admin-v2 balance-admin-recharge-wrap">
          <div className="data-card recharge-form-card balance-recharge-card">
            <div className="data-card__header balance-recharge-head">
              <div className="data-card__title"><Wallet size={18}/>充值金额</div>
              <span className="balance-min-badge">快捷配置</span>
            </div>
            <div className="balance-custom-title">快捷金额</div>
            <div className="balance-amount-grid">
              {balanceAmounts.split(/[，,\s]+/).filter(Boolean).map((x,i)=><button type="button" className="amount-btn balance-amount-chip" key={i}>{x}</button>)}
            </div>
            <div className="balance-custom-title">自定义金额</div>
            <div className="amount-input balance-price-editor">
              <span>¥</span>
              <input
                className="balance-price-input"
                value={balanceAmounts}
                onChange={e=>setBalanceAmounts(e.target.value)}
                placeholder="10,20,50,100"
              />
            </div>
            <button className="btn-primary-lg balance-save-btn" onClick={saveBalanceAmounts}><Save size={17}/> 保存</button>
            <p className="hint-line balance-price-help">多个金额可用中文逗号、英文逗号或空格分隔；仅保留大于 0 的有效数字。</p>
          </div>
          <div className="data-card recharge-form-card balance-discount-card">
            <div className="data-card__header balance-recharge-head">
              <div className="data-card__title"><Percent size={18}/>充值折扣配置</div>
              <span className="balance-min-badge">阶梯赠送</span>
            </div>
            <p className="hint-line" style={{margin:'4px 0 12px'}}>设置充值满额赠送的额外余额比例。例如：满 100 元额外赠送 5%，即到账 105 元。规则按门槛升序匹配，命中最高一档。</p>
            <div className="balance-discount-list">
              {balanceDiscounts.length===0 && <div className="balance-discount-empty">暂无规则，点击下方按钮新增</div>}
              {balanceDiscounts.map((rule,i)=>(
                <div className="balance-discount-row" key={i}>
                  <div className="form-group-v2 balance-discount-field"><label>充值满 (¥)</label><input type="number" min={0} value={rule.threshold||''} onChange={e=>updateDiscountRule(i,'threshold',Number(e.target.value))} className="form-input-v2" placeholder="100"/></div>
                  <div className="form-group-v2 balance-discount-field"><label>额外赠送 (%)</label><input type="number" min={0} max={500} step={0.1} value={rule.bonus||''} onChange={e=>updateDiscountRule(i,'bonus',Number(e.target.value))} className="form-input-v2" placeholder="5"/></div>
                  <button className="balance-discount-remove" type="button" onClick={()=>removeDiscountRule(i)} aria-label="删除"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
            <div className="balance-discount-actions">
              <button type="button" className="balance-discount-add" onClick={addDiscountRule}><Plus size={14}/> 新增一条规则</button>
              <button className="btn-primary-lg balance-save-btn" onClick={saveBalanceDiscounts}><Save size={17}/> 保存折扣</button>
            </div>
          </div>
        </div>
      )}
{/* ===== 创建套餐弹窗 ===== */}
      {showCreate && (
        <div className="modal-overlay is-open">
          <div className="modal-v2">
            <div className="modal-v2__header"><span className="modal-v2__title">创建套餐</span><button className="modal-v2__close" onClick={() => setShowCreate(false)}>×</button></div>
            <div className="modal-v2__body">
              {createFields.map(([k, label, ph]) => (
                <div key={k} className="form-group-v2">
                  <label>{label}</label>
                  <input value={createForm[k] || ''} onChange={e => setCreateForm(s => ({ ...s, [k]: e.target.value }))} placeholder={ph as string} className="form-input-v2" />
                </div>
              ))}
            </div>
            <div className="modal-v2__footer"><button className="btn-cancel" onClick={() => setShowCreate(false)}>取消</button><button className="btn-confirm" onClick={doCreate}>创建</button></div>
          </div>
        </div>
      )}

      {/* ===== 生成充值码弹窗 ===== */}
      {showRcCreate && (
        <div className="modal-overlay is-open">
          <div className="modal-v2">
            <div className="modal-v2__header"><span className="modal-v2__title">生成充值码</span><button className="modal-v2__close" onClick={() => setShowRcCreate(false)}>×</button></div>
            <div className="modal-v2__body rc-create-grid">
              <div className="form-group-v2" style={{ gridColumn: '1 / -1' }}><label>卡密类型</label><CustomSelect value={rcCreateForm.recharge_type} options={[{ value: 'plan', label: '套餐时长卡密' }, { value: 'balance', label: '兑换余额卡密' }]} onChange={value => setRcCreateForm(s => ({ ...s, recharge_type: value }))} /></div>
              {rcCreateForm.recharge_type === 'plan' ? <>
                <div className="form-group-v2"><label>套餐</label><CustomSelect value={rcCreateForm.plan} placeholder="请选择" options={[{ value: '', label: '请选择' }, ...(configs || []).filter(c => c.plan !== 'free').map(c => ({ value: c.plan, label: c.label }))]} onChange={value => setRcCreateForm(s => ({ ...s, plan: value }))} /></div>
                <div className="form-group-v2"><label>计费周期</label><CustomSelect value={rcCreateForm.billing_cycle} options={[{ value: 'month', label: '月付' }, { value: 'quarter', label: '季付' }, { value: 'year', label: '年付' }]} onChange={value => setRcCreateForm(s => ({ ...s, billing_cycle: value }))} /></div>
                <div className="form-group-v2"><label>有效天数</label><input type="number" min={1} value={rcCreateForm.duration_days} onChange={e => setRcCreateForm(s => ({ ...s, duration_days: Number(e.target.value) }))} className="form-input-v2" /></div>
              </> : <div className="form-group-v2"><label>兑换余额金额</label><input type="number" min={0.01} max={999999999} step="0.01" value={rcCreateForm.balance_amount} onChange={e => setRcCreateForm(s => ({ ...s, balance_amount: Math.min(Number(e.target.value), 999999999) }))} className="form-input-v2" placeholder="例如 10.00" /></div>}
              <div className="form-group-v2"><label>生成数量</label><input type="number" min={1} max={500} value={rcCreateForm.count} onChange={e => setRcCreateForm(s => ({ ...s, count: Number(e.target.value) }))} className="form-input-v2" /></div>
              <div className="form-group-v2" style={{ gridColumn: '1 / -1' }}><label>备注</label><input value={rcCreateForm.note} onChange={e => setRcCreateForm(s => ({ ...s, note: e.target.value }))} placeholder="可选，例如 活动赠送/余额充值" className="form-input-v2" /></div>
            </div>
            <div className="modal-v2__footer"><button className="btn-cancel" onClick={() => setShowRcCreate(false)}>取消</button><button className="btn-confirm" onClick={doCreateRecharge}>生成</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

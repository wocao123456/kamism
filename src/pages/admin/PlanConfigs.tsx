import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Save, RefreshCw, Crown, Gift, Infinity, Plus, Ticket, Trash2, Copy, Pencil, Star, Zap, Shield, Gem, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface PricingOption { key:string; label:string; days:number; price:number|string; }
interface PlanConfig { id:string; plan:string; label:string; description?:string; max_apps:number; max_cards:number; max_devices:number; max_gen_once:number; price_month:any; price_quarter:any; price_year:any; pricing_options?:PricingOption[]; sort_order:number; is_active:boolean; updated_at:string; }
interface RechargeItem { id:string; code:string; plan:string; label:string; duration_days:number; status:string; merchant?:string; created_at:string; used_at?:string; note?:string; }
type EditState = Record<string,string>;

const editFields = [
  ['label','套餐名称','text','显示给商户看的套餐名'], ['description','套餐说明','text','例如：适合团队长期使用'], ['max_apps','应用数','number','-1 表示无限'], ['max_cards','卡密数','number','-1 表示无限'], ['max_devices','设备/张','number','单张卡密可绑定设备数'], ['max_gen_once','单次生成','number','商户一次最多生成数量'], ['sort_order','排序','number','数字越小越靠前']
] as const;
const createFields = [
  ['plan','套餐标识','例如 vip，只能小写字母/数字/-/_'], ['label','套餐名称','例如 VIP 套餐'], ['description','套餐说明','可留空'], ['max_apps','应用数','-1 表示无限'], ['max_cards','卡密数','-1 表示无限'], ['max_devices','设备/张','1-100，-1 表示无限'], ['max_gen_once','单次生成','一次最多生成卡密数量'], ['sort_order','排序','数字越小越靠前']
] as const;
const cycles = [
  ['day','天卡',1], ['week','周卡',7], ['month','月卡',30], ['quarter','季卡',90], ['year','年卡',365], ['custom','自定义',30],
] as const;
const defaultPricing: PricingOption[] = [
  {key:'month',label:'月付',days:30,price:39},
];

function displayVal(v:number){return v===-1?'无限':String(v)}
function normalizePricing(c:PlanConfig): PricingOption[] { const arr=Array.isArray(c.pricing_options)?c.pricing_options:[]; if(arr.length) return arr; return [{key:'month',label:'月付',days:30,price:c.price_month||0}]; }
function toEdit(c:PlanConfig):EditState{ return { label:c.label, description:c.description||'', max_apps:String(c.max_apps), max_cards:String(c.max_cards), max_devices:String(c.max_devices), max_gen_once:String(c.max_gen_once), sort_order:String(c.sort_order??100), is_active:String(c.is_active), pricing_options: JSON.stringify(normalizePricing(c)) }; }
function statusText(s:string){ return s === 'used' ? '已使用' : s === 'disabled' ? '已禁用' : '未使用'; }
function planIcon(label:string, size=20){ const t=label.toLowerCase(); if(t.includes('vip'))return <Crown size={size}/>; if(t.includes('svip')||t.includes('至尊')||t.includes('max'))return <Gem size={size}/>; if(t.includes('pro')||t.includes('专业'))return <Zap size={size}/>; if(t.includes('安全')||t.includes('企业'))return <Shield size={size}/>; if(t.includes('免费')||t.includes('free'))return <Gift size={size}/>; if(t.includes('认证')||t.includes('高级'))return <BadgeCheck size={size}/>; return <Star size={size}/>; }
function parsePricing(value:string): PricingOption[] { try { const arr=JSON.parse(value||'[]'); return Array.isArray(arr)?arr:[]; } catch { return []; } }
function pricingToLegacy(items: PricingOption[]) { const find=(keys:string[])=>items.find(i=>keys.includes(String(i.key))||keys.some(k=>String(i.label).includes(k))); return { price_month:Number(find(['month','月'])?.price||0), price_quarter:Number(find(['quarter','季'])?.price||0), price_year:Number(find(['year','年'])?.price||0) }; }

function PricingEditor({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const items = parsePricing(value);
  const set = (next: PricingOption[]) => onChange(JSON.stringify(next));
  return <div className="pricing-editor">
    <div className="section-title" style={{marginTop:12}}>价格周期</div>
    {items.map((it,idx)=><div key={idx} className="pricing-row">
      <input className="input" placeholder="名称，如月付" value={it.label} onChange={e=>{const n=[...items];n[idx]={...it,label:e.target.value,key:e.target.value.trim()||it.key};set(n)}}/>
      <input className="input" type="number" placeholder="天数" value={it.days} onChange={e=>{const n=[...items];n[idx]={...it,days:Number(e.target.value)};set(n)}}/>
      <input className="input" type="number" placeholder="价格" value={it.price} onChange={e=>{const n=[...items];n[idx]={...it,price:e.target.value};set(n)}}/>
      <button className="btn btn-danger" onClick={()=>set(items.filter((_,i)=>i!==idx))}>删除</button>
    </div>)}
    <button className="btn btn-ghost" onClick={()=>set([...items,{key:'custom_'+Date.now(),label:'自定义',days:30,price:0}])}>添加价格项</button>
  </div>
}

export default function PlanConfigs(){
  const [configs,setConfigs]=useState<PlanConfig[]>([]);
  const [edits,setEdits]=useState<Record<string,EditState>>({});
  const [saving,setSaving]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [section,setSection]=useState<'plans'|'recharge'>('plans');
  const [editing,setEditing]=useState<Record<string,boolean>>({});
  const [codes,setCodes]=useState<string[]>([]);
  const [recharge,setRecharge]=useState<{stats:any;items:RechargeItem[]}>({stats:{total:0,used:0,unused:0,disabled:0},items:[]});
  const [rechargeFilter,setRechargeFilter]=useState('');
  const [selectedCodes,setSelectedCodes]=useState<string[]>([]);
  const [newPlan,setNewPlan]=useState({plan:'vip',label:'VIP套餐',description:'',max_apps:'-1',max_cards:'-1',max_devices:'100',max_gen_once:'1000',sort_order:'20'});
  const [newPricing,setNewPricing]=useState(JSON.stringify(defaultPricing));
  const [gen,setGen]=useState({plan:'pro',billing_cycle:'month',duration_days:'30',count:'10',prefix:'RC',note:''});

  const paidPlans = useMemo(()=>configs.filter(c=>c.plan!=='free'&&c.is_active),[configs]);
  const selectablePlans = paidPlans.length ? paidPlans : configs.filter(c=>c.is_active);
  const loadRecharge=(status=rechargeFilter)=>adminApi.getRechargeCodes({status:status||undefined,limit:120}).then(r=>{if(r.data.success){setRecharge(r.data.data||{stats:{},items:[]});setSelectedCodes([])}}).catch(()=>{});
  const load=()=>{setLoading(true);adminApi.getPlanConfigs().then(r=>{if(r.data.success){const arr=r.data.data||[];setConfigs(arr);const m:Record<string,EditState>={};arr.forEach((c:PlanConfig)=>m[c.id]=toEdit(c));setEdits(m);const first=arr.find((x:PlanConfig)=>x.plan!=='free')?.plan||arr[0]?.plan||'pro';setGen(g=>({...g,plan:first}));}}).finally(()=>setLoading(false));loadRecharge();};
  useEffect(()=>{load();},[]);

  const save=async(c:PlanConfig)=>{const e=edits[c.id]; if(!e)return; const pricing=parsePricing(e.pricing_options||'[]'); if(pricing.length===0){toast.error('请至少保留一个价格项');return;} setSaving(c.id); try{const payload:any={...e,is_active:e.is_active==='true',pricing_options:pricing,...pricingToLegacy(pricing)}; ['max_apps','max_cards','max_devices','max_gen_once','sort_order'].forEach(k=>payload[k]=Number(payload[k])); const r=await adminApi.updatePlanConfig(c.id,payload); if(r.data.success){toast.success('套餐已保存');setEditing(p=>({...p,[c.id]:false}));load();}else toast.error(r.data.message||'保存失败');}catch{toast.error('保存失败')}finally{setSaving(null)}};
  const create=async()=>{const pricing=parsePricing(newPricing); if(pricing.length===0){toast.error('请至少添加一个价格项');return;} setCreating(true);try{const payload:any={...newPlan,pricing_options:pricing,...pricingToLegacy(pricing)}; ['max_apps','max_cards','max_devices','max_gen_once','sort_order'].forEach(k=>payload[k]=Number(payload[k])); const r=await adminApi.createPlanConfig(payload); if(r.data.success){toast.success('套餐已创建');setShowCreate(false);load();}else toast.error(r.data.message||'创建失败');}catch{toast.error('创建失败')}finally{setCreating(false)}};
  const remove=async(c:PlanConfig)=>{ if(c.plan==='free'){toast.error('免费套餐为固定套餐，不能删除');return;} if(!confirm(`确定删除套餐「${c.label}」？已有商户使用时后端会阻止删除。`))return; try{const r=await adminApi.deletePlanConfig(c.id); if(r.data.success){toast.success('套餐已删除');load();}else toast.error(r.data.message||'删除失败');}catch{toast.error('删除失败')} };
  const generateCodes=async()=>{try{const r=await adminApi.generateRechargeCodes({...gen,duration_days:Number(gen.duration_days),count:Number(gen.count)}); if(r.data.success){setCodes(r.data.data||[]);toast.success('兑换卡密已生成');loadRecharge();}else toast.error(r.data.message||'生成失败');}catch{toast.error('生成失败')}};
  const deleteRecharge=async(i:RechargeItem)=>{ if(!confirm(`确定删除兑换卡密 ${i.code}？`))return; try{const r=await adminApi.deleteRechargeCode(i.id); if(r.data.success){toast.success('兑换卡密已删除');loadRecharge();}else toast.error(r.data.message||'删除失败');}catch{toast.error('删除失败')} };
  const batchDelete=async()=>{ if(selectedCodes.length===0){toast.error('请选择要删除的兑换卡密');return;} if(!confirm(`确定删除选中的 ${selectedCodes.length} 张兑换卡密？`))return; try{const r=await adminApi.batchDeleteRechargeCodes(selectedCodes); if(r.data.success){toast.success(r.data.message||'批量删除成功');loadRecharge();}else toast.error(r.data.message||'删除失败');}catch{toast.error('删除失败')} };
  const copyCodes=()=>{navigator.clipboard?.writeText(codes.join('\n'));toast.success('已复制生成结果')};
  const chooseCycle=(key:string, days:number)=>setGen(g=>({...g,billing_cycle:key,duration_days:key==='custom'?g.duration_days:String(days)}));

  return <div className="fade-in admin-plan-page">
    <div className="page-header"><div><h1 className="page-title">套餐配置</h1><p className="page-subtitle">自定义套餐、兑换卡密生成与使用状态统一管理</p></div><div className="page-header-actions"><button className="btn btn-ghost" onClick={load}><RefreshCw size={14}/> 刷新</button>{section==='plans'&&<button className="btn btn-primary" onClick={()=>setShowCreate(v=>!v)}><Plus size={14}/> 添加套餐</button>}</div></div>
    <div className="plan-section-tabs"><button className={section==='plans'?'active':''} onClick={()=>setSection('plans')}>套餐管理</button><button className={section==='recharge'?'active':''} onClick={()=>setSection('recharge')}>卡密生成</button></div>

    {section==='plans'&&<>
      {showCreate&&<div className="card plan-create-card"><div className="section-title">{planIcon(newPlan.label,17)}<span>新增自定义套餐</span></div><div className="form-grid compact">{createFields.map(([k,label,ph])=><label key={k} className="field"><span>{label}</span><input className="input" value={(newPlan as any)[k]} placeholder={ph} onChange={e=>setNewPlan(p=>({...p,[k]:e.target.value}))}/></label>)}</div><PricingEditor value={newPricing} onChange={setNewPricing}/><button className="btn btn-primary" disabled={creating} onClick={create}><Plus size={14}/> 创建套餐</button></div>}
      <div className="plan-summary-grid">{configs.map(c=><div key={c.id} className="plan-summary"><div>{planIcon(c.label,18)}<strong>{c.label}</strong></div><p>{c.description||'暂无说明'}</p><span>应用 {displayVal(c.max_apps)} · 卡密 {displayVal(c.max_cards)} · 设备 {displayVal(c.max_devices)}/张</span></div>)}</div>
      {loading?<div style={{textAlign:'center',padding:60}}><span className="spinner"/></div>:<div className="plan-card-grid">{configs.map(c=>{const e=edits[c.id]; if(!e)return null; const isEditing=!!editing[c.id]; return <div key={c.id} className="card plan-edit-card"><div className="plan-card-head clean"><span className="plan-auto-icon">{planIcon(e.label||c.label,20)}</span><div><h3>{c.label}</h3><p>plan: {c.plan}</p></div></div><div className="limit-row">{[['应用',c.max_apps],['卡密',c.max_cards],['设备/张',c.max_devices],['单次',c.max_gen_once]].map(([l,v])=><span key={l as string}>{v===-1&&<Infinity size={11}/>} {l}: {displayVal(v as number)}</span>)}</div>{isEditing&&<><div className="form-grid compact">{editFields.map(([k,l,t,h])=><label key={k} className="field"><span>{l}</span><input className="input" type={t} value={e[k]??''} placeholder={h} onChange={ev=>setEdits(p=>({...p,[c.id]:{...p[c.id],[k]:ev.target.value}}))}/></label>)}</div><PricingEditor value={e.pricing_options||'[]'} onChange={v=>setEdits(p=>({...p,[c.id]:{...p[c.id],pricing_options:v}}))}/></>}<div className="toolbar-row end"><button className="btn btn-ghost" onClick={()=>setEditing(p=>({...p,[c.id]:!isEditing}))}><Pencil size={14}/> {isEditing?'收起编辑':'编辑'}</button>{isEditing&&<button className="btn btn-primary" onClick={()=>save(c)} disabled={saving===c.id}>{saving===c.id?'保存中...':<><Save size={14}/> 保存</>}</button>}{c.plan!=='free'&&<button className="btn btn-danger" onClick={()=>remove(c)}><Trash2 size={14}/> 删除</button>}</div></div>})}</div>}
    </>}

    {section==='recharge'&&<>
      <div className="card recharge-generate-panel"><div className="section-head"><div className="section-title"><Ticket size={17}/><span>生成兑换卡密</span></div></div><div className="form-grid compact"><select className="input" value={gen.plan} onChange={e=>setGen(g=>({...g,plan:e.target.value}))}>{selectablePlans.map(c=><option key={c.plan} value={c.plan}>{c.label}</option>)}</select><input className="input" placeholder="生成数量" value={gen.count} onChange={e=>setGen(g=>({...g,count:e.target.value}))}/><input className="input" placeholder="前缀，如 RC" value={gen.prefix} onChange={e=>setGen(g=>({...g,prefix:e.target.value}))}/><input className="input" placeholder="备注" value={gen.note} onChange={e=>setGen(g=>({...g,note:e.target.value}))}/></div><div className="cycle-picker">{cycles.map(([key,label,days])=><button key={key} className={gen.billing_cycle===key?'active':''} onClick={()=>chooseCycle(key,days)}>{label}</button>)}</div><label className="field"><span>有效天数</span><input className="input" placeholder="有效天数" value={gen.duration_days} disabled={gen.billing_cycle!=='custom'} onChange={e=>setGen(g=>({...g,duration_days:e.target.value}))}/></label><div className="toolbar-row"><button className="btn btn-primary" onClick={generateCodes}><Ticket size={14}/> 生成兑换卡密</button>{codes.length>0&&<button className="btn btn-ghost" onClick={copyCodes}><Copy size={14}/> 复制本次生成</button>}</div>{codes.length>0&&<pre className="code-output">{codes.join('\n')}</pre>}</div>
      <div className="card recharge-list-panel"><div className="section-head"><div className="section-title"><Ticket size={17}/><span>兑换卡密列表</span></div><div className="metric-row"><span>已生成 <b>{recharge.stats?.total||0}</b></span><span>已使用 <b>{recharge.stats?.used||0}</b></span><span>未使用 <b>{recharge.stats?.unused||0}</b></span></div></div><div className="toolbar-row"><div className="segmented">{[['','全部'],['unused','未使用'],['used','已使用']].map(([v,l])=><button key={v} className={rechargeFilter===v?'active':''} onClick={()=>{setRechargeFilter(v);loadRecharge(v)}}>{l}</button>)}</div><button className="btn btn-danger" disabled={selectedCodes.length===0} onClick={batchDelete}><Trash2 size={14}/> 批量删除 {selectedCodes.length>0?selectedCodes.length:''}</button></div><div className="recharge-card-list">{recharge.items.length===0?<div className="empty-state-text">暂无兑换卡密</div>:recharge.items.map(i=>{const checked=selectedCodes.includes(i.id);return <div key={i.id} className="recharge-code-card"><input type="checkbox" checked={checked} onChange={()=>setSelectedCodes(prev=>checked?prev.filter(x=>x!==i.id):[...prev,i.id])}/><div className="recharge-code-main"><button title="点击复制" onClick={()=>{navigator.clipboard?.writeText(i.code);toast.success('已复制兑换卡密')}}>{i.code}</button><span>{i.label} · {i.duration_days}天 · {statusText(i.status)}</span><span>{i.merchant||'未使用'} · {new Date(i.created_at).toLocaleDateString('zh-CN')}</span></div><button className="btn btn-danger btn-sm" onClick={()=>deleteRecharge(i)}><Trash2 size={12}/> 删除</button></div>})}</div></div>
    </>}
  </div>
}

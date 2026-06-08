import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { Save, RefreshCw, Crown, Gift, Infinity, Plus, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

interface PlanConfig { id:string; plan:string; label:string; description?:string; max_apps:number; max_cards:number; max_devices:number; max_gen_once:number; price_month:any; price_quarter:any; price_year:any; sort_order:number; is_active:boolean; updated_at:string; }
type EditState = Record<string,string>;

const fields = [
  ['label','套餐显示名称','text'], ['description','套餐说明','text'], ['max_apps','最多应用数','number'], ['max_cards','最多卡密总数','number'], ['max_devices','单张卡密最多设备数','number'], ['max_gen_once','单次最多生成卡密数','number'], ['price_month','月价格','number'], ['price_quarter','季价格','number'], ['price_year','年价格','number'], ['sort_order','排序','number']
] as const;
function displayVal(v:number){return v===-1?'无限':String(v)}
function toEdit(c:PlanConfig):EditState{ return { label:c.label, description:c.description||'', max_apps:String(c.max_apps), max_cards:String(c.max_cards), max_devices:String(c.max_devices), max_gen_once:String(c.max_gen_once), price_month:String(c.price_month??0), price_quarter:String(c.price_quarter??0), price_year:String(c.price_year??0), sort_order:String(c.sort_order??100), is_active:String(c.is_active) }; }

export default function PlanConfigs(){
  const [configs,setConfigs]=useState<PlanConfig[]>([]); const [edits,setEdits]=useState<Record<string,EditState>>({}); const [saving,setSaving]=useState<string|null>(null); const [loading,setLoading]=useState(true);
  const [creating,setCreating]=useState(false); const [codes,setCodes]=useState<string[]>([]);
  const [newPlan,setNewPlan]=useState({plan:'vip',label:'VIP套餐',description:'',max_apps:'-1',max_cards:'-1',max_devices:'100',max_gen_once:'1000',price_month:'39',price_quarter:'99',price_year:'399',sort_order:'20'});
  const [gen,setGen]=useState({plan:'pro',billing_cycle:'month',duration_days:'30',count:'10',prefix:'RC',note:''});
  const load=()=>{setLoading(true);adminApi.getPlanConfigs().then(r=>{if(r.data.success){setConfigs(r.data.data||[]);const m:Record<string,EditState>={};(r.data.data||[]).forEach((c:PlanConfig)=>m[c.id]=toEdit(c));setEdits(m); if((r.data.data||[])[0]) setGen(g=>({...g,plan:(r.data.data||[]).find((x:PlanConfig)=>x.plan!=='free')?.plan||'pro'}));}}).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const save=async(c:PlanConfig)=>{const e=edits[c.id]; if(!e)return; setSaving(c.id); try{const payload:any={...e,is_active:e.is_active==='true'}; ['max_apps','max_cards','max_devices','max_gen_once','sort_order'].forEach(k=>payload[k]=Number(payload[k])); ['price_month','price_quarter','price_year'].forEach(k=>payload[k]=Number(payload[k])); const r=await adminApi.updatePlanConfig(c.id,payload); if(r.data.success){toast.success('套餐已保存');load();}else toast.error(r.data.message||'保存失败');}catch{toast.error('保存失败')}finally{setSaving(null)}};
  const create=async()=>{setCreating(true);try{const payload:any={...newPlan}; ['max_apps','max_cards','max_devices','max_gen_once','sort_order'].forEach(k=>payload[k]=Number(payload[k])); ['price_month','price_quarter','price_year'].forEach(k=>payload[k]=Number(payload[k])); const r=await adminApi.createPlanConfig(payload); if(r.data.success){toast.success('套餐已创建');load();}else toast.error(r.data.message||'创建失败');}catch{toast.error('创建失败')}finally{setCreating(false)}};
  const generateCodes=async()=>{try{const r=await adminApi.generateRechargeCodes({...gen,duration_days:Number(gen.duration_days),count:Number(gen.count)}); if(r.data.success){setCodes(r.data.data||[]);toast.success('兑换卡密已生成');}else toast.error(r.data.message||'生成失败');}catch{toast.error('生成失败')}};

  return <div className="fade-in">
    <div className="page-header"><div><h1 className="page-title">套餐配置</h1><p className="page-subtitle">支持自定义套餐、月/季/年价格和充值兑换卡密生成，修改后实时生效</p></div><button className="btn btn-ghost" onClick={load}><RefreshCw size={14}/> 刷新</button></div>

    <div className="card" style={{marginBottom:18}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Plus size={17}/><h3 style={{fontSize:16,fontWeight:800}}>新增自定义套餐</h3></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
        {Object.keys(newPlan).map(k=><div key={k}><div style={{fontSize:12,color:'var(--text-muted)',marginBottom:5}}>{k}</div><input className="input" value={(newPlan as any)[k]} onChange={e=>setNewPlan(p=>({...p,[k]:e.target.value}))}/></div>)}
      </div><button className="btn btn-primary" style={{marginTop:12}} disabled={creating} onClick={create}><Plus size={14}/> 创建套餐</button>
    </div>

    <div className="card" style={{marginBottom:18,background:'linear-gradient(135deg,rgba(124,106,247,.10),var(--surface))'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><Ticket size={17}/><h3 style={{fontSize:16,fontWeight:800}}>生成充值兑换卡密</h3></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
        <select className="input" value={gen.plan} onChange={e=>setGen(g=>({...g,plan:e.target.value}))}>{configs.filter(c=>c.plan!=='free'&&c.is_active).map(c=><option key={c.plan} value={c.plan}>{c.label}</option>)}</select>
        <select className="input" value={gen.billing_cycle} onChange={e=>setGen(g=>({...g,billing_cycle:e.target.value,duration_days:e.target.value==='year'?'365':e.target.value==='quarter'?'90':'30'}))}><option value="month">月</option><option value="quarter">季</option><option value="year">年</option><option value="custom">自定义</option></select>
        <input className="input" placeholder="天数" value={gen.duration_days} onChange={e=>setGen(g=>({...g,duration_days:e.target.value}))}/><input className="input" placeholder="数量" value={gen.count} onChange={e=>setGen(g=>({...g,count:e.target.value}))}/><input className="input" placeholder="前缀" value={gen.prefix} onChange={e=>setGen(g=>({...g,prefix:e.target.value}))}/><input className="input" placeholder="备注" value={gen.note} onChange={e=>setGen(g=>({...g,note:e.target.value}))}/>
      </div><button className="btn btn-primary" style={{marginTop:12}} onClick={generateCodes}><Ticket size={14}/> 生成</button>
      {codes.length>0&&<pre style={{marginTop:12,padding:12,border:'1px solid var(--border)',borderRadius:8,maxHeight:180,overflow:'auto',whiteSpace:'pre-wrap'}}>{codes.join('\n')}</pre>}
    </div>

    {loading?<div style={{textAlign:'center',padding:60}}><span className="spinner"/></div>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(330px,1fr))',gap:18}}>
      {configs.map(c=>{const e=edits[c.id]; if(!e)return null; const pro=c.plan!=='free'; return <div key={c.id} className="card" style={{borderColor:pro?'rgba(124,58,237,.35)':'var(--border)',background:pro?'linear-gradient(135deg,rgba(124,58,237,.06),var(--surface) 60%)':'var(--surface)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18,paddingBottom:14,borderBottom:'1px solid var(--border)'}}>{pro?<Crown size={20} color="#a78bfa"/>:<Gift size={20}/>}<div><h3 style={{fontSize:17,fontWeight:900}}>{c.label}</h3><p style={{fontSize:12,color:'var(--text-muted)'}}>plan: {c.plan} · {c.is_active?'启用':'停用'}</p></div></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>{[['应用',c.max_apps],['卡密',c.max_cards],['设备/张',c.max_devices],['单次生成',c.max_gen_once]].map(([l,v])=><span key={l as string} style={{fontSize:12,padding:'3px 9px',border:'1px solid var(--border)',borderRadius:999}}>{v===-1&&<Infinity size={11}/>} {l}: {displayVal(v as number)}</span>)}</div>
        <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,fontSize:13}}><input type="checkbox" checked={e.is_active==='true'} onChange={ev=>setEdits(p=>({...p,[c.id]:{...p[c.id],is_active:String(ev.target.checked)}}))}/> 启用套餐</label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>{fields.map(([k,l,t])=><div key={k}><div style={{fontSize:12,color:'var(--text-muted)',marginBottom:5}}>{l}</div><input className="input" type={t} value={e[k]??''} onChange={ev=>setEdits(p=>({...p,[c.id]:{...p[c.id],[k]:ev.target.value}}))}/></div>)}</div>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:16}} onClick={()=>save(c)} disabled={saving===c.id}>{saving===c.id?'保存中...':<><Save size={14}/> 保存配置</>}</button>
      </div>})}
    </div>}
  </div>
}

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { plansApi, merchantApi } from '../../lib/api';
import { Crown, CreditCard, Ticket, CheckCircle } from 'lucide-react';

interface PricingOption { key:string; label:string; days:number; price:string|number; }
interface Plan { id:string; plan:string; label:string; description?:string; price_month:string|number; price_quarter:string|number; price_year:string|number; pricing_options?:PricingOption[]; max_apps:number; max_cards:number; max_devices:number; max_gen_once:number; }

function val(v:number){ return v === -1 ? '无限' : String(v); }
function prices(p:Plan): PricingOption[] {
  const arr = Array.isArray(p.pricing_options) ? p.pricing_options : [];
  if (arr.length) return arr;
  return [
    { key:'month', label:'月付', days:30, price:p.price_month },
    { key:'quarter', label:'季付', days:90, price:p.price_quarter },
    { key:'year', label:'年付', days:365, price:p.price_year },
  ];
}

export default function Recharge(){
  const [plans,setPlans]=useState<Plan[]>([]);
  const [loading,setLoading]=useState(true);
  const [code,setCode]=useState('');
  const [redeeming,setRedeeming]=useState(false);

  const load=()=>{ setLoading(true); plansApi.list().then(r=>{ if(r.data.success) setPlans((r.data.data||[]).filter((p:Plan)=>p.plan && p.plan.toLowerCase() !== 'free')); }).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);

  const redeem=async()=>{
    if(!code.trim()){ toast.error('请输入充值卡密'); return; }
    setRedeeming(true);
    try{ const r=await merchantApi.redeemRechargeCode(code.trim()); if(r.data.success){ toast.success(r.data.message||'兑换成功'); setCode(''); window.dispatchEvent(new Event('merchant-sync')); } else toast.error(r.data.message||'兑换失败，请检查卡密是否正确或是否已使用'); }
    catch{ toast.error('兑换失败，请检查网络或登录身份'); } finally{ setRedeeming(false); }
  };

  return <div className="fade-in">
    <div className="page-header"><div><h1 className="page-title">商户充值</h1><p className="page-subtitle">购买套餐或使用充值卡密兑换套餐</p></div></div>

    <div className="card" style={{marginBottom:20,background:'linear-gradient(135deg, rgba(124,106,247,.12), var(--surface))'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><Ticket size={18} color="var(--accent)"/><h3 style={{fontSize:16,fontWeight:800}}>卡密兑换套餐</h3></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="请输入平台生成的充值兑换卡密" style={{flex:1,minWidth:240}}/>
        <button className="btn btn-primary" disabled={redeeming} onClick={redeem}>{redeeming?'兑换中...':<><CheckCircle size={14}/> 立即兑换</>}</button>
      </div>
    </div>

    {loading ? <div style={{textAlign:'center',padding:60}}><span className="spinner"/></div> :
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18}}>
      {plans.map(p=><div key={p.id} className="card" style={{borderColor:'rgba(124,106,247,.28)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-28,top:16,transform:'rotate(35deg)',background:'var(--accent)',color:'#fff',padding:'4px 36px',fontSize:11,fontWeight:800}}>套餐</div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><Crown size={20} color="#a78bfa"/><h3 style={{fontSize:18,fontWeight:900}}>{p.label}</h3></div>
        <p style={{color:'var(--text-muted)',fontSize:13,minHeight:36}}>{p.description||'商户专属功能套餐'}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,margin:'14px 0',fontSize:12,color:'var(--text-muted)'}}>
          <span>应用 {val(p.max_apps)}</span><span>卡密 {val(p.max_cards)}</span><span>设备/张 {val(p.max_devices)}</span><span>单次生成 {val(p.max_gen_once)}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {prices(p).map(c=><button key={c.key} className="btn btn-ghost" style={{justifyContent:'space-between'}} onClick={()=>toast('支付通道待接入，可使用充值卡密兑换')}>
            <span><CreditCard size={14}/> {c.days}天（{c.label}）</span><strong>¥{Number(c.price||0).toFixed(2)}</strong>
          </button>)}
        </div>
      </div>)}
    </div>}
  </div>;
}
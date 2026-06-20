import { useEffect, useMemo, useState } from 'react';
import { Crown, Gift, Zap, Shield, Gem, BadgeCheck, Star, Ticket, Wallet, Coins, CreditCard, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { plansApi, merchantApi, publicSystemConfig } from '../../lib/api';
import AnimatedNumber from '../../components/AnimatedNumber';

interface PricingOption { key: string; label: string; days: number; price: number; }
interface PlanConfig { plan: string; label: string; description?: string; max_apps: number; max_cards: number; max_devices: number; max_gen_once: number; pricing_options?: PricingOption[]; price_month: number; price_quarter: number; price_year: number; sort_order: number; is_active: boolean; }
interface Profile { username?: string; balance?: number; plan?: string; plan_expires_at?: string | null; }

type Tab = 'balance' | 'plans' | 'redeem';
const defaultQuickAmounts: number[] = [];
function displayVal(v: number) { return v == null ? '0' : v === -1 ? '无限' : String(v); }
function planIcon(label: string, size = 24) { const t=(label||'').toLowerCase(); if(t.includes('vip'))return <Crown size={size}/>; if(t.includes('svip')||t.includes('至尊')||t.includes('max'))return <Gem size={size}/>; if(t.includes('pro')||t.includes('专业'))return <Zap size={size}/>; if(t.includes('安全')||t.includes('企业'))return <Shield size={size}/>; if(t.includes('免费')||t.includes('free'))return <Gift size={size}/>; if(t.includes('认证')||t.includes('高级'))return <BadgeCheck size={size}/>; return <Star size={size}/>; }

export default function Recharge(){
 const [plans,setPlans]=useState<PlanConfig[]>([]);
 const [profile,setProfile]=useState<Profile>({});
 const [loading,setLoading]=useState(true);
 const [purchasing,setPurchasing]=useState<string|null>(null);
 const [redeemCode,setRedeemCode]=useState('');
 const [redeeming,setRedeeming]=useState(false);
 const [tab,setTab]=useState<Tab>('balance');
 const [amount,setAmount]=useState<number>(0);
 const [customAmount,setCustomAmount]=useState('');
 const [payMethod,setPayMethod]=useState<'wechat'>('wechat');
 const [quickAmounts,setQuickAmounts]=useState<number[]>(defaultQuickAmounts);
 const [discountRules,setDiscountRules]=useState<{threshold:number; bonus:number}[]>([]);
 const [purchaseConfirm,setPurchaseConfirm]=useState<{plan:PlanConfig; optionKey:string}|null>(null);

 const load=()=>{setLoading(true);Promise.all([plansApi.list(),merchantApi.getProfile(),publicSystemConfig.get().catch(()=>null)]).then(([pr,mr,cr])=>{if(pr?.data?.success)setPlans(pr.data.data||[]); if(mr?.data?.success)setProfile(mr.data.data||{}); const vals=cr?.data?.data?.['balance.recharge_amounts']; if(Array.isArray(vals)){const nums=vals.map((x:any)=>Number(x)).filter((x:number)=>Number.isFinite(x)&&x>0); if(nums.length)setQuickAmounts(nums)} const ds=cr?.data?.data?.['balance.recharge_discounts']; if(Array.isArray(ds)){const rules=ds.map((x:any)=>({threshold:Number(x?.threshold)||0,bonus:Number(x?.bonus)||0})).filter((x:any)=>x.threshold>0).sort((a:any,b:any)=>a.threshold-b.threshold); setDiscountRules(rules);}}).catch(()=>toast.error('数据加载失败')).finally(()=>setLoading(false));};
 useEffect(()=>{load()},[]);
 const getPricing=(p:PlanConfig):PricingOption[]=>{const arr=Array.isArray(p.pricing_options)?p.pricing_options:[]; return arr.length?arr:[{key:'month',label:'月付',days:30,price:Number(p.price_month)||0},{key:'quarter',label:'季付',days:90,price:Number(p.price_quarter)||0},{key:'year',label:'年付',days:365,price:Number(p.price_year)||0}].filter(x=>x.price>0)};
 const visible=plans.filter(p=>p.plan!=='free'&&p.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 const selectedAmount = useMemo(()=>Number(customAmount || amount || 0),[customAmount,amount]);
 const bonusInfo = useMemo(()=>{ if(!selectedAmount||selectedAmount<=0||!discountRules.length) return {bonusPct:0,bonusAmt:0,total:selectedAmount}; const matched=[...discountRules].filter(r=>selectedAmount>=r.threshold).sort((a,b)=>b.threshold-a.threshold)[0]; if(!matched) return {bonusPct:0,bonusAmt:0,total:selectedAmount}; const bonusAmt=Math.round(selectedAmount*matched.bonus)/100; return {bonusPct:matched.bonus,bonusAmt,total:selectedAmount+bonusAmt}; },[selectedAmount,discountRules]);
 const setQuickAmount=(v:number)=>{setAmount(v);setCustomAmount('')};
 const handlePay=()=>{ if(!selectedAmount || selectedAmount<10) return toast.error('充值金额不能低于 10 元'); toast.error('在线支付通道暂未接入，请先联系管理员购买余额充值码'); };
 const handlePurchase=async(plan:string,billingKey:string)=>{setPurchasing(plan+billingKey);try{const res=await merchantApi.purchasePlan({plan,billing_key:billingKey}); if(res?.data?.success){toast.success(res.data.message||'购买成功');setPurchaseConfirm(null);load()}else toast.error(res?.data?.message||'购买失败')}catch{toast.error('请求失败')}finally{setPurchasing(null)}};
 const handleRedeem=async()=>{const code=redeemCode.trim(); if(!code)return toast.error('请输入充值码'); setRedeeming(true); try{const res=await merchantApi.redeemRechargeCode(code); if(res?.data?.success){toast.success(res.data.message||'兑换成功');setRedeemCode('');load()}else toast.error(res?.data?.message||'兑换失败')}catch{toast.error('兑换请求失败')}finally{setRedeeming(false)}};

 return <div className="dpage recharge-page-v2 recharge-page-compact">
  <div className="stat-grid" style={{gap:8}}>
   <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">当前余额</div><div className="stat-card-v2__value" style={{color:Number(profile.balance||0)<0?'#ff4d4f':'#52c41a'}}>¥<AnimatedNumber value={Number(profile.balance||0)} decimals={2}/></div><div className="stat-card-v2__desc">账户可用金额</div></div><div className="stat-card-v2__icon" style={{background:'#f6ffed',color:'#52c41a'}}><Wallet size={20}/></div></div>
   <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">当前套餐</div><div className="stat-card-v2__value" style={{color:'#1890ff'}}>{profile.plan||'free'}</div><div className="stat-card-v2__desc">商户订阅等级</div></div><div className="stat-card-v2__icon" style={{background:'#e6f4ff',color:'#1890ff'}}><Crown size={20}/></div></div>
   <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">可选套餐</div><div className="stat-card-v2__value" style={{color:'#faad14'}}><AnimatedNumber value={visible.length}/></div><div className="stat-card-v2__desc">已上架方案</div></div><div className="stat-card-v2__icon" style={{background:'#fffbe6',color:'#faad14'}}><CreditCard size={20}/></div></div>
   <div className="stat-card-v2"><div className="stat-card-v2__info"><div className="stat-card-v2__label">到期时间</div><div className="stat-card-v2__value" style={{fontSize:12,color:'#86909c'}}>{profile.plan_expires_at?new Date(profile.plan_expires_at).toLocaleDateString('zh-CN'):'-'}</div><div className="stat-card-v2__desc">套餐有效期</div></div><div className="stat-card-v2__icon" style={{background:'#f5f7fa',color:'#86909c'}}><Ticket size={20}/></div></div>
  </div>
  <div className="view-tab-row"><button className="view-tab-btn">商户充值</button></div>
  <div className="segmented-control">
   {[{value:'balance',label:'余额充值'},{value:'plans',label:'购买套餐'},{value:'redeem',label:'卡密兑换'}].map(t=><button key={t.value} className={`seg-item ${tab===t.value?'is-active':''}`} onClick={()=>setTab(t.value as Tab)}>{t.label}</button>)}
  </div>
  {loading?<div style={{textAlign:'center',padding:60}}><span className="spinner"/></div>:tab==='balance'?
   <div className="recharge-two-col">
    <div className="data-card recharge-form-card">
     <div className="data-card__header"><div className="data-card__title"><Coins size={16}/>充值金额</div><span className="tag-chip tag-chip--blue">最低 ¥10</span></div>
     {quickAmounts.length > 0 && <div className="amount-grid">{quickAmounts.map(v=><button key={v} className={`amount-btn ${amount===v&&!customAmount?'active':''}`} onClick={()=>setQuickAmount(v)}>{v}</button>)}</div>}
     <div className="form-group-v2" style={{marginTop:16}}><label>自定义金额</label><div className="amount-input"><span>¥</span><input value={customAmount} onChange={e=>{setCustomAmount(e.target.value.replace(/[^0-9.]/g,''));setAmount(0)}} placeholder="≥ 10"/></div></div>
     {discountRules.length>0&&<div className="recharge-discount-tip">
      <div className="recharge-discount-tip__head"><Gift size={14}/><strong>充值有礼</strong><span>满额额外赠送，自动叠加</span></div>
      <div className="recharge-discount-tip__list">{discountRules.map((r,i)=>{const hit=selectedAmount>=r.threshold&&(i===discountRules.length-1||selectedAmount<discountRules[i+1].threshold);return <div key={i} className={`recharge-discount-tip__row ${hit?'is-active':''}`}><b>满 ¥{r.threshold}</b><span>赠 {r.bonus}%</span></div>})}</div>
     </div>}
    </div>
    <div className="data-card recharge-form-card">
     <div className="data-card__header"><div className="data-card__title"><QrCode size={16}/>支付方式</div></div>
     <button className={`pay-method ${payMethod==='wechat'?'active':''}`} onClick={()=>setPayMethod('wechat')}><span className="wechat-dot">✓</span><strong>微信支付</strong></button>
     <div className="pay-summary"><div><span>充值金额</span><b>¥{Number(selectedAmount||0).toFixed(2)}</b></div>{bonusInfo.bonusAmt>0&&<div className="pay-summary-bonus"><span>赠送 {bonusInfo.bonusPct}%</span><b>+¥{Number(bonusInfo.bonusAmt).toFixed(2)}</b></div>}<div><span>到账余额</span><b style={{color:bonusInfo.bonusAmt>0?'#16a34a':undefined}}>¥{Number(bonusInfo.total).toFixed(2)}</b></div></div>
     <button className="btn-primary-lg pay-confirm" onClick={handlePay}>确认支付 ¥{Number(selectedAmount||0).toFixed(2)}</button>
     <p className="hint-line">当前后端未发现微信/支付宝下单接口，因此这里只保留正确充值形态，不伪造支付结果。</p>
    </div>
   </div>
  :tab==='plans'?
   <div className="plan-list-v2">{visible.map((p,i)=>{const pricing=getPricing(p);const minPrice=pricing.length?Math.min(...pricing.map(x=>Number(x.price)||0)):0;return <div className="data-card plan-card-merged" key={p.plan}><div className="data-card__header"><div className="data-card__title">{planIcon(p.label,16)}<span>{p.label}</span><span className="tag-chip tag-chip--blue">{p.plan}</span></div>{i===1&&<span className="status-badge status-badge--success">推荐</span>}</div>{p.description&&<div style={{fontSize:13,color:'var(--t2)',marginBottom:10}}>{p.description}</div>}<div className="quota-row"><div><span>应用数</span><b>{displayVal(p.max_apps)}</b></div><div><span>卡密数</span><b>{displayVal(p.max_cards)}</b></div><div><span>设备/张</span><b>{displayVal(p.max_devices)}</b></div><div><span>单次生成</span><b>{displayVal(p.max_gen_once)}</b></div></div>{pricing.length?<><div className="plan-price-min"><span>最低</span><b>¥{Number(minPrice).toFixed(2)}</b><span>起</span></div><div className="plan-options-preview">{pricing.map(opt=><div key={opt.key} className="plan-option-tag"><strong>{opt.label}</strong><span>{opt.days}天</span><b>¥{Number(opt.price).toFixed(0)}</b></div>)}</div><button className="btn-primary-lg plan-buy-btn" disabled={purchasing?.startsWith(p.plan)} onClick={()=>setPurchaseConfirm({plan:p,optionKey:pricing[0].key})}>立即购买</button></>:<div className="empty-state__text">暂无可选方案</div>}</div>})}</div>
  :<div className="data-card redeem-panel-v2"><div className="data-card__header"><div className="data-card__title"><Ticket size={16}/>卡密兑换</div></div><p style={{fontSize:13,color:'var(--t2)',marginBottom:14}}>支持套餐充值码和余额充值码，兑换成功后自动叠加套餐时长或增加账户余额。</p><div className="redeem-inline"><input value={redeemCode} onChange={e=>setRedeemCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleRedeem()} placeholder="请输入充值码" style={{height:56,fontSize:18,padding:"0 18px",borderRadius:12}}/><button className="btn-primary-lg" disabled={redeeming} onClick={handleRedeem} style={{height:42,fontSize:13,padding:"0 16px",borderRadius:8}}>{redeeming?'兑换中':'立即兑换'}</button></div></div>}

  {purchaseConfirm&&(()=>{const _plan=purchaseConfirm.plan;const _pricing=getPricing(_plan);const _opt=_pricing.find(x=>x.key===purchaseConfirm.optionKey)||_pricing[0];if(!_opt)return null;const _busy=purchasing===_plan.plan+_opt.key;return <div className="buy-sheet-mask" onClick={()=>setPurchaseConfirm(null)}><div className="buy-sheet buy-sheet-recharge" onClick={e=>e.stopPropagation()}>
   <div className="buy-sheet__head order-head"><strong>确认订单</strong><button onClick={()=>setPurchaseConfirm(null)} aria-label="关闭" className="order-close"><X size={20}/></button></div>
   <div className="data-card order-card">
    <div className="data-card__header"><div className="data-card__title"><span className="tag-chip tag-chip--blue">{_plan.plan}</span><span>{_plan.label}</span></div></div>
    <div className="order-price-line"><b>¥{Number(_opt.price).toFixed(2)}</b><span>/ {_opt.days}天</span></div>
    <div className="quota-row order-quota"><div><span>应用数</span><b>{displayVal(_plan.max_apps)}</b></div><div><span>卡密数</span><b>{displayVal(_plan.max_cards)}</b></div><div><span>设备/张</span><b>{displayVal(_plan.max_devices)}</b></div><div><span>单次生成</span><b>{displayVal(_plan.max_gen_once)}</b></div></div>
    <div className="order-gift"><Gift size={14}/>套餐有效期 · {_opt.days} 天</div>
   </div>
   <div className="data-card order-card"><div className="data-card__header"><div className="data-card__title">购买方式</div></div><div className="order-billing-row">{_pricing.map(opt=><button key={opt.key} className={`order-billing-btn ${opt.key===_opt.key?'is-active':''}`} onClick={()=>setPurchaseConfirm({plan:_plan,optionKey:opt.key})}><strong>{opt.label}</strong><span>{opt.days}天</span><b>¥{Number(opt.price).toFixed(2)}</b></button>)}</div></div>
   <div className="data-card order-card"><div className="data-card__header"><div className="data-card__title">支付方式</div></div><div className="order-pay-row"><span className="wechat-dot">✓</span><b>微信支付</b></div></div>
   <button className="btn-primary-lg order-submit" disabled={_busy} onClick={()=>handlePurchase(_plan.plan,_opt.key)}>{_busy?'处理中...':`确认支付 ¥${Number(_opt.price).toFixed(2)}`}</button>
  </div></div>})()}<style>{`
   .recharge-two-col{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.recharge-form-card{padding:18px}.amount-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.amount-btn{height:52px;border:1px solid var(--bdl2);background:var(--bg);border-radius:9px;font-size:18px;font-weight:700;color:var(--t1);cursor:pointer}.amount-btn.active{border-color:#52c41a;background:rgba(82,196,26,.08);color:#16a34a}.amount-input{height:44px;border:1px solid var(--bdl2);border-radius:10px;display:flex;align-items:center;padding:0 14px;gap:10px;background:var(--bg)}.amount-input span{color:var(--t3);font-weight:700}.amount-input input{border:0;outline:0;background:transparent;color:var(--t1);font-size:16px;flex:1}.pay-method{height:58px;width:100%;border:1px solid var(--bdl2);border-radius:10px;background:var(--bg);display:flex;align-items:center;gap:12px;padding:0 18px;color:var(--t1);cursor:pointer}.pay-method.active{border-color:#22c55e;background:rgba(34,197,94,.08)}.wechat-dot{width:28px;height:28px;border-radius:50%;background:#17bf35;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800}.pay-summary{margin:16px 0;border-top:1px solid var(--bdl2);border-bottom:1px solid var(--bdl2);padding:12px 0}.pay-summary div{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}.pay-summary span{color:var(--t3)}.pay-summary b{color:var(--t1)}.pay-confirm{height:42px;width:100%;justify-content:center;font-size:14px}.hint-line{font-size:12px;color:var(--t3);margin:10px 0 0;line-height:1.6}.plan-list-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.quota-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.quota-row div{background:var(--fcl,rgba(148,163,184,.08));border-radius:8px;padding:10px}.quota-row span{display:block;color:var(--t3);font-size:11px}.quota-row b{color:var(--t1);font-size:15px}.price-row-v2{display:grid;gap:8px}.price-box{border:1px solid var(--bdl2);border-radius:9px;padding:10px;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px}.price-box span{display:block;font-size:11px;color:var(--t3);margin-top:2px}.redeem-panel-v2{max-width:760px}.redeem-inline{display:flex;gap:10px}.redeem-inline input{flex:1;height:36px;border:1px solid var(--bdl2);border-radius:8px;background:var(--bg);color:var(--t1);padding:0 12px;outline:0}@media(max-width:768px){.recharge-two-col{grid-template-columns:1fr}.amount-grid{gap:8px}.amount-btn{height:48px}.quota-row{grid-template-columns:repeat(2,1fr)}.price-box{grid-template-columns:1fr auto}.price-box button{grid-column:1/-1}.redeem-inline{flex-direction:column}.redeem-inline button{width:100%;justify-content:center}}.recharge-page .segmented-control .seg-item{padding:3px 10px!important;font-size:11px!important;min-height:24px!important;border-radius:5px!important}`}</style>
 </div>;
}

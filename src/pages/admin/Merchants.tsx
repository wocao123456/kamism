import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import {
  Search, RefreshCw, Clock, Users, Ban, Wallet, Gift,
  ChevronDown, ChevronRight, Star, Crown, UserCheck, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

interface Merchant {
  id: string; username: string; email: string; api_key: string;
  status: string; plan: string; plan_expires_at: string | null;
  email_verified: boolean; created_at: string; avatar: string | null; balance?: number;
}
interface PlanConfig {
  plan: string; label: string; max_apps: number; max_cards: number;
  max_devices: number; max_gen_once: number;
  price_month?: any; price_quarter?: any; price_year?: any; is_active?: boolean;
}
interface UpgradeModal { merchantId: string; username: string; }

function displayVal(v: number) { return v === -1 ? '无限' : String(v); }

function formatExpiry(expiresAt: string | null, plan: string) {
  if (plan === 'free') return null;
  if (!expiresAt) return <span style={{ color: '#faad14', fontSize: 11 }}>永久</span>;
  const d = new Date(expiresAt);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  const color = days <= 3 ? '#ff4d4f' : days <= 7 ? '#faad14' : '#1890ff';
  return (
    <span style={{ color, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Clock size={10} /> {days <= 0 ? '已到期' : `${days}天后到期`}
    </span>
  );
}

function getPlanColor(plan: string) {
  if (plan === 'free') return 'tag-chip--red';
  if (plan.includes('vip') || plan.includes('pro') || plan.includes('max')) return 'tag-chip--blue';
  return 'tag-chip--green';
}

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [planConfigs, setPlanConfigs] = useState<Record<string, PlanConfig>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModal | null>(null);
  const [grantMode, setGrantMode] = useState<'balance' | 'plan'>('balance');
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantTargetType, setGrantTargetType] = useState('all');
  const [grantTargetEmail, setGrantTargetEmail] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantPlan, setGrantPlan] = useState('pro');
  const [grantPlanDays, setGrantPlanDays] = useState('30');
  const [expiresDays, setExpiresDays] = useState('30');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const loadPlanConfigs = () => {
    adminApi.getPlanConfigs().then(res => {
      if (res.data.success) {
        const map: Record<string, PlanConfig> = {};
        (res.data.data as PlanConfig[]).forEach(c => { map[c.plan] = c; });
        setPlanConfigs(map);
      }
    });
  };

  const load = (p = page, ps = pageSize, kw = search, pf = planFilter) => {
    setLoading(true);
    setMerchants([]);
    adminApi.getMerchants({ page: p, page_size: ps, keyword: kw || undefined, plan: pf || undefined })
      .then(res => { if (res.data.success) { setMerchants(res.data.data); setTotal(res.data.total); } })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlanConfigs();
    load(page, pageSize, search, planFilter);
    const sync = () => load(page, pageSize, search, planFilter);
    window.addEventListener('merchant-sync', sync);
    return () => window.removeEventListener('merchant-sync', sync);
  }, [page, pageSize, search, planFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(keyword); };

  const handlePlanFilter = (pf: string) => { setPlanFilter(pf); setPage(1); };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'disabled' : 'active';
    try {
      const res = await adminApi.updateMerchantStatus(id, next);
      if (res.data.success) { toast.success(next === 'active' ? '已启用' : '已禁用'); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); }
  };

  const togglePlan = async (id: string, current: string) => {
    if (current === 'free') {
      const m = merchants.find(x => x.id === id);
      setUpgradeModal({ merchantId: id, username: m?.username ?? '' });
      const firstPaid = Object.values(planConfigs).find((p: any) => p.plan !== 'free' && p.is_active !== false);
      setSelectedPlan(firstPaid?.plan || 'pro');
      setExpiresDays('30');
      return;
    }
    setPlanLoading(id);
    try {
      const res = await adminApi.updateMerchantPlan(id, 'free');
      if (res.data.success) { toast.success('已降级为免费版'); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); } finally { setPlanLoading(null); }
  };

  const confirmUpgrade = async () => {
    if (!upgradeModal) return;
    const days = expiresDays === '' ? undefined : parseInt(expiresDays);
    if (days !== undefined && (isNaN(days) || days < 1)) { toast.error('请输入有效天数'); return; }
    setPlanLoading(upgradeModal.merchantId);
    setUpgradeModal(null);
    try {
      const res = await adminApi.updateMerchantPlan(upgradeModal.merchantId, selectedPlan, days);
      if (res.data.success) { toast.success(res.data.message ?? '已升级'); load(); } else toast.error(res.data.message);
    } catch { toast.error('操作失败'); } finally { setPlanLoading(null); }
  };


  const switchGrantMode = (mode: 'balance' | 'plan') => {
    setGrantMode(mode);
    setGrantModalOpen(true);
    setGrantTargetEmail('');
    if (mode === 'balance') setGrantAmount('');
    else { const firstPaid = Object.values(planConfigs).find((p:any)=>p.plan!=='free' && p.is_active!==false); setGrantPlan(firstPaid?.plan || 'pro'); setGrantPlanDays('30'); }
  };
  const confirmGrant = async () => {
    if (grantSubmitting) return;
    if (grantTargetType === 'single' && !grantTargetEmail.trim()) return toast.error('请输入指定商户邮箱');
    setGrantSubmitting(true);
    try {
      if (grantMode === 'balance') {
        const amount = Number(grantAmount);
        if (!Number.isFinite(amount) || amount <= 0) return toast.error('请输入大于 0 的赠送金额');
        const res = await adminApi.grantMerchantBalanceScoped({ amount, target_type: grantTargetType, target_email: grantTargetEmail.trim() || undefined });
        if (res.data.success) { toast.success(res.data.message || '赠送成功'); setGrantAmount(''); setGrantModalOpen(false); load(page, pageSize, search, planFilter); window.dispatchEvent(new Event('merchant-sync')); setTimeout(() => load(page, pageSize, search, planFilter), 350); } else toast.error(res.data.message || '赠送失败');
      } else {
        const days = grantPlanDays === '' ? undefined : Number(grantPlanDays);
        if (days !== undefined && (!Number.isFinite(days) || days < 1)) return toast.error('有效天数需大于 0，留空表示永久');
        const res = await adminApi.grantMerchantPlanScoped({ plan: grantPlan, expires_days: days, target_type: grantTargetType, target_email: grantTargetEmail.trim() || undefined });
        if (res.data.success) { toast.success(res.data.message || '赠送成功'); setGrantModalOpen(false); load(page, pageSize, search, planFilter); window.dispatchEvent(new Event('merchant-sync')); setTimeout(() => load(page, pageSize, search, planFilter), 350); } else toast.error(res.data.message || '赠送失败');
      }
    } catch { toast.error('赠送失败'); }
    finally { setGrantSubmitting(false); }
  };

  const totalPages = Math.ceil(total / pageSize);

  // 分区统计
  const activeCount = merchants.filter(m => m.status === 'active').length;
  const disabledCount = merchants.filter(m => m.status === 'disabled').length;
  const paidCount = merchants.filter(m => m.plan !== 'free').length;

  // 可用套餐列表（用于筛选项）
  const planTabs = Object.values(planConfigs).filter((p: any) => p.is_active !== false) as PlanConfig[];

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="dpage">
      {/* 升级弹窗 */}
      {upgradeModal && (
        <div className="modal-overlay is-open">
          <div className="modal-v2">
            <div className="modal-v2__header">
              <span className="modal-v2__title">升级套餐</span>
              <button className="modal-v2__close" onClick={() => setUpgradeModal(null)}>×</button>
            </div>
            <div className="modal-v2__body">
              <p style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 16 }}>
                为商户 <strong>{upgradeModal.username}</strong> 选择套餐
              </p>
              <div className="form-group-v2">
                <label>套餐</label>
                <CustomSelect value={selectedPlan} options={planTabs.filter((p: any) => p.plan !== 'free').map((p: any) => ({ value: p.plan, label: p.label }))} onChange={setSelectedPlan} />
              </div>
              <div className="form-group-v2">
                <label>有效天数</label>
                <input
                  type="number" min={1}
                  value={expiresDays}
                  onChange={e => setExpiresDays(e.target.value)}
                  placeholder="30"
                  className="form-input-v2"
                />
              </div>
            </div>
            <div className="modal-v2__footer">
              <button className="btn-cancel" onClick={() => setUpgradeModal(null)}>取消</button>
              <button className="btn-confirm" onClick={confirmUpgrade}>确认升级</button>
            </div>
          </div>
        </div>
      )}
      {/* ===== 统计卡片 ===== */}
      <div className="stat-grid">
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">总商户数</div>
            <div className="stat-card-v2__value" style={{ color: '#1890ff' }}>{<AnimatedNumber value={total} />}</div>
            <div className="stat-card-v2__desc">当前页商户</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#e6f4ff', color: '#1890ff' }}>
            <Users size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">活跃</div>
            <div className="stat-card-v2__value" style={{ color: '#52c41a' }}>{<AnimatedNumber value={activeCount} />}</div>
            <div className="stat-card-v2__desc">当前页正常</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#f6ffed', color: '#52c41a' }}>
            <UserCheck size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">付费</div>
            <div className="stat-card-v2__value" style={{ color: '#faad14' }}>{<AnimatedNumber value={paidCount} />}</div>
            <div className="stat-card-v2__desc">当前页付费</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fffbe6', color: '#faad14' }}>
            <Crown size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">禁用</div>
            <div className="stat-card-v2__value" style={{ color: '#ff4d4f' }}>{<AnimatedNumber value={disabledCount} />}</div>
            <div className="stat-card-v2__desc">当前页禁用</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fff1f0', color: '#ff4d4f' }}>
            <Ban size={20} />
          </div>
        </div>
      </div>

      {/* 赠送弹窗 */}
      {grantModalOpen && (
        <div className="modal-overlay is-open">
          <div className="modal-v2 admin-grant-modal">
            <div className="modal-v2__header">
              <span className="modal-v2__title">{grantMode === 'balance' ? '余额赠送' : '套餐赠送'}</span>
              <button className="modal-v2__close" onClick={() => setGrantModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="modal-v2__body">
              <div className="form-group-v2"><label>赠送范围</label><CustomSelect value={grantTargetType} options={[{value:'all',label:'全局赠送（全部正常商户）'},{value:'single',label:'指定赠送'}]} onChange={setGrantTargetType}/></div>
              {grantTargetType==='single'&&<div className="form-group-v2"><label>指定商户邮箱</label><input value={grantTargetEmail} onChange={e=>setGrantTargetEmail(e.target.value)} className="form-input-v2" placeholder="输入商户邮箱" /></div>}
              {grantMode==='balance' ? (
                <div className="form-group-v2"><label>赠送金额</label><input type="number" min="0.01" step="0.01" value={grantAmount} onChange={e=>setGrantAmount(e.target.value)} className="form-input-v2" placeholder="例如 10.00" /></div>
              ) : (
                <>
                  <div className="form-group-v2"><label>套餐</label><CustomSelect value={grantPlan} options={planTabs.filter((p:any)=>p.plan!=='free').map((p:any)=>({value:p.plan,label:p.label}))} onChange={setGrantPlan}/></div>
                  <div className="form-group-v2"><label>有效天数</label><input type="number" min={1} value={grantPlanDays} onChange={e=>setGrantPlanDays(e.target.value)} className="form-input-v2" placeholder="30，留空表示永久" /></div>
                </>
              )}
            </div>
            <div className="modal-v2__footer">
              <button className="btn-cancel" onClick={() => setGrantModalOpen(false)}>取消</button>
              <button className="btn-confirm" type="button" onClick={confirmGrant} disabled={grantSubmitting}>{grantSubmitting?'赠送中...':'确认赠送'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 筛选 ===== */}
      <div className="view-tab-row" style={{ marginTop: 16 }}>
        <button className="view-tab-btn">商户列表</button>
      </div>

      <div className="segmented-control" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        <button
          className={`seg-item ${planFilter === '' ? 'is-active' : ''}`}
          onClick={() => handlePlanFilter('')}
        >
          全部商户
        </button>
        {planTabs.map((p: PlanConfig) => (
          <button
            key={p.plan}
            className={`seg-item ${planFilter === p.plan ? 'is-active' : ''}`}
            onClick={() => handlePlanFilter(p.plan)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="data-card admin-grant-launch" style={{ marginBottom: 12 }}>
        <button className="admin-grant-launch-btn is-blue" type="button" onClick={()=>switchGrantMode('balance')}><Gift size={16}/> 余额赠送</button>
        <button className="admin-grant-launch-btn" type="button" onClick={()=>switchGrantMode('plan')}><Crown size={16}/> 套餐赠送</button>
      </div>
      {/* ===== 操作栏 ===== */}
      <div className="action-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1 }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 400 }}>
            <Search size={14} />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索用户名/邮箱"
            />
          </div>
        </form>
        <button className="btn-secondary-lg" onClick={() => load()}>
          <RefreshCw className="refresh-icon" size={14} /> 刷新
        </button>
      </div>

      {/* ===== 商户列表 ===== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      ) : merchants.length === 0 ? (
        <div className="data-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>
          <Users size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>{search || planFilter ? '无匹配的商户' : '暂无商户数据'}</div>
        </div>
      ) : (
        <>
          {merchants.map(m => {
            const pc = (planConfigs as any)[m.plan] as PlanConfig | undefined;
            const isExpanded = expandedCards.has(m.id);
            return (
              <div key={m.id} className="data-card" style={{ marginBottom: 8 }}>
                {/* 卡片头部 */}
                <div className="data-card__header">
                  <div className="data-card__title">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt="avatar"
                        className={`merchant-list-avatar ${m.status === 'active' ? '' : 'merchant-list-avatar--disabled'}`}
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: m.status === 'active' ? 'var(--pri)' : 'var(--t3)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center', fontSize: 13, fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 6 }}>{m.username}</span>
                    <span
                      className={`status-badge ${m.status === 'active' ? 'status-badge--success' : 'status-badge--danger'}`}
                      style={{ marginLeft: 6 }}
                    >
                      {m.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    
                    <button
                      className="btn-icon-sm"
                      onClick={() => toggleExpand(m.id)}
                      style={{ color: 'var(--t2)' }}
                      title={isExpanded ? '收起' : '展开'}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>

                {/* 基本信息（始终显示） */}
                <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 8 }}>{m.email}</div>
                <div className="merchant-balance-line" style={{fontSize:13,color:'#10b981',marginTop:6,fontWeight:700,display:'flex',alignItems:'center',gap:4}}><Wallet size={13}/> 余额：¥{Number(m.balance||0).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: 'var(--ph)', marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {m.api_key}
                </div>

                {/* 套餐信息 */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`tag-chip ${getPlanColor(m.plan)}`}>
                      {m.plan === 'free' ? '免费版' : pc?.label || m.plan}
                    </span>
                    {formatExpiry(m.plan_expires_at, m.plan)}
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                      注册：{new Date(m.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>

                {/* 展开详情 */}
                {isExpanded && pc && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      background: 'var(--fcl)',
                      borderRadius: 8,
                      border: '1px solid var(--bd)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>
                      <Star size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      套餐配额详情
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                      <div>
                        <span style={{ color: 'var(--t3)' }}>应用数</span>
                        <div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(pc.max_apps || 0)}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--t3)' }}>卡密数</span>
                        <div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(pc.max_cards || 0)}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--t3)' }}>设备/张</span>
                        <div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(pc.max_devices || 0)}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--t3)' }}>单次生成</span>
                        <div style={{ color: 'var(--t1)', marginTop: 2 }}>{displayVal(pc.max_gen_once || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="action-grid" style={{ marginTop: 16 }}>
                  <button
                    className="act-run"
                    onClick={() => togglePlan(m.id, m.plan)}
                    disabled={planLoading === m.id}
                  >
                    {planLoading === m.id ? '处理中...' : m.plan !== 'free' ? '降为免费' : '升级套餐'}
                  </button>
                  <button
                    className={m.status === 'active' ? 'act-disable' : 'act-enable'}
                    onClick={() => toggleStatus(m.id, m.status)}
                  >
                    {m.status === 'active' ? '禁用' : '启用'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* 分页 */}
          {total > pageSize && (
            <div className="pagination-v2">
              <span>共 {<AnimatedNumber value={total} />} 条数据</span>
              <div className="pagination-v2__btns">
                <button
                  className="pagination-v2__btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  &lt;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      className={`pagination-v2__btn ${p === page ? 'is-active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  className="pagination-v2__btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

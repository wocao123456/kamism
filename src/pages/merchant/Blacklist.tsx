import React, { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Search, AlertCircle, Shield, Settings, Clock, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { blacklistApi } from '../../lib/api';
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

interface BlacklistItem {
  id: string;
  type: 'device' | 'ip' | 'card';
  value: string;
  reason: string;
  created_at: string;
  blocked_until: string | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  device: <Shield size={14} />,
  ip: <Settings size={14} />,
  card: <Key size={14} />,
};

const typeLabels: Record<string, string> = {
  device: '设备ID',
  ip: 'IP地址',
  card: '卡密',
};

export default function Blacklist() {
  const [list, setList] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ type: 'device' | 'ip' | 'card'; value: string; reason: string; expires_days: string }>({ type: 'device', value: '', reason: '', expires_days: '' });
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState({ ip_total: 0, dev_total: 0, card_total: 0 });

  const normalizeIp = (item: any): BlacklistItem => ({
    id: item.id,
    type: 'ip',
    value: item.ip || item.value || '',
    reason: item.reason || '无',
    created_at: item.created_at,
    blocked_until: item.blocked_until || null,
  });

  const normalizeDevice = (item: any): BlacklistItem => ({
    id: item.id,
    type: 'device',
    value: item.device_hint || item.device_id || item.value || '',
    reason: item.reason || '无',
    created_at: item.created_at,
    blocked_until: item.blocked_until || null,
  });

  const normalizeCard = (item: any): BlacklistItem => ({
    id: item.id,
    type: 'card',
    value: item.card_key || item.value || '',
    reason: item.reason || '无',
    created_at: item.created_at,
    blocked_until: null,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [ipStatsRes, deviceStatsRes, cardStatsRes] = await Promise.all([
        blacklistApi.listIps({ page: 1, page_size: 1 }),
        blacklistApi.listDevices({ page: 1, page_size: 1 }),
        blacklistApi.listCards({ page: 1, page_size: 1 }),
      ]);
      const ipTotal = Number(ipStatsRes.data?.total || 0);
      const deviceTotal = Number(deviceStatsRes.data?.total || 0);
      const cardTotal = Number(cardStatsRes.data?.total || 0);
      setStats({ ip_total: ipTotal, dev_total: deviceTotal, card_total: cardTotal });

      if (filterType === 'ip') {
        const res = await blacklistApi.listIps({ page, page_size: pageSize });
        const rows = Array.isArray(res.data?.data) ? res.data.data.map(normalizeIp) : [];
        setList(rows);
        setTotal(Number(res.data?.total || 0));
      } else if (filterType === 'device') {
        const res = await blacklistApi.listDevices({ page, page_size: pageSize });
        const rows = Array.isArray(res.data?.data) ? res.data.data.map(normalizeDevice) : [];
        setList(rows);
        setTotal(Number(res.data?.total || 0));
      } else if (filterType === 'card') {
        const res = await blacklistApi.listCards({ page, page_size: pageSize });
        const rows = Array.isArray(res.data?.data) ? res.data.data.map(normalizeCard) : [];
        setList(rows);
        setTotal(Number(res.data?.total || 0));
      } else {
        const [ipRes, deviceRes, cardRes] = await Promise.all([
          blacklistApi.listIps({ page: 1, page_size: 100 }),
          blacklistApi.listDevices({ page: 1, page_size: 100 }),
          blacklistApi.listCards({ page: 1, page_size: 100 }),
        ]);
        const rows = [
          ...(Array.isArray(deviceRes.data?.data) ? deviceRes.data.data.map(normalizeDevice) : []),
          ...(Array.isArray(ipRes.data?.data) ? ipRes.data.data.map(normalizeIp) : []),
          ...(Array.isArray(cardRes.data?.data) ? cardRes.data.data.map(normalizeCard) : []),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const keyword = search.trim().toLowerCase();
        const filtered = keyword ? rows.filter(item => `${item.value} ${item.reason}`.toLowerCase().includes(keyword)) : rows;
        setList(filtered.slice((page - 1) * pageSize, page * pageSize));
        setTotal(filtered.length || ipTotal + deviceTotal + cardTotal);
      }
    } catch (err) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize, filterType, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value.trim()) { toast.error('请输入值'); return; }
    if (!form.reason.trim()) { toast.error('请输入原因'); return; }
    setSubmitting(true);
    try {
      const res = form.type === 'ip'
        ? await blacklistApi.addIp(form.value.trim(), form.reason.trim())
        : form.type === 'card'
          ? await blacklistApi.addCard(form.value.trim(), form.reason.trim())
          : await blacklistApi.addDevice(form.value.trim(), form.reason.trim());
      const data = res.data;
      if (data.success) {
        toast.success('添加成功');
        setShowModal(false);
        setForm({ type: 'device', value: '', reason: '', expires_days: '' });
        load();
      } else {
        toast.error(data.message || '添加失败');
      }
    } catch (err) {
      toast.error('请求失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这条黑名单记录？')) return;
    try {
      const target = list.find(item => item.id === id);
      const res = target?.type === 'ip' ? await blacklistApi.removeIp(id) : target?.type === 'card' ? await blacklistApi.removeCard(id) : await blacklistApi.removeDevice(id);
      const data = res.data;
      if (data.success) {
        toast.success('删除成功');
        load();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (err) {
      toast.error('请求失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="dpage">
      {/* ===== 统计卡片 ===== */}
      <div className="stat-grid" style={{ gap: 8 }}>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">黑名单总数</div>
            <div className="stat-card-v2__value" style={{ color: '#1890ff' }}>{<AnimatedNumber value={total} />}</div>
            <div className="stat-card-v2__desc">所有记录</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#e6f4ff', color: '#1890ff' }}>
            <Shield size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">设备封禁</div>
            <div className="stat-card-v2__value" style={{ color: '#ff4d4f' }}>{<AnimatedNumber value={stats.dev_total} />}</div>
            <div className="stat-card-v2__desc">全部设备</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fff1f0', color: '#ff4d4f' }}>
            <AlertCircle size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">IP 封禁</div>
            <div className="stat-card-v2__value" style={{ color: '#faad14' }}>{<AnimatedNumber value={stats.ip_total} />}</div>
            <div className="stat-card-v2__desc">全部 IP</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fffbe6', color: '#faad14' }}>
            <Settings size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">卡密封禁</div>
            <div className="stat-card-v2__value" style={{ color: '#722ed1' }}>{<AnimatedNumber value={stats.card_total} />}</div>
            <div className="stat-card-v2__desc">全部卡密</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#f9f0ff', color: '#722ed1' }}>
            <Key size={20} />
          </div>
        </div>
      </div>

      {/* ===== 标题 + 添加按钮 ===== */}
      <div className="view-tab-row" style={{ marginTop: 16 }}>
        <button className="view-tab-btn">风控管理</button>
        <button className="view-tab-plus" onClick={() => setShowModal(true)}>
          <Plus size={16} />
        </button>
      </div>

      {/* ===== 类型筛选 ===== */}
      <div className="segmented-control">
        {[
          { value: '', label: '全部' },
          { value: 'device', label: '设备ID' },
          { value: 'ip', label: 'IP地址' },
          { value: 'card', label: '卡密' },
        ].map(t => (
          <button
            key={t.value}
            className={`seg-item ${filterType === t.value ? 'is-active' : ''}`}
            onClick={() => { setFilterType(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 操作栏 ===== */}
      <div className="action-bar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={14} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索值或原因"
          />
        </div>
        <button className="btn-secondary-lg" onClick={() => load()}>
          <RefreshCw className="refresh-icon" size={14} /> 刷新
        </button>
      </div>

      {/* ===== 列表 ===== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner" />
        </div>
      ) : list.length === 0 ? (
        <div className="data-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>
          <Shield size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>{search || filterType ? '无匹配的记录' : '暂无黑名单记录，点击右上角 + 添加'}</div>
        </div>
      ) : (
        <>
          {list.map(item => (
            <div key={item.id} className="data-card" style={{ maxWidth: '100%', overflow: 'hidden', marginBottom: 8 }}>
              <div className="data-card__header">
                <div className="data-card__title">
                  <span className="tag-chip tag-chip--red" style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {TYPE_ICONS[item.type]}
                    {typeLabels[item.type]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span>
                </div>
                <button
                  className="btn-icon-sm"
                  onClick={() => handleDelete(item.id)}
                  style={{ color: '#ff4d4f' }}
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 8, background: 'var(--bg2, #fafafa)', padding: '6px 10px', borderRadius: 4 }}>
                {item.reason}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--t3)' }}>封禁时间</span>
                  <div style={{ color: 'var(--t1)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                {item.blocked_until && (
                  <div>
                    <span style={{ color: 'var(--t3)' }}>过期时间</span>
                    <div style={{ color: 'var(--t1)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(item.blocked_until).toLocaleString('zh-CN')}
                    </div>
                  </div>
                )}
                {!item.blocked_until && (
                  <div>
                    <span style={{ color: 'var(--t3)' }}>有效期</span>
                    <div style={{ color: '#ff4d4f', marginTop: 2, fontWeight: 600 }}>永久</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 分页 */}
          {total > pageSize && (
            <div className="pagination-v2">
              <span>共 {<AnimatedNumber value={total} />} 条数据</span>
              <div className="pagination-v2__btns">
                <button className="pagination-v2__btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  &lt;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} className={`pagination-v2__btn ${p === page ? 'is-active' : ''}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="pagination-v2__btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== 添加弹窗 ===== */}
      {showModal && (
        <div className="modal-overlay is-open">
          <div className="modal-v2">
            <div className="modal-v2__header">
              <span className="modal-v2__title">添加黑名单</span>
              <button className="modal-v2__close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-v2__body">
                <div className="form-group-v2">
                  <label>类型</label>
                  <CustomSelect value={form.type} options={[{ value: 'device', label: '设备ID' }, { value: 'ip', label: 'IP地址' }, { value: 'card', label: '卡密' }]} onChange={value => setForm(s => ({ ...s, type: value as 'device' | 'ip' | 'card' }))} />
                </div>
                <div className="form-group-v2">
                  <label>值</label>
                  <input value={form.value} onChange={e => setForm(s => ({ ...s, value: e.target.value }))} placeholder="输入封禁值" className="form-input-v2" />
                </div>
                <div className="form-group-v2">
                  <label>原因</label>
                  <input value={form.reason} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} placeholder="封禁原因" className="form-input-v2" />
                </div>
                <div className="form-group-v2">
                  <label>过期天数（可选）</label>
                  <input type="number" value={form.expires_days} onChange={e => setForm(s => ({ ...s, expires_days: e.target.value }))} placeholder="留空表示永久" className="form-input-v2" />
                </div>
              </div>
              <div className="modal-v2__footer">
                <button className="btn-cancel" type="button" onClick={() => setShowModal(false)}>取消</button>
                <button className="btn-confirm" type="submit" disabled={submitting}>{submitting ? '添加中...' : '添加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

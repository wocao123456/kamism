import { useEffect, useState } from 'react';
import { Bell, FileText, Pin, RefreshCw, Check, Mail, MailOpen, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { merchantMessagesApi } from '../../lib/api';
import AnimatedNumber from '../../components/AnimatedNumber';

interface Message {
  id: string;
  msg_type: string;
  title: string;
  content: string;
  pinned: boolean;
  read: boolean;
  read_at?: string;
  reward_amount?: number | null;
  reward_claimed?: boolean;
  created_at: string;
}

export default function MerchantMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const PAGE_SIZE = 15;

  const load = (p = page) => {
    setLoading(true);
    setMessages([]);
    Promise.all([
      merchantMessagesApi.listNotices({ page: p, page_size: PAGE_SIZE }),
      filter !== 'unread' ? merchantMessagesApi.listMessages({ page: p, page_size: PAGE_SIZE }) : Promise.resolve({ data: { success: true, data: [], total: 0 } }),
    ])
      .then(([noticeRes, msgRes]) => {
        const all: Message[] = [];
        if (noticeRes.data.success) all.push(...(noticeRes.data.data || []).map((m: any) => ({ ...m, read: m.is_read })));
        if (msgRes.data.success) all.push(...(msgRes.data.data || []).map((m: any) => ({ ...m, read: m.is_read, msg_type: 'message' })));
        all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setMessages(all);
        const totalNotices = noticeRes.data.total || 0;
        const totalMsgs = msgRes.data.total || 0;
        setTotal(totalNotices + totalMsgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchUnreadCount = () => {
    merchantMessagesApi.unreadCount().then((res) => {
      if (res.data.success) {
        setUnreadCount(res.data.data.unread || 0);
      }
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [page, filter]);
  useEffect(() => { fetchUnreadCount(); }, []);

  const claimReward = async (msg: any) => {
    try {
      const res = await merchantMessagesApi.claimReward(msg.id);
      if (res.data.success) {
        toast.success(res.data.message || '领取成功');
        setMessages(ms => ms.map(m => m.id === msg.id ? { ...(m as any), read: true, reward_claimed: true } as any : m));
        fetchUnreadCount();
        window.dispatchEvent(new CustomEvent('merchant-sync'));
        window.dispatchEvent(new CustomEvent('unread-sync'));
      } else {
        toast.error(res.data.message || '领取失败');
      }
    } catch {
      toast.error('领取失败');
    }
  };
  const markRead = (id: string) => {
    merchantMessagesApi.markRead(id)
      .then((res) => {
        const d = res.data;
        if (d && (d.success === true || d.code === 0)) {
          setMessages(ms => ms.map(m => m.id === id ? { ...m, read: true, read_at: new Date().toISOString() } : m));
          fetchUnreadCount();
          window.dispatchEvent(new CustomEvent('unread-sync'));
          toast.success('已标记为已读');
        } else {
          setMessages(ms => ms.map(m => m.id === id ? { ...m, read: true, read_at: new Date().toISOString() } : m));
          fetchUnreadCount();
          window.dispatchEvent(new CustomEvent('unread-sync'));
        }
      })
      .catch(() => {
        setMessages(ms => ms.map(m => m.id === id ? { ...m, read: true, read_at: new Date().toISOString() } : m));
        fetchUnreadCount();
        window.dispatchEvent(new CustomEvent('unread-sync'));
        toast.success('已标记为已读');
      });
  };

  const filtered = messages.filter(m => {
    if (filter === 'unread') return !m.read;
    if (filter === 'notice') return m.msg_type === 'notice';
    return true;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const noticeCount = messages.filter(m => m.msg_type === 'notice').length;
  const readCount = messages.filter(m => m.read).length;

  return (
    <div className="dpage messages-page">
      {/* 统计卡片 */}
      <div className="stat-grid" style={{ gap: 8 }}>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">总消息</div>
            <div className="stat-card-v2__value" style={{ color: '#1890ff' }}>{<AnimatedNumber value={total} />}</div>
            <div className="stat-card-v2__desc">所有消息</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#e6f4ff', color: '#1890ff' }}>
            <Bell size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">未读</div>
            <div className="stat-card-v2__value" style={{ color: '#ff4d4f' }}>{<AnimatedNumber value={unreadCount} />}</div>
            <div className="stat-card-v2__desc">待查看</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#fff1f0', color: '#ff4d4f' }}>
            <Mail size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">公告</div>
            <div className="stat-card-v2__value" style={{ color: '#52c41a' }}>{<AnimatedNumber value={noticeCount} />}</div>
            <div className="stat-card-v2__desc">系统公告</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#f6ffed', color: '#52c41a' }}>
            <FileText size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">已读</div>
            <div className="stat-card-v2__value" style={{ color: '#86909c' }}>{readCount}</div>
            <div className="stat-card-v2__desc">已查看</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: '#f5f7fa', color: '#86909c' }}>
            <MailOpen size={20} />
          </div>
        </div>
      </div>

      {/* 页面标题 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        marginBottom: 12,
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
            消息中心
          </h2>
        </div>
      </div>

      <div className="segmented-control">
        {[
          { value: '', label: '全部' },
          { value: 'unread', label: '未读' },
          { value: 'notice', label: '公告' },
        ].map(t => (
          <button
            key={t.value}
            className={`seg-item ${filter === t.value ? 'is-active' : ''}`}
            onClick={() => { setFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="action-bar" style={{ marginTop: 12 }}>
        <button className="btn-secondary-lg" onClick={() => { setPage(1); load(1); fetchUnreadCount(); }}>
          <RefreshCw className="refresh-icon" size={14} /> 刷新
        </button>
      </div>

      {/* 消息列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="data-card" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t3)' }}>
          <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>暂无消息</div>
        </div>
      ) : (
        <>
          {filtered.map(msg => {
            const isNotice = msg.msg_type === 'notice';
            return (
            <div
              key={msg.id}
              className={`data-card ${msg.pinned ? 'message-card--pinned' : ''}`}
              style={{
                maxWidth: '100%',
                overflow: 'hidden',
                borderLeft: !msg.read ? '3px solid var(--pri)' : '3px solid transparent',
                marginBottom: 8,
              }}
            >
              {/* 卡片头部 */}
              <div className="data-card__header">
                <div className="data-card__title" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {!msg.read && (
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#ff4d4f', display: 'inline-block', flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{
                      fontSize: 15,
                      fontWeight: msg.read ? 500 : 600,
                      lineHeight: 1.4,
                    }}>
                      {msg.title}
                    </span>
                    {msg.pinned && (
                      <Pin size={12} style={{ color: '#ff4d4f', flexShrink: 0 }} />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {msg.read ? (
                    <span className="message-read-badge">
                      <Check size={12} /> 已读
                    </span>
                  ) : (
                    <button
                      className="message-read-btn"
                      onClick={() => markRead(msg.id)}
                    >
                      <Eye size={12} /> 阅读
                    </button>
                  )}
                  {isNotice && (
                    <span className="tag-chip tag-chip--blue" style={{ marginLeft: 0 }}>公告</span>
                  )}
                </div>
              </div>

              {/* 消息内容 */}
              <div className="message-content-box">
                {msg.content}
                  {msg.msg_type==='notice' && Number((msg as any).reward_amount||0)>0 && <div style={{marginTop:10}}><button className="btn-secondary-lg" style={{height:30,fontSize:12,color:(msg as any).reward_claimed?'#999':'#fa8c16'}} disabled={(msg as any).reward_claimed} onClick={(e)=>{e.stopPropagation(); claimReward(msg);}}>{(msg as any).reward_claimed?'奖励已领取':`领取余额奖励 ¥${Number((msg as any).reward_amount).toFixed(2)}`}</button></div>}
              </div>

              {/* 底部信息 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--t3)' }}>
                  {new Date(msg.created_at).toLocaleString('zh-CN')}
                  {msg.read && msg.read_at && (
                    <span style={{ marginLeft: 10, color: 'var(--t3)' }}>
                      已读 {new Date(msg.read_at).toLocaleString('zh-CN')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
          })}

          {/* 分页 */}
          {total > PAGE_SIZE && (
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
                  let start = Math.max(1, page - 2);
                  if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
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
                  disabled={page >= totalPages}
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

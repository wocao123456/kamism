import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Plus, Settings, Trash2, RefreshCw, TestTube, Lock, Unlock,
  ChevronDown, ChevronRight, Clock, Key, Search, X, Home,
  PenLine, ClipboardList, Send, Save, Package, CheckCircle2,
  XCircle, Rocket, Copy
} from "lucide-react";
import toast from "react-hot-toast";
import CustomSelect from '../../components/CustomSelect';
import AnimatedNumber from '../../components/AnimatedNumber';

const API_BASE = window.location.origin;
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
};
const maskMiddle = (s: string) => {
  if (!s || s.length < 35) return s;
  return s.slice(0, 10) + "*".repeat(15) + s.slice(-10);
};

export default function ApiManage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [testTab, setTestTab] = useState<"sign" | "crypto">("sign");
  const [testParams, setTestParams] = useState("");
  const [cryptoText, setCryptoText] = useState("");
  const [addTab, setAddTab] = useState<"main" | "crypto">("main");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sign: false, params: false, response: false, encrypt: false, decrypt: false,
  });
  const toggleSection = (key: string) => setExpandedSections((p) => ({ ...p, [key]: !p[key] }));

  const [authKey, setAuthKey] = useState("");
  const [authStatus, setAuthStatus] = useState("idle");
  const [authExpiresAt, setAuthExpiresAt] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, rawTotal: 0, todayCount: 0, yesterdayCount: 0 });
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 5;
  const [searchCardOpen, setSearchCardOpen] = useState(false);
  const [searchCardValue, setSearchCardValue] = useState("");

  const fetchAuthKey = useCallback(async () => {
    try {
      const t = localStorage.getItem("token");
      const r = await fetch(`${API_BASE}/api/activations?page=1&page_size=1`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await r.json();
      const cc = d?.data?.[0]?.card_code;
      if (!cc) { setAuthKey("无激活卡密"); return; }
      const r2 = await fetch(`${API_BASE}/api/ts/auth/gen-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_key: cc }),
      });
      const d2 = await r2.json();
      if (d2.data) {
        setAuthKey(d2.data.auth_key);
        setAuthStatus("idle");
        setAuthExpiresAt(Date.now() + 300000);
        localStorage.setItem("cached_auth_key", d2.data.auth_key);
        localStorage.setItem("cached_auth_expiry", String(Date.now() + 300000));
      }
    } catch (e) {}
  }, []);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/keys`, { headers: getAuthHeaders() });
      const d = await r.json();
      setKeys(d.data || []);
    } catch (e) {}
    setLoading(false);
  }, []);

  const fetchRecentLogs = useCallback(async (cardFilter?: string) => {
    try {
      const lR = await fetch(`${API_BASE}/api/ts/logs?page=1&page_size=5000`);
      const lD = await lR.json();
      let merged = lD.data?.data || [];
      if (cardFilter) merged = merged.filter((l: any) => (l.card_key || "").toLowerCase().includes(cardFilter.toLowerCase()));
      setStats({ total: merged.length, rawTotal: lD.data?.rawTotal || 0, todayCount: lD.data?.todayCount || 0, yesterdayCount: lD.data?.yesterdayCount || 0 });
      setRecentLogs(merged);
      setLogPage(1);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchRecentLogs();
    const c = localStorage.getItem("cached_auth_key");
    const e = parseInt(localStorage.getItem("cached_auth_expiry") || "0");
    if (c && e > Date.now()) { setAuthKey(c); setAuthExpiresAt(e); setAuthStatus("idle"); } else { fetchAuthKey(); }
    const t = setInterval(() => fetchRecentLogs(), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (authExpiresAt > 0 && Date.now() > authExpiresAt) { setAuthStatus("expired"); fetchAuthKey(); }
    }, 5000);
    return () => clearInterval(t);
  }, [authExpiresAt, authStatus]);

  const deleteKey = async (id: string) => {
    if (!confirm("确定删除？")) return;
    try {
      const r = await fetch(`${API_BASE}/api/keys/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success !== false) toast.success("删除成功");
      else toast.error(d.message || "删除失败");
    } catch (e) { toast.error("请求失败"); }
    fetchKeys();
  };

  const toggleKey = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/keys/${id}/toggle`, { method: "POST", headers: getAuthHeaders() });
      toast.success("状态已更新");
    } catch (e) { toast.error("操作失败"); }
    fetchKeys();
  };

  const openEdit = (k: any) => {
    setForm({
      ...k, encrypt_code: k.encrypt_code || "", decrypt_code: k.decrypt_code || "",
      sign_code: k.sign_code || "", params_template: k.params_template || "",
      response_template: k.response_template || "", join_template: k.join_template || "",
    });
    setShowAdd(true);
  };

  const openAdd = () => {
    setForm({ name: "", encrypt_code: "", decrypt_code: "", sign_code: "", join_template: "", status: "active", params_template: "", response_template: "" });
    setShowAdd(true);
  };

  const saveKey = async () => {
    if (!form) return;
    try {
      const m = form.id ? "PUT" : "POST";
      const u = form.id ? `${API_BASE}/api/keys/${form.id}` : `${API_BASE}/api/keys`;
      const p = {
        name: form.name || "", encrypt_code: form.encrypt_code || "", decrypt_code: form.decrypt_code || "",
        sign_code: form.sign_code || "", join_template: form.join_template || "", status: form.status || "active",
        params_template: form.params_template || "", response_template: form.response_template || "",
      };
      const r = await fetch(u, { method: m, headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(p) });
      const d = await r.json();
      if (d.success !== false) toast.success(form.id ? "保存成功" : "添加成功");
      else toast.error(d.message || "操作失败");
    } catch (e) { toast.error("请求失败"); }
    setShowAdd(false);
    fetchKeys();
  };

  const testApi = async (endpoint: string, body: any, method: "POST" | "GET" = "POST") => {
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (authKey && authKey !== "无激活卡密") headers["Authorization"] = `Bearer ${authKey}`;
      const r = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: method === "POST" ? JSON.stringify(body) : undefined });
      const d = await r.json();
      setTestResult(d);
      setAuthStatus(d.code === 200 ? "used" : "failed");
      fetchRecentLogs();
      fetchAuthKey();
    } catch (e) { setTestResult({ code: 500, msg: "请求失败" }); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid var(--bdl)", background: "var(--bg)",
    color: "var(--t1)", fontSize: 13, boxSizing: "border-box",
  };

  const iconFor = (key?: string) => {
    const s = { width: 16, height: 16, flexShrink: 0 } as const;
    switch (key) {
      case "home": return <Home size={16} style={s} />;
      case "sign": return <PenLine size={16} style={s} />;
      case "params": return <ClipboardList size={16} style={s} />;
      case "response": return <Send size={16} style={s} />;
      case "encrypt": return <Lock size={16} style={s} />;
      case "decrypt": return <Unlock size={16} style={s} />;
      case "success": return <CheckCircle2 size={16} style={{ ...s, color: "#34d399" }} />;
      case "error": return <XCircle size={16} style={{ ...s, color: "#f87171" }} />;
      case "raw": return <ClipboardList size={16} style={s} />;
      default: return <Package size={16} style={s} />;
    }
  };

  const SectionHeader = ({ title, sectionKey, icon }: { title: string; sectionKey: string; icon?: string }) => (
    <div onClick={() => toggleSection(sectionKey)}
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "10px 14px", background: "var(--bg)", borderRadius: 10, marginBottom: expandedSections[sectionKey] ? 8 : 0, border: "1px solid var(--bdl2)", transition: "all 0.2s" }}>
      {expandedSections[sectionKey] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}>{iconFor(icon)} {title}</span>
    </div>
  );

  const identifyStep = (res: string): { icon: string; label: string } => {
    if (!res) return { icon: "unknown", label: "未识别" };
    if (res.length > 500 && /^[A-Za-z0-9+/=]+$/.test(res)) return { icon: "raw", label: "原始密文" };
    try { const obj = JSON.parse(res); if (obj.dispatch_action) return { icon: "decrypt", label: "解密" }; if ("score" in obj || "code" in obj || "data" in obj || "msg" in obj) return { icon: "success", label: "响应" }; return { icon: "unknown", label: "未识别(JSON)" }; } catch {}
    if (res.length === 64 && /^[0-9a-fA-F]+$/.test(res)) return { icon: "sign", label: "签名" };
    if (res.length >= 100 && res.length <= 500 && /^[A-Za-z0-9+/=]+$/.test(res)) return { icon: "encrypt", label: "加密" };
    return { icon: "unknown", label: "未识别" };
  };

  const getStepLabel = (sub: any) => {
    const time = new Date(sub.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (sub.status !== "success") return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{iconFor("error")} 失败 ({time})</span>;
    const { icon, label } = identifyStep(sub.sign_result || "");
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{iconFor(icon)} {label} ({time})</span>;
  };

  const SubRow = ({ sub, index, logId }: { sub: any; index: number; logId: string }) => {
    const sk = `${logId}-sub-${index}`;
    const open = expandedSubId === sk;
    const toggle = () => setExpandedSubId(open ? null : sk);
    const params = sub.params;
    const hasParams = params && (typeof params === "object" ? Object.keys(params).length > 0 : String(params).length > 0);
    return (
      <div style={{ padding: "2px 16px" }}>
        <div onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 0", fontSize: 12, color: "var(--t3)", userSelect: "none" }}>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span>{getStepLabel(sub)}</span>
        </div>
        {open && (
          <div style={{ marginLeft: 20, marginTop: 4 }}>
            {hasParams && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ClipboardList size={14} /> 请求参数</span></div>
                <pre style={{ margin: 0, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", color: "var(--t1)", background: "var(--bg)", borderRadius: 6, maxHeight: 150, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{typeof params === "object" ? JSON.stringify(params, null, 2) : String(params)}</pre>
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{sub.status === "success" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} /> 操作结果</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><XCircle size={14} /> 失败原因</span>}</div>
              <pre style={{ margin: 0, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", color: sub.status === "success" ? "var(--pri)" : "#f87171", background: "var(--bg)", borderRadius: 6, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{sub.status === "success" ? (sub.sign_result || "—") : (sub.fail_reason || "—")}</pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const pagedLogs = recentLogs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE);
  const totalLogPages = Math.ceil(recentLogs.length / LOG_PAGE_SIZE);
  const handleSearchSubmit = () => { setSearchCardOpen(false); fetchRecentLogs(searchCardValue); };

  // ---------- UI 渲染：统一卡片风格 ----------

  const authBadgeClass =
    authStatus === "used" ? "status-badge--success" :
    authStatus === "expired" ? "status-badge--danger" :
    "status-badge--info";
  const authLabel =
    authStatus === "idle" ? "待使用" :
    authStatus === "used" ? "已使用" : "已过期";

  return (
    <div className="dpage api-manage-page">
      {/* 顶部分析卡片 */}
      <div className="stat-grid" style={{ gap: 8 }}>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">密钥总数</div>
            <div className="stat-card-v2__value" style={{ color: "#1890ff" }}>{<AnimatedNumber value={keys.length} />}</div>
            <div className="stat-card-v2__desc">所有 API 密钥</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: "#e6f4ff", color: "#1890ff" }}>
            <Key size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">已启用</div>
            <div className="stat-card-v2__value" style={{ color: "#52c41a" }}>{<AnimatedNumber value={keys.filter(k => k.status === "active").length} />}</div>
            <div className="stat-card-v2__desc">正常状态</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: "#f6ffed", color: "#52c41a" }}>
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">鉴权状态</div>
            <div className="stat-card-v2__value" style={{ color: authStatus === "used" ? "#52c41a" : authStatus === "expired" ? "#ff4d4f" : "#faad14" }}>
              {authStatus === "idle" ? "-" : authStatus === "used" ? "✓" : "!"}
            </div>
            <div className="stat-card-v2__desc">{authLabel}</div>
          </div>
          <div className="stat-card-v2__icon" style={{
            background: authStatus === "used" ? "#f6ffed" : authStatus === "expired" ? "#fff1f0" : "#fffbe6",
            color: authStatus === "used" ? "#52c41a" : authStatus === "expired" ? "#ff4d4f" : "#faad14",
          }}>
            <Clock size={20} />
          </div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-v2__info">
            <div className="stat-card-v2__label">调用统计</div>
            <div className="stat-card-v2__value" style={{ color: "#722ed1" }}>{<AnimatedNumber value={stats.todayCount} />}</div>
            <div className="stat-card-v2__desc">今日 / {stats.yesterdayCount} 昨日</div>
          </div>
          <div className="stat-card-v2__icon" style={{ background: "#f9f0ff", color: "#722ed1" }}>
            <ClipboardList size={20} />
          </div>
        </div>
      </div>

      {/* 鉴权密钥卡片 */}
      <div className="data-card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: authStatus === "used" ? "rgba(52,211,153,0.15)" : authStatus === "expired" ? "rgba(248,113,113,0.15)" : "rgba(64,158,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Key size={18} style={{ color: authStatus === "used" ? "#34d399" : authStatus === "expired" ? "#f87171" : "var(--pri)" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 2 }}>鉴权密钥</div>
              <div style={{ fontSize: 13, fontFamily: "monospace", color: "var(--t1)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {authKey ? maskMiddle(authKey) : "加载中..."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`status-badge ${authBadgeClass}`}>{authLabel}</span>
            {authStatus !== "used" && authExpiresAt > Date.now() && (
              <span style={{ fontSize: 12, color: "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
                <Clock size={12} /> {Math.floor((authExpiresAt - Date.now()) / 60000)}分
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="action-bar">
        <button className="btn-secondary-lg" onClick={() => { fetchKeys(); fetchRecentLogs(); }}>
          <RefreshCw className="refresh-icon" size={14} /> 刷新
        </button>
        <button className="btn-secondary-lg" onClick={() => setShowTest(true)}>
          <TestTube size={14} /> 在线测试
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn-primary-lg" onClick={openAdd}>
          <Plus size={15} /> 添加密钥
        </button>
      </div>

      {/* 密钥列表 - 卡片形式 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><span className="spinner" /></div>
      ) : keys.length === 0 ? (
        <div className="empty-state"><div className="empty-state__text">暂无密钥</div></div>
      ) : (
        keys.map((k: any) => {
          const isActive = k.status === "active";
          return (
            <div key={k.id} className="data-card" style={{ maxWidth: "100%", overflow: "hidden" }}>
              <div className="data-card__header">
                <div className="data-card__title">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{k.name || "(未命名)"}</span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 10,
                    background: isActive ? "rgba(52,211,153,0.12)" : "rgba(156,163,175,0.12)",
                    color: isActive ? "#34d399" : "#9ca3af", cursor: "pointer",
                  }} onClick={() => toggleKey(k.id)}>
                    {isActive ? "● 启用" : "○ 禁用"}
                  </span>
                </div>
                <button className="btn-icon-sm" onClick={() => { navigator.clipboard.writeText(k.id); toast.success("ID 已复制"); }}>
                  <Copy size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px 16px", marginTop: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: "var(--t3)" }}>ID</span>
                  <div style={{ color: "var(--t1)", marginTop: 2, fontFamily: "monospace", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" }}>{k.id.slice(0, 8)}...</div>
                </div>
                <div>
                  <span style={{ color: "var(--t3)" }}>签名</span>
                  <div style={{ color: "var(--t1)", marginTop: 2 }}>{k.sign_code ? "已配置" : "—"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--t3)" }}>加密</span>
                  <div style={{ color: "var(--t1)", marginTop: 2 }}>{k.encrypt_code ? "已配置" : "—"}</div>
                </div>
                <div>
                  <span style={{ color: "var(--t3)" }}>创建时间</span>
                  <div style={{ color: "var(--t1)", marginTop: 2 }}>{new Date(k.created_at).toLocaleDateString("zh-CN")}</div>
                </div>
              </div>
              <div className="action-grid" style={{ marginTop: 16 }}>
                <button className="act-run" onClick={() => openEdit(k)}><Settings size={12} /> 编辑</button>
                <button className="act-disable" onClick={() => deleteKey(k.id)}><Trash2 size={12} /> 删除</button>
              </div>
            </div>
          );
        })
      )}

      {/* 调用记录 */}
      <div className="data-card" style={{ marginTop: 12 }}>
        <div className="data-card__header" style={{ marginBottom: 12 }}>
          <div className="data-card__title">调用记录</div>
          <div style={{ fontSize: 13, color: "var(--t3)" }}>
            昨天 <strong style={{ color: "var(--pri)" }}>{stats.yesterdayCount}</strong> · 今天 <strong style={{ color: "var(--pri)" }}>{<AnimatedNumber value={stats.todayCount} />}</strong> · 共 <strong style={{ color: "var(--pri)" }}>{stats.total}</strong>
          </div>
        </div>
        {recentLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--t3)", fontSize: 13 }}>暂无调用记录</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: 70, textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "var(--t3)", borderBottom: "1px solid var(--bdl2)" }}>时间</th>
                    <th style={{ width: 100, textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "var(--t3)", borderBottom: "1px solid var(--bdl2)" }}>项目</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "var(--t3)", borderBottom: "1px solid var(--bdl2)" }}>卡密</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((l: any) => (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => { setExpandedLogId(expandedLogId === l.id ? null : l.id); setExpandedSubId(null); }}
                        style={{ cursor: "pointer", transition: "background 0.2s", background: expandedLogId === l.id ? "var(--fcl)" : "transparent" }}
                      >
                        <td style={{ color: "var(--t3)", fontSize: 12, padding: "10px", borderBottom: "1px solid var(--bdl2)" }}>
                          {new Date(l.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ fontWeight: 500, padding: "10px", borderBottom: "1px solid var(--bdl2)" }}>{l.key_name}</td>
                        <td style={{ padding: "10px", borderBottom: "1px solid var(--bdl2)" }}>
                          <code style={{ fontSize: 12, color: l.status === "success" ? "var(--t1)" : "#f87171" }}>{l.card_key || "—"}</code>
                        </td>
                      </tr>
                      {expandedLogId === l.id && (
                        <tr key={l.id + "-detail"}>
                          <td colSpan={3} style={{ padding: 0 }}>
                            <div style={{ borderTop: "1px solid var(--bdl2)" }}>
                              {l.sub_items && l.sub_items.length > 0
                                ? l.sub_items.map((sub: any, index: number) => <SubRow key={`${l.id}-sub-${index}`} sub={sub} index={index} logId={l.id} />)
                                : <SubRow sub={l} index={0} logId={l.id} />}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
              <button className="btn-secondary-lg" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage === 1}>◀</button>
              {searchCardOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg)", padding: "4px 10px", borderRadius: 8, border: "1px solid var(--bdl2)" }}>
                  <Search size={12} style={{ color: "var(--t3)" }} />
                  <input autoFocus value={searchCardValue} onChange={(e) => setSearchCardValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
                    onBlur={handleSearchSubmit} placeholder="搜索卡密..."
                    style={{ width: 120, border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--t1)" }} />
                  <X size={12} style={{ cursor: "pointer", color: "var(--t3)" }}
                    onClick={() => { setSearchCardOpen(false); setSearchCardValue(""); fetchRecentLogs(); }} />
                </div>
              ) : (
                <span onClick={() => setSearchCardOpen(true)}
                  style={{ fontSize: 12, color: "var(--t3)", background: "var(--bg)", padding: "4px 14px", borderRadius: 8, border: "1px solid var(--bdl2)", cursor: "pointer" }}>
                  {logPage} / {totalLogPages}
                </span>
              )}
              <button className="btn-secondary-lg" style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))} disabled={logPage >= totalLogPages}>▶</button>
            </div>
          </>
        )}
      </div>

      {/* 在线测试模态框 */}
      {showTest && (
        <div className="modal-overlay" onClick={() => setShowTest(false)}>
          <div className="modal-v2" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-v2__header">
              <span className="modal-v2__title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <TestTube size={20} /> 在线测试
              </span>
              <button className="modal-v2__close" onClick={() => setShowTest(false)}>×</button>
            </div>
            <div className="modal-v2__body">
              <div className="segmented-control" style={{ marginBottom: 16 }}>
                <button className={`seg-item ${testTab === "sign" ? "is-active" : ""}`} onClick={() => setTestTab("sign")}><PenLine size={14} /> 签名测试</button>
                <button className={`seg-item ${testTab === "crypto" ? "is-active" : ""}`} onClick={() => setTestTab("crypto")}><Lock size={14} /> 加解密测试</button>
              </div>
              <div className="form-group-v2">
                <label className="form-label">选择项目</label>
                <CustomSelect value={selectedKey?.id || ""} placeholder="请选择" options={[{ value: "", label: "请选择" }, ...keys.map(k => ({ value: k.id, label: k.name || k.id }))]} onChange={value => { const k = keys.find(x => x.id === value); setSelectedKey(k || null); }} />
              </div>
              {testTab === "sign" && (
                <>
                  <div className="form-group-v2">
                    <label className="form-label">参数 (每行 key=value)</label>
                    <textarea className="form-input-v2" value={testParams} onChange={e => setTestParams(e.target.value)} rows={4} style={{ fontFamily: "monospace", fontSize: 12, minHeight: 100 }} />
                  </div>
                  <button className="btn-primary-lg" disabled={!selectedKey || !authKey} onClick={() => { const params: any = {}; testParams.split("\n").forEach((l: string) => { const i = l.indexOf("="); if (i > -1) params[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); testApi(`/api/ts/sign?key_name=${encodeURIComponent(selectedKey.name)}`, { params, source: "web_test" }); }}><Rocket size={14} /> 执行签名</button>
                </>
              )}
              {testTab === "crypto" && selectedKey && (
                <>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 8 }}>使用 <strong>{selectedKey.name}</strong> 的加密配置</div>
                  <div className="form-group-v2">
                     <textarea className="form-input-v2" value={cryptoText} onChange={e => setCryptoText(e.target.value)} placeholder="要加密/解密的文本" rows={3} style={{ fontFamily: "monospace", fontSize: 12, minHeight: 80 }} />
                                       </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn-primary-lg" disabled={!authKey || !cryptoText} onClick={() => testApi('/api/ts/encrypt', { key_name: selectedKey.name, text: cryptoText, source: 'web_test' })}><Lock size={14} /> 加密</button>
                    <button className="btn-secondary-lg" disabled={!authKey || !cryptoText} onClick={() => testApi('/api/ts/decrypt', { key_name: selectedKey.name, text: cryptoText, source: 'web_test' })}><Unlock size={14} /> 解密</button>
                  </div>
                </>
              )}
              {testResult && (
                <pre style={{ background: "var(--fc)", padding: 14, borderRadius: 12, fontSize: 12, overflow: "auto", maxHeight: 280, marginTop: 14, border: "1px solid var(--bdl2)" }}>{JSON.stringify(testResult, null, 2)}</pre>
              )}
            </div>
            <div className="modal-v2__footer">
              <button className="btn-secondary-lg" onClick={() => setShowTest(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/编辑密钥模态框 */}
      {showAdd && form && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-v2" style={{ maxWidth: 600, maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-v2__header">
              <span className="modal-v2__title">{form.id ? "编辑密钥" : "添加密钥"}</span>
              <button className="modal-v2__close" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div className="modal-v2__body">
              <div className="segmented-control" style={{ marginBottom: 16 }}>
                <button className={`seg-item ${addTab === "main" ? "is-active" : ""}`} onClick={() => setAddTab("main")}><Home size={14} /> 主页</button>
                <button className={`seg-item ${addTab === "crypto" ? "is-active" : ""}`} onClick={() => setAddTab("crypto")}><Lock size={14} /> 加解密</button>
              </div>
              {addTab === "main" && (
                <>
                  <div className="form-group-v2">
                    <label className="form-label">密钥名称</label>
                    <input className="form-input-v2" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <SectionHeader title="签名逻辑" sectionKey="sign" icon="sign" />
                  {expandedSections.sign && <div style={{ padding: "0 0 16px" }}><textarea value={form.sign_code || ""} onChange={e => setForm({ ...form, sign_code: e.target.value })} style={inputStyle} rows={5} /></div>}
                  <SectionHeader title="请求参数结构" sectionKey="params" icon="params" />
                  {expandedSections.params && <div style={{ padding: "0 0 16px" }}><textarea value={form.params_template || ""} onChange={e => setForm({ ...form, params_template: e.target.value })} style={inputStyle} rows={5} /></div>}
                  <SectionHeader title="响应参数结构" sectionKey="response" icon="response" />
                  {expandedSections.response && <div style={{ padding: "0 0 16px" }}><textarea value={form.response_template || ""} onChange={e => setForm({ ...form, response_template: e.target.value })} style={inputStyle} rows={5} /></div>}
                </>
              )}
              {addTab === "crypto" && (
                <>
                  <SectionHeader title="加密逻辑" sectionKey="encrypt" icon="encrypt" />
                  {expandedSections.encrypt && <div style={{ padding: "0 0 16px" }}><textarea value={form.encrypt_code || ""} onChange={e => setForm({ ...form, encrypt_code: e.target.value })} style={inputStyle} rows={5} /></div>}
                  <SectionHeader title="解密逻辑" sectionKey="decrypt" icon="decrypt" />
                  {expandedSections.decrypt && <div style={{ padding: "0 0 16px" }}><textarea value={form.decrypt_code || ""} onChange={e => setForm({ ...form, decrypt_code: e.target.value })} style={inputStyle} rows={5} /></div>}
                </>
              )}
            </div>
            <div className="modal-v2__footer">
              <button className="btn-secondary-lg" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn-primary-lg" onClick={saveKey}><Save size={16} /> 保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

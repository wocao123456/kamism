--
-- PostgreSQL database dump
--

\restrict 5LcaU72wJJpsLRNqDah69NpXWoMoT6cnIgcPZCt2M9W8GhOFd5ZikQnBdzzlbjr

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public._sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


ALTER TABLE public._sqlx_migrations OWNER TO kamism;

--
-- Name: activation_alerts; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.activation_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    alert_type character varying(32) NOT NULL,
    card_id uuid,
    device_hint character varying(64),
    ip_address character varying(64),
    detail text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activation_alerts OWNER TO kamism;

--
-- Name: activations; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.activations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid NOT NULL,
    app_id uuid NOT NULL,
    device_id_encrypted text NOT NULL,
    device_id_hash character varying(64) NOT NULL,
    device_name character varying(128),
    ip_address character varying(64),
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone DEFAULT now() NOT NULL,
    activate_count bigint DEFAULT 0
);


ALTER TABLE public.activations OWNER TO kamism;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(64) NOT NULL,
    password_hash character varying(256) NOT NULL,
    email character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    background_url text,
    api_key text
);


ALTER TABLE public.admins OWNER TO kamism;

--
-- Name: agent_commission_logs; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.agent_commission_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relation_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    card_id uuid,
    activation_id uuid,
    commission_rate integer NOT NULL,
    units integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_commission_logs OWNER TO kamism;

--
-- Name: agent_quota_logs; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.agent_quota_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relation_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    delta integer NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_quota_logs OWNER TO kamism;

--
-- Name: agent_relations; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.agent_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    quota_total integer DEFAULT 0 NOT NULL,
    quota_used integer DEFAULT 0 NOT NULL,
    commission_rate integer DEFAULT 0 NOT NULL,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    invite_code character varying(32) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_relations_commission_rate_check CHECK (((commission_rate >= 0) AND (commission_rate <= 100))),
    CONSTRAINT agent_relations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.agent_relations OWNER TO kamism;

--
-- Name: api_call_logs; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.api_call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_name character varying(255),
    card_hash character varying(64),
    ip character varying(45),
    device_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    auth_key character varying(128),
    card_key character varying(255),
    status character varying(32) DEFAULT 'success'::character varying,
    sign_result text,
    params jsonb,
    fail_reason text
);


ALTER TABLE public.api_call_logs OWNER TO kamism;

--
-- Name: api_call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: kamism
--

CREATE SEQUENCE public.api_call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_call_logs_id_seq OWNER TO kamism;

--
-- Name: api_call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kamism
--

ALTER SEQUENCE public.api_call_logs_id_seq OWNED BY public.api_call_logs.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    encrypt_code text DEFAULT ''::text,
    sign_code text DEFAULT ''::text,
    join_template text DEFAULT ''::text,
    request_method character varying(10) DEFAULT 'POST'::character varying,
    request_base_url text DEFAULT ''::text,
    request_success_check text DEFAULT ''::text,
    params_template text DEFAULT ''::text,
    response_template text DEFAULT ''::text,
    encrypt_enabled boolean DEFAULT false,
    encrypt_algorithm character varying(50) DEFAULT 'DES'::character varying,
    encrypt_mode character varying(50) DEFAULT 'CBC'::character varying,
    encrypt_padding character varying(50) DEFAULT 'PKCS7'::character varying,
    encrypt_key text DEFAULT ''::text,
    encrypt_iv_source character varying(50) DEFAULT ''::character varying,
    encrypt_param_name text DEFAULT ''::text,
    encrypt_encoding character varying(50) DEFAULT 'base64'::character varying,
    encrypt_charset character varying(10) DEFAULT 'UTF-8'::character varying,
    decrypt_code text DEFAULT ''::text,
    env_vars jsonb DEFAULT '[]'::jsonb,
    tasks jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    merchant_id uuid
);


ALTER TABLE public.api_keys OWNER TO kamism;

--
-- Name: app_webhooks; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.app_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    url text NOT NULL,
    secret character varying(64) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    events text[] DEFAULT ARRAY['activate'::text, 'verify'::text] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_webhooks OWNER TO kamism;

--
-- Name: apps; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.apps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    app_name character varying(128) NOT NULL,
    description text,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    downgraded boolean DEFAULT false NOT NULL,
    admin_disabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT apps_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.apps OWNER TO kamism;

--
-- Name: card_blacklist; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.card_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    card_key character varying(255) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.card_blacklist OWNER TO kamism;

--
-- Name: card_usage_daily; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.card_usage_daily (
    card_hash character varying(64) NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    count bigint DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.card_usage_daily OWNER TO kamism;

--
-- Name: card_usage_total; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.card_usage_total (
    card_hash character varying(64) NOT NULL,
    count bigint DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.card_usage_total OWNER TO kamism;

--
-- Name: card_whitelist; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.card_whitelist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    card_key character varying(255) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.card_whitelist OWNER TO kamism;

--
-- Name: cards; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    code_encrypted text NOT NULL,
    code_hash character varying(64) NOT NULL,
    duration_days integer NOT NULL,
    max_devices integer DEFAULT 1 NOT NULL,
    status character varying(16) DEFAULT 'unused'::character varying NOT NULL,
    downgraded boolean DEFAULT false NOT NULL,
    admin_disabled boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT cards_status_check CHECK (((status)::text = ANY ((ARRAY['unused'::character varying, 'active'::character varying, 'expired'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.cards OWNER TO kamism;

--
-- Name: custom_plans; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.custom_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_code character varying(50) NOT NULL,
    plan_name character varying(100) NOT NULL,
    price_monthly numeric(10,2) DEFAULT 0,
    price_quarterly numeric(10,2) DEFAULT 0,
    price_yearly numeric(10,2) DEFAULT 0,
    max_apps integer DEFAULT '-1'::integer,
    max_cards integer DEFAULT '-1'::integer,
    max_devices integer DEFAULT 3,
    max_gen_once integer DEFAULT 100,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_plans OWNER TO kamism;

--
-- Name: device_blacklist; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.device_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    device_id_hash character varying(64) NOT NULL,
    device_hint character varying(64),
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone
);


ALTER TABLE public.device_blacklist OWNER TO kamism;

--
-- Name: device_heartbeats; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.device_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id_hash character varying(64) NOT NULL,
    last_heartbeat timestamp with time zone DEFAULT now() NOT NULL,
    consecutive_failures integer DEFAULT 0,
    consecutive_successes integer DEFAULT 0,
    status character varying(20) DEFAULT 'online'::character varying,
    total_violations integer DEFAULT 0,
    last_violation_at timestamp with time zone,
    last_blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.device_heartbeats OWNER TO kamism;

--
-- Name: email_config; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.email_config (
    id integer DEFAULT 1 NOT NULL,
    smtp_host character varying(255) DEFAULT ''::character varying,
    smtp_port integer DEFAULT 465,
    smtp_user character varying(255) DEFAULT ''::character varying,
    smtp_pass text DEFAULT ''::text,
    smtp_from_name character varying(100) DEFAULT 'KamiSM'::character varying,
    smtp_from_email character varying(255) DEFAULT ''::character varying,
    is_enabled boolean DEFAULT false
);


ALTER TABLE public.email_config OWNER TO kamism;

--
-- Name: encrypted_fields_log; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.encrypted_fields_log (
    id bigint NOT NULL,
    table_name character varying(64) NOT NULL,
    record_id uuid NOT NULL,
    field_name character varying(64) NOT NULL,
    key_id character varying(64) NOT NULL,
    encrypted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.encrypted_fields_log OWNER TO kamism;

--
-- Name: encrypted_fields_log_id_seq; Type: SEQUENCE; Schema: public; Owner: kamism
--

CREATE SEQUENCE public.encrypted_fields_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encrypted_fields_log_id_seq OWNER TO kamism;

--
-- Name: encrypted_fields_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kamism
--

ALTER SEQUENCE public.encrypted_fields_log_id_seq OWNED BY public.encrypted_fields_log.id;


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.encryption_keys (
    id integer NOT NULL,
    key_id character varying(64) NOT NULL,
    key_version integer DEFAULT 1 NOT NULL,
    algorithm character varying(32) DEFAULT 'AES-256-GCM'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rotated_at timestamp with time zone,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT encryption_keys_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'rotated'::character varying, 'retired'::character varying])::text[])))
);


ALTER TABLE public.encryption_keys OWNER TO kamism;

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: kamism
--

CREATE SEQUENCE public.encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encryption_keys_id_seq OWNER TO kamism;

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kamism
--

ALTER SEQUENCE public.encryption_keys_id_seq OWNED BY public.encryption_keys.id;


--
-- Name: ip_blacklist; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.ip_blacklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    ip character varying(64) NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone
);


ALTER TABLE public.ip_blacklist OWNER TO kamism;

--
-- Name: merchant_feature_switches; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.merchant_feature_switches (
    feature_key character varying(50) NOT NULL,
    feature_label character varying(100) DEFAULT ''::character varying NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.merchant_feature_switches OWNER TO kamism;

--
-- Name: merchant_topups; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.merchant_topups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    plan_code character varying(50) NOT NULL,
    duration_days integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    topup_type character varying(20) DEFAULT 'purchase'::character varying NOT NULL,
    redeem_code character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.merchant_topups OWNER TO kamism;

--
-- Name: merchants; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(64) NOT NULL,
    password_hash character varying(256) NOT NULL,
    api_key_encrypted text NOT NULL,
    api_key_hash character varying(64) NOT NULL,
    email_encrypted text NOT NULL,
    email_hash character varying(64) NOT NULL,
    status character varying(16) DEFAULT 'active'::character varying NOT NULL,
    plan character varying(64) DEFAULT 'free'::character varying NOT NULL,
    plan_expires_at timestamp with time zone,
    email_verified boolean DEFAULT false NOT NULL,
    verify_token character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invited_by uuid,
    avatar_url text,
    background_url text,
    provider_key text,
    CONSTRAINT merchants_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.merchants OWNER TO kamism;

--
-- Name: message_reads; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.message_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_reads OWNER TO kamism;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(16) NOT NULL,
    title character varying(256) NOT NULL,
    content text NOT NULL,
    sender_id uuid NOT NULL,
    target_type character varying(16) DEFAULT 'all'::character varying NOT NULL,
    target_id uuid,
    pinned boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['all'::character varying, 'single'::character varying])::text[]))),
    CONSTRAINT messages_type_check CHECK (((type)::text = ANY ((ARRAY['notice'::character varying, 'message'::character varying])::text[])))
);


ALTER TABLE public.messages OWNER TO kamism;

--
-- Name: oauth_settings; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.oauth_settings (
    id boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    appid text DEFAULT ''::text NOT NULL,
    appkey text DEFAULT ''::text NOT NULL,
    base_url text DEFAULT 'https://u.suyanw.cn'::text NOT NULL,
    login_path text DEFAULT '/connect.php'::text NOT NULL,
    user_path text DEFAULT '/api.php'::text NOT NULL,
    redirect_uri text DEFAULT ''::text NOT NULL,
    enabled_types text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT oauth_settings_singleton CHECK ((id = true))
);


ALTER TABLE public.oauth_settings OWNER TO kamism;

--
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_type character varying(20) DEFAULT 'admin'::character varying NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    module character varying(50) DEFAULT 'system'::character varying NOT NULL,
    detail text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.operation_logs OWNER TO kamism;

--
-- Name: plan_configs; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.plan_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan character varying(64) NOT NULL,
    label character varying(64) NOT NULL,
    max_apps integer DEFAULT 1 NOT NULL,
    max_cards integer DEFAULT 500 NOT NULL,
    max_devices integer DEFAULT 3 NOT NULL,
    max_gen_once integer DEFAULT 100 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_monthly numeric(10,2) DEFAULT 0 NOT NULL,
    price_quarterly numeric(10,2) DEFAULT 0 NOT NULL,
    price_yearly numeric(10,2) DEFAULT 0 NOT NULL,
    price_month double precision DEFAULT 0 NOT NULL,
    price_quarter double precision DEFAULT 0 NOT NULL,
    price_year double precision DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.plan_configs OWNER TO kamism;

--
-- Name: recharge_cards; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.recharge_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code_hash text NOT NULL,
    code_plain text,
    plan text NOT NULL,
    duration_months integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'unused'::text NOT NULL,
    merchant_id uuid,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recharge_cards OWNER TO kamism;

--
-- Name: recharge_codes; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.recharge_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(96) NOT NULL,
    plan character varying(64) NOT NULL,
    billing_cycle character varying(16) NOT NULL,
    duration_days integer NOT NULL,
    status character varying(16) DEFAULT 'unused'::character varying NOT NULL,
    merchant_id uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    note character varying(255),
    CONSTRAINT recharge_codes_billing_cycle_check CHECK (((billing_cycle)::text = ANY ((ARRAY['month'::character varying, 'quarter'::character varying, 'year'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT recharge_codes_status_check CHECK (((status)::text = ANY ((ARRAY['unused'::character varying, 'used'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE public.recharge_codes OWNER TO kamism;

--
-- Name: redeem_codes; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.redeem_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    code_hash character varying(100) NOT NULL,
    plan_code character varying(50) NOT NULL,
    duration_days integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'unused'::character varying NOT NULL,
    used_by uuid,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.redeem_codes OWNER TO kamism;

--
-- Name: risk_settings; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.risk_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(64) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.risk_settings OWNER TO kamism;

--
-- Name: system_config; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.system_config (
    key character varying(100) NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_config OWNER TO kamism;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_settings OWNER TO kamism;

--
-- Name: system_versions; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.system_versions (
    id integer NOT NULL,
    version_text character varying(128) DEFAULT 'local'::character varying NOT NULL,
    commit_hash character varying(64) DEFAULT 'local'::character varying NOT NULL,
    commit_message text DEFAULT 'local install version'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_versions_id_check CHECK ((id = 1))
);


ALTER TABLE public.system_versions OWNER TO kamism;

--
-- Name: whitelist; Type: TABLE; Schema: public; Owner: kamism
--

CREATE TABLE public.whitelist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(10) NOT NULL,
    value character varying(255) NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT whitelist_type_check CHECK (((type)::text = ANY ((ARRAY['ip'::character varying, 'device'::character varying, 'card'::character varying])::text[])))
);


ALTER TABLE public.whitelist OWNER TO kamism;

--
-- Name: encrypted_fields_log id; Type: DEFAULT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encrypted_fields_log ALTER COLUMN id SET DEFAULT nextval('public.encrypted_fields_log_id_seq'::regclass);


--
-- Name: encryption_keys id; Type: DEFAULT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.encryption_keys_id_seq'::regclass);


--
-- Data for Name: _sqlx_migrations; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public._sqlx_migrations (version, description, installed_on, success, checksum, execution_time) FROM stdin;
1	init complete	2026-06-04 02:25:59.03318+08	t	\\xac4d5f5604a35fd52790e859041cbff87218f2cf2bb750612e78dd3fb8235ee5b598dd061b5d7b6b9824d8cecce22c47	322074292
5	api keys	2026-06-04 02:25:59.357522+08	t	\\x0700eeb16c5d5468bc521bf41e35fdc8aff4aad96064d631c091ab098071e36320c7e7231897add27a2ddcf045f2f71f	47575199
6	fix activations	2026-06-04 02:25:59.405774+08	t	\\x7533005f1f0e3a8fefd0816f29df3de18811deb95f22e491cf54f715c8ee6eaa4eba6e6eb1f80db48b4f27fbd1bc3483	73157896
10	operation logs	2026-06-04 02:25:59.479972+08	t	\\xd84eb44d1ed6823d7887f7670a31a10beca58c6b85e92abe2b6b285567b72d11cc775d59a0df2d22370f5bfa1d954e9f	15709759
11	api keys merchant id	2026-06-04 02:25:59.497074+08	t	\\x48a2e6b396aa8b54eeaf28cc91e41992a912de2260c9ad7e3b7f48a93ebc5c70e29f4ff3b61754edd980e898c20fd34a	8932887
12	api keys nullable merchant	2026-06-04 02:25:59.506664+08	t	\\xbe8093357cc2f1f46943da617c36cc67316d6e9743ccc24277bd0f1781c2e3830643b0b27168b7d30a31b80770857a02	1036657
13	blacklist whitelist card type	2026-06-04 02:25:59.508921+08	t	\\x3b5f6237d3525ea25ea92cf8f8aa1be650595549e775c6bd83225fe7563395abae58f0320ddab2163a13f9721f25918f	27203586
14	oauth settings	2026-06-04 02:25:59.537097+08	t	\\x0f15ebd8f4521e08ba430a34febb08514445f88bb5f4f6fde5b27292bca7d4c489824c91bdc1632c77b671e1c752c536	7263797
16	profile oauth columns	2026-06-04 02:25:59.545011+08	t	\\xe8ec286a5534dc81b7d823928f94dbc2729d167e57baf38eabd5b458da35f8035481e694433e8c6ce7600a85f592f475	8080341
17	system install plans	2026-06-04 16:59:06.957205+08	t	\\x23bbb84ab926ab7a649b1c68c9ad9852759f74ffb10a978ca43e90c93bcb8ce2f792312c27c5bad2932922db6c826cde	85093339
\.


--
-- Data for Name: activation_alerts; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.activation_alerts (id, merchant_id, alert_type, card_id, device_hint, ip_address, detail, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: activations; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.activations (id, card_id, app_id, device_id_encrypted, device_id_hash, device_name, ip_address, activated_at, last_verified_at, activate_count) FROM stdin;
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.admins (id, username, password_hash, email, created_at, updated_at, avatar_url, background_url, api_key) FROM stdin;
701d3961-0745-44a3-a9d9-d837e1c0f863	admin	$2b$12$hW5I0cdmHyO7OrosjXmfJemUUNV0c8G.zZBdje2nbkAV/7I/YvH9.	admin@example.com	2026-06-04 15:28:15.482574+08	2026-06-04 15:28:15.482574+08	\N	\N	\N
\.


--
-- Data for Name: agent_commission_logs; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.agent_commission_logs (id, relation_id, agent_id, parent_id, card_id, activation_id, commission_rate, units, created_at) FROM stdin;
\.


--
-- Data for Name: agent_quota_logs; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.agent_quota_logs (id, relation_id, parent_id, agent_id, delta, reason, created_at) FROM stdin;
\.


--
-- Data for Name: agent_relations; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.agent_relations (id, parent_id, agent_id, quota_total, quota_used, commission_rate, status, invite_code, note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_call_logs; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.api_call_logs (id, key_name, card_hash, ip, device_id, created_at, auth_key, card_key, status, sign_result, params, fail_reason) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.api_keys (id, name, encrypt_code, sign_code, join_template, request_method, request_base_url, request_success_check, params_template, response_template, encrypt_enabled, encrypt_algorithm, encrypt_mode, encrypt_padding, encrypt_key, encrypt_iv_source, encrypt_param_name, encrypt_encoding, encrypt_charset, decrypt_code, env_vars, tasks, status, created_at, updated_at, merchant_id) FROM stdin;
\.


--
-- Data for Name: app_webhooks; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.app_webhooks (id, app_id, merchant_id, url, secret, enabled, events, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: apps; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.apps (id, merchant_id, app_name, description, status, downgraded, admin_disabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: card_blacklist; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.card_blacklist (id, merchant_id, card_key, reason, created_at) FROM stdin;
\.


--
-- Data for Name: card_usage_daily; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.card_usage_daily (card_hash, date, count, updated_at) FROM stdin;
\.


--
-- Data for Name: card_usage_total; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.card_usage_total (card_hash, count, updated_at) FROM stdin;
\.


--
-- Data for Name: card_whitelist; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.card_whitelist (id, merchant_id, card_key, reason, created_at) FROM stdin;
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.cards (id, app_id, merchant_id, code_encrypted, code_hash, duration_days, max_devices, status, downgraded, admin_disabled, note, created_at, activated_at, expires_at) FROM stdin;
\.


--
-- Data for Name: custom_plans; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.custom_plans (id, plan_code, plan_name, price_monthly, price_quarterly, price_yearly, max_apps, max_cards, max_devices, max_gen_once, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: device_blacklist; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.device_blacklist (id, merchant_id, device_id_hash, device_hint, reason, created_at, blocked_until) FROM stdin;
\.


--
-- Data for Name: device_heartbeats; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.device_heartbeats (id, device_id_hash, last_heartbeat, consecutive_failures, consecutive_successes, status, total_violations, last_violation_at, last_blocked_until, created_at) FROM stdin;
\.


--
-- Data for Name: email_config; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.email_config (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, is_enabled) FROM stdin;
1		465			KamiSM		f
\.


--
-- Data for Name: encrypted_fields_log; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.encrypted_fields_log (id, table_name, record_id, field_name, key_id, encrypted_at) FROM stdin;
1	merchants	78981bb8-81fa-4450-aecf-dcae22383fd9	api_key	merchant_api_key_78981bb8-81fa-4450-aecf-dcae22383fd9	2026-06-04 03:43:52.488431+08
2	merchants	78981bb8-81fa-4450-aecf-dcae22383fd9	email	merchant_email_78981bb8-81fa-4450-aecf-dcae22383fd9	2026-06-04 03:43:52.496201+08
\.


--
-- Data for Name: encryption_keys; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.encryption_keys (id, key_id, key_version, algorithm, created_at, rotated_at, status) FROM stdin;
\.


--
-- Data for Name: ip_blacklist; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.ip_blacklist (id, merchant_id, ip, reason, created_at, blocked_until) FROM stdin;
\.


--
-- Data for Name: merchant_feature_switches; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.merchant_feature_switches (feature_key, feature_label, is_enabled) FROM stdin;
overview	总览	t
apps	我的应用	t
cards	卡密管理	t
activations	激活记录	t
messages	消息中心	t
risk	风控管理	t
agents	代理管理	t
api_docs	API文档	t
api_manage	API管理	t
topup	商户充值	t
\.


--
-- Data for Name: merchant_topups; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.merchant_topups (id, merchant_id, plan_code, duration_days, amount, topup_type, redeem_code, created_at) FROM stdin;
\.


--
-- Data for Name: merchants; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.merchants (id, username, password_hash, api_key_encrypted, api_key_hash, email_encrypted, email_hash, status, plan, plan_expires_at, email_verified, verify_token, created_at, updated_at, invited_by, avatar_url, background_url, provider_key) FROM stdin;
78981bb8-81fa-4450-aecf-dcae22383fd9	admin	$2b$12$erL1gzVP4eEtFxBIeUquWOdceGfydqU6b.BBbtA8DXZx5cyhaCNim	merchant_api_key_78981bb8-81fa-4450-aecf-dcae22383fd9:9def34cda56efac8fce46030:8c2ba23234a49a56ff1ffff292b8736b0ffb1f786a79718156f9e7f5855f7d0fadd51c210899624c33a97e4d7f9611b5934874	3b613178c02a21d492c92f08072d82a70a6ace2c75b844367b2a554937fa9005	merchant_email_78981bb8-81fa-4450-aecf-dcae22383fd9:04babcb24b660b19e8309e1c:49a77ee4aa1e1490451798d89aaa860b1f54b7fc531d715aa530c27761162071	5b86ae0f8f821e2c71a0daac0dc75753a578af52519070bc0a2083551881ada2	active	free	\N	t	\N	2026-06-04 03:43:52.497588+08	2026-06-04 03:43:52.497588+08	\N	\N	\N	\N
\.


--
-- Data for Name: message_reads; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.message_reads (id, message_id, merchant_id, read_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.messages (id, type, title, content, sender_id, target_type, target_id, pinned, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: oauth_settings; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.oauth_settings (id, enabled, appid, appkey, base_url, login_path, user_path, redirect_uri, enabled_types, created_at, updated_at) FROM stdin;
t	f			https://u.suyanw.cn	/connect.php	/api.php		{}	2026-06-04 02:25:59.537097+08	2026-06-04 02:25:59.537097+08
\.


--
-- Data for Name: operation_logs; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.operation_logs (id, user_type, user_id, action, module, detail, ip_address, user_agent, created_at) FROM stdin;
ab5fb919-377d-4953-922b-88baf3bc553d	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:34:29.59372+08
730c2669-ff8d-49b1-856d-9dacaa20c40b	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 02:34:33.501449+08
1407da99-4d10-4fff-9860-4fefd88444f8	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:34:33.750011+08
7789fa71-78ca-4cd2-a775-4e060d76b19c	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:34:33.960809+08
eff1ba8d-7627-4bd3-971a-7b500313b2c3	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:34:39.442023+08
ebe2bbf7-58f2-461c-b5c8-95d9c4cbffd4	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:43:56.380263+08
9f616b91-bc9b-4288-97ca-8320cdb63058	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:46:30.748824+08
de18d229-82e1-408e-aa65-1a15a4e52370	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 02:46:32.82289+08
6424fd27-57cb-4a2c-97fc-47daa854cb6b	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 03:35:58.517672+08
9e8dcae7-044c-4ca2-a0d5-2217e09b364d	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 03:35:58.795486+08
d5691876-bd09-4bf1-a442-d2243ff7496e	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 03:35:59.015007+08
272fa23b-f189-4c60-b5d0-3b7b6ac3c190	visitor	\N	other	其他	操作 /setup/install		\N	2026-06-04 03:36:57.852296+08
30d9fda0-59d0-4bfd-b619-e8dc806a60e3	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 03:36:58.247964+08
74a26a39-5dc1-4d34-b1c2-4f46b70c8b06	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 03:36:58.248576+08
632face0-88ac-4b34-be39-5528a0074836	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 03:37:02.425862+08
85dd4289-c43a-48bc-a53c-38229f4d64c0	visitor	\N	login	认证	登录系统 (admin@example.com)		\N	2026-06-04 03:37:19.30046+08
fe3bba8f-f271-4219-a70e-47960eda0ba0	visitor	\N	other	认证	操作 /auth/send-reset-code		\N	2026-06-04 03:37:31.738058+08
5ab23622-f081-40e6-a574-ca68bd2af0a9	visitor	\N	other	认证	操作 /auth/send-reset-code		\N	2026-06-04 03:37:42.444618+08
5f559705-e5a9-48b1-8fd6-06d80f275bf3	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 03:37:43.228978+08
872bcbde-44fb-4c2d-95f5-98676beb635b	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 03:37:43.232817+08
e4fc847f-19b9-4c9e-91d6-03e8997ade5f	visitor	\N	login	认证	登录系统 (admin@kamism.com)		\N	2026-06-04 03:37:53.044369+08
39d4eb71-34af-4807-a65b-0fb8958f99de	visitor	\N	login	认证	登录系统 (admin@kamism.com)		\N	2026-06-04 03:38:26.749607+08
4b9e3ca7-2bbb-4268-9a06-6bb54ddf58b8	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 03:38:44.201457+08
bd6b301a-3dbd-4aef-af2e-fd35a565acfa	visitor	\N	other	其他	查看 /setup/check		\N	2026-06-04 03:38:44.21119+08
07216331-d162-4b50-8372-1c1a5a0ca080	visitor	\N	login	认证	登录系统 (admin@kamism.com)		\N	2026-06-04 03:39:25.979918+08
456b1907-ff93-405f-8824-53b43527d0df	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 03:39:26.92167+08
2156af3a-bb7a-48d4-89b8-fe73ddfc7721	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:39:27.170817+08
6fb50470-e0aa-48aa-8551-bdccdcce9767	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 03:39:27.25758+08
0dad1ff6-9c6a-4d70-a505-92c0ae66bb19	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 03:39:42.707264+08
e6586e7f-9e3a-48d2-942c-3f2374e13f58	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:39:42.742571+08
6ac71fe6-b2ef-4684-a5fd-663861d85483	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:40:53.413368+08
258d5248-c317-406e-85f7-4f4cc167d415	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:40:53.770308+08
fa95ebcb-0969-4ec3-a3a0-ac8de55bf026	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	消息管理	查看消息列表		\N	2026-06-04 03:40:58.638563+08
094bba24-d6be-48e2-890e-80edfdf045ce	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:41:00.274256+08
d0ac2c07-21ec-4545-8083-49b6e06a1662	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:41:00.275413+08
27c02794-71ba-4925-812c-20551727e153	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:41:38.924868+08
7a75d9dd-f131-4f47-ad72-0548b0ef4912	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:41:39.13517+08
e67266ad-cf60-4ed6-ad31-6a7e3d2ce81f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:41:39.379886+08
3e25dbc8-aada-405c-846d-8433c0c0f4d9	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:41:41.200296+08
ba1e6685-8fb4-437c-9b89-4c46979f31bd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:43:44.182083+08
7cb1f006-d9fd-4792-aae2-7606dc5ef53a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:43:44.228357+08
bbba505b-16aa-4278-9cb1-fe3551f756f7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:43:49.649502+08
3c689aa2-5b0c-4fa1-a663-73be957de566	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:43:49.883639+08
79898298-e488-4b7b-b2b8-848e95bf0213	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	卡密管理	查看卡密列表		\N	2026-06-04 03:43:52.486671+08
2b95e477-0091-4cf3-9444-eed97145ec1d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	应用管理	查看应用列表		\N	2026-06-04 03:43:52.50506+08
8fc45465-05cc-4d34-bdb5-28a4e6493a9f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:44:21.23607+08
fef04983-216f-4660-8fef-ef7f43a296a5	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:44:21.236824+08
bf4b5f06-deb7-4602-9b9b-43002c698164	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 03:44:25.250718+08
a784472f-0832-4463-b5d8-4ffeaff2707f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:44:25.251987+08
18df6a1f-6eec-4519-8bdd-0b43fd632cd8	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:44:26.913542+08
602491a6-df15-4c0d-a384-1f429a59c723	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:44:26.922994+08
ffdf6643-d7c5-4d30-9cbf-2abf3ed0daea	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:44:28.561968+08
965240b0-bbdb-49b2-acfd-5f75c52d7de3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 03:44:28.570679+08
e6fabd7b-f8f2-4aed-ad13-5fe215d7c147	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:45:54.355559+08
1ec1e085-d6ce-4a4b-ba4b-2430c884e58f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:45:54.40328+08
fb2086bd-4b70-4075-87fb-fe01e9334251	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:46:17.340982+08
0dc415fc-d4a1-4253-8af2-a39ef6595ef1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 03:46:17.383956+08
bff6c6bb-e9f5-4fed-ae46-92bb2086253f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:46:21.692647+08
22ea1f69-701d-4c47-b38e-9ed8184b7711	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:46:21.692847+08
e53ff0ef-bd01-41a3-aeab-eb270a2dba7b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:46:23.936932+08
a218fee6-9f84-429b-95eb-8a63fd6f50e1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:46:24.153186+08
c86fb4cb-ab71-4258-8bfa-860ac5f58d26	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:46:24.355615+08
7d5e44c5-38c0-42c6-bb22-2577bba591fd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:46:25.979724+08
0487ce15-f625-4b29-855f-906ca6355af8	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:46:34.200319+08
26a3a628-3d7c-4acc-8509-a516bb3f295c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:47:52.457059+08
852e2f57-73dd-42e1-a987-753aad97786c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:47:52.721678+08
3f85f97c-a0a2-4693-8d4e-4b9315aacf17	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:47:52.936812+08
ef6b60f1-d474-4ad7-bb52-b34214b9e0fb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:47:53.174666+08
2a162933-1219-4371-9cc6-15e6cd6d6255	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:47:54.909543+08
1efb0ca2-af25-4667-907f-8b00996ac523	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:48:46.467649+08
21e3ac55-3b79-488c-9217-f50f30281b74	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:48:53.886054+08
1fc6d8d6-e731-48d1-b02a-373e3e2e3134	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:01.360908+08
272ba340-0b1e-4a8e-b46c-8796f0cc4d43	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:11.716865+08
8b9bc96f-80cf-4015-ae8a-90cd402d8d66	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:49:32.63319+08
690d07a6-7d7f-403f-ba16-47e9d024eb67	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:35.746408+08
38409afa-894c-48a0-89bb-f09ccfbb6430	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:38.741217+08
1e7f47d4-de0b-4604-941c-777354a2932c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:41.815389+08
5866ec14-7798-49f3-b60b-82be015fa2d0	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:44.921651+08
3012420a-2203-419c-beed-aacd843dcf73	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:46.632938+08
a68044d4-676d-478f-bc8f-14e6765fc8a0	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:50.294475+08
345edec7-aa64-46cc-9939-abd5057d71d7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:53.782055+08
4654994d-9f5e-464a-a07b-7e422032591d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:56.875346+08
b43b95c9-89e8-43e3-8f84-6c431f76b647	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:59.900643+08
f771c78c-7bf7-4327-b336-51ff1015b99c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:03.063192+08
d8c91d3d-474d-4b8a-a594-9a44ca65d12b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:06.105221+08
2270bee9-dcc4-4b6e-9e2f-6ec9968dadef	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:09.09738+08
e6ce7f12-6a9d-4010-9404-a1c3e3606213	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:12.06635+08
61d14f0a-f112-4956-9d72-09d2474ebd6d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:15.1862+08
fe022fd7-dea0-4041-9f9c-19bb52bc1d7d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:50:15.819132+08
3684eafd-46c9-48fd-a532-9d2d49f5445a	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:45:22.635118+08
7ff2eb70-134e-4bea-827f-48ce2ae9814e	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:45:29.615749+08
38f77e75-3d9c-4c5e-a5c6-0fdc8f4a7f55	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:00.562045+08
e072d5d0-d0b1-4443-be7b-31650bd854d8	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:07.568697+08
c293fdbc-1e31-4d07-907b-92ea031dbab3	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:16.484998+08
ebb6dad9-794d-4b08-970d-402004d16d6d	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:46.489923+08
64161da8-a2c5-4a5e-acb6-e32e935ad8b8	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:56:24.714242+08
5e77ecf2-eaab-48b6-86a3-d2973c850f20	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:56:30.268284+08
c4522faa-f8ba-402a-8ef7-19cff4cd647b	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:09:57.346549+08
72c4463c-98c9-4822-9a56-042c75a4ec1c	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:10:01.670317+08
d38fdc61-a4bb-4a59-bcb7-0dfa9415bff9	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 17:10:05.961318+08
59677481-65bd-47c4-a462-4f35fd585712	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:10:07.239447+08
130cc3af-1c1e-4005-bcf2-8c431a259767	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	操作 /system-update/apply		\N	2026-06-04 03:48:40.555846+08
399228e6-fff4-4dc5-a066-99e1a4f56cc9	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:48:46.255976+08
48b89a15-62e8-4c34-970e-34688d95f95f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:48:53.875215+08
8fe034c3-a934-4e54-bfef-00e9a179430e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:03.472959+08
dbabe834-1922-40e6-8bbe-62b1b591c5fd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:13.584861+08
ef95bf3e-9e59-4922-a48c-6fbe62a82737	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 03:49:17.632141+08
1b7166c3-d533-427e-ae38-4c7f08449cde	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:21.162929+08
ee74b4fc-9083-4de8-abf5-dae982efa17b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:25.154103+08
2d5e221b-40db-4801-8504-e91ca72aa069	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:29.127939+08
fdce3020-671e-402e-a2c3-59fe6290a957	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:31.146999+08
9f13297f-a155-4bc1-952a-39c88c2daf1a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:32.662814+08
e7d4f4da-39cc-4ca9-9cf9-eb978a14c955	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:34.171504+08
653533a8-b6d9-4a57-8f81-94a16eaed390	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:37.240905+08
8e8040f4-6e9d-4b5e-9b05-fda82982fda6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:40.27915+08
e1339caa-4232-4d4a-9d1c-100d88a88675	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:43.385798+08
7516e39e-a586-49b6-a99e-7e89634d4bff	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:50:16.314347+08
a51bd468-9408-4ba0-b529-ede450f525f1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:21.426112+08
c7a6a4ea-9e17-4d6f-81ff-e5d39620a97c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:25.465544+08
53ff4b5c-ed3c-4824-b488-a51946c3d337	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:29.391781+08
9624bcb5-4c48-4c5c-9dfd-5d7cf19cba12	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:33.377778+08
55e53f29-d5fd-435b-a8b2-d1ac0d1ed8e0	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:45:30.888834+08
ec66aa5e-b860-46bf-9b4e-64ded728bd7d	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:45:40.880236+08
fad72c6d-f2a6-47cc-865d-b7462c2c9a98	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:45:42.174738+08
be1b58d8-cf09-4b82-9934-db0c59ae2114	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:09:58.416684+08
63361afc-3355-48c0-8f08-428a148f2fcd	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:10:01.793332+08
320fecd2-2e5a-46f4-b019-e6765985dc6c	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:10:07.16269+08
0ce9aa5d-2518-48f4-915e-db01f37de1a3	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:10:11.676504+08
07f8a540-b643-465b-b8f0-ccd6ff020c41	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:48:41.984069+08
5049baec-7b32-4b0f-82b5-bf60bd1245f4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:48:46.718891+08
2392be16-422c-40cc-9c07-4ce1df775bf3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:48:54.290651+08
a2affd3f-1533-4d92-820c-60118523147c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:05.490388+08
775d64dd-2270-4b8f-b9a3-75aa6afb096d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:15.836463+08
81f77568-b361-408e-b2e6-50a5e777e0b4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:17.567318+08
5d1d5b4e-e25f-468b-bb0e-f0821e6a3780	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 03:49:17.685426+08
2c26e27e-6f56-4161-b802-92f13b436ced	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:23.227096+08
144ec030-2ba6-4505-8021-58c7bc765e34	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:27.229423+08
2465b3b5-9838-4fa3-a4e1-686fb99b6162	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:50:15.817423+08
be98b169-2cdf-4d3a-9719-cbdc845d0813	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:50:16.066341+08
5b0dafc0-c1b0-44d7-a4a8-1ee14ce28638	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:17.868922+08
c9365059-69b8-42f9-8a05-ba010af740e8	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:23.384693+08
0f8f8e1c-3396-4a59-b3f1-314b3c937c0b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:27.437658+08
6d064287-4430-452f-a25e-346a621c4fbc	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:31.481288+08
c2ff8409-249c-4b69-bea0-1b784d40ac4f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:35.392912+08
49b43867-3012-4811-8e14-30c74b3c3c4d	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:45:30.972703+08
e8da3319-a36f-4554-8db6-3759a1b8ae86	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:45:42.080334+08
3f09c849-457d-4fdc-9b62-dcbc19244c33	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:46:50.453094+08
88bba5d3-2c79-4ff0-8e52-538684e65fe8	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:51:44.910653+08
62c9fab4-d2da-4429-b736-2bf9a36ae348	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:13:22.645899+08
1380b35d-4620-40be-86f6-085ad154a220	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:48:46.515645+08
803b2c38-f0b7-4935-99c4-16bfd916b7d6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:48:54.08866+08
ddf3da81-b8bc-4c25-bd70-7e67a071e653	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:48:59.450636+08
1578586a-be5d-481c-b630-5c7834e25148	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:10.133442+08
6185acde-201e-4664-a7d2-77cbc98cb5ca	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:02.444861+08
3724b858-869e-45ab-a08a-16ff8ecf57cf	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:52:15.198719+08
9dcea44d-cea7-4dd7-9bb9-700d16addda0	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:16.59134+08
460f1b18-92d3-40d7-bda8-f8f6a8b24e70	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:52:46.398545+08
1d001b00-9f3e-41e1-bd9c-ce53da96e4d2	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:56:28.899541+08
70565216-3748-4d48-8390-f4aecfd86611	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:56:30.157978+08
2c6ce004-c1ff-433b-881f-5676f6bdb27e	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:14:28.462689+08
181d3120-476e-47a1-a8f6-39eef582af12	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:48:48.461515+08
6182cfd2-9916-47b9-9862-ddd7c40c295f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:48:55.919306+08
8a2301c4-0c63-4704-9f9e-d8cd8f26b956	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:07.406542+08
d0c7a099-4a8e-489e-9117-f37fca495437	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:49:31.125683+08
34f89133-77fc-4238-a502-b6124958dd5f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:49:32.852883+08
65666d33-2c5f-4e86-adaa-a270b0e7e9ad	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:48.487908+08
7f5f2db0-eb09-48cf-b265-9e4b0129e86a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:52.299346+08
a91d6137-d466-4ecd-aef0-cb3e85492a88	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:55.275992+08
9fce2afe-10fa-4067-9c39-313751f7a45f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:49:58.39524+08
8f169c9b-3439-46e2-93f0-5122ca88401d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:01.462642+08
699ab655-bbbd-479b-b8df-3cdb62838b02	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:04.58133+08
3895b5ac-18f3-4caf-954a-e77e1ce05f60	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:07.635746+08
d5367939-7319-43c4-9f1c-9cf7ce157301	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:10.589898+08
d350afe0-e242-4d3c-833f-4edafcc44119	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:13.638753+08
a5ae5cec-8d97-4028-9414-7b2095ae54eb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:37.541431+08
a4ad1d64-fcbc-41fd-877b-4b7ecefe04e8	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:39.46805+08
789fd82a-a83a-4cec-b2c9-3366624ef667	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:41.350078+08
2658b47b-f4a4-442b-9caa-d58b291b3411	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:43.366964+08
d2e6bb46-08f2-4ea7-b29b-e43baa08fe99	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:45.404001+08
953c2d08-db89-48dd-8d53-9800ad1f0d8f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:47.345074+08
3007fe0b-7266-4b6b-8f1a-d40cc49de081	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:49.405891+08
c7b3b224-acf8-4e8d-be3f-4a980828b11a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:51.414945+08
541ad7c8-6232-46e8-ae75-02f37bbb84f3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:53.399639+08
c0811bec-08ee-40cb-bb77-3b370a14edeb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:55.437553+08
77b2dd28-5a27-4d03-a50d-5faf21623726	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:57.475935+08
89803638-8299-4168-868d-ff8ca4407fff	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:50:59.395388+08
622ee51a-5970-4c75-8963-e092aaab1bdd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:01.477224+08
62ca04e8-bd96-40a1-af71-a7d756fcb158	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:03.47532+08
c052190e-b6c6-4926-8409-1fb905870722	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:05.434088+08
d1da9af3-cd3b-4c07-a64c-7caaf46cb0f1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:17.538323+08
ff59b2a7-1e60-4988-bd10-517c100ff5bc	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:19.305354+08
caae6434-6e8c-4a7f-bf65-c13ac2213b2f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:21.270071+08
a489edc4-7133-4d00-8610-3cc28b8f2537	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:22.81142+08
1a3b1cc1-6b8f-4b08-b018-27b205df6b4c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:24.409738+08
3a34c740-324a-4131-addb-86b329baf434	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:37.344091+08
490a4a4e-eeec-4f59-83c6-ecf424f2850d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:39.088273+08
7a1e5628-833f-4d5b-bc48-82cf0db4d27a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:51:40.593754+08
aab73856-3f30-44f1-9350-2fd1b69875c9	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:00.652744+08
beec3f9d-3108-49ad-a571-7c0e641d297f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:02.359765+08
46b65a2c-71d0-491d-bc7d-245c1311fffb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:03.874741+08
5fa03def-1599-492a-bae0-4d3ca10d2332	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:05.435383+08
9c2991b0-4ad9-4cba-9f4f-961ff583d7ae	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:07.421275+08
b8c82872-1bd9-4439-92a3-ebe1c5305819	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:52:09.429799+08
cf3e54a9-6efa-4402-9e9b-cd14961b8281	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:27.757361+08
1fe986ff-c6a3-4702-ad02-0e6f583fd2be	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:29.245113+08
da079d42-239c-46e3-9082-0399ee21a179	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:30.975153+08
af5d9899-23de-4695-8156-f3f10dff453a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:32.422913+08
1e76be11-66ea-43b2-83e5-e81a1e26385c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:33.92429+08
1dc83703-4dcc-4573-8400-8b456ca4ba77	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:52.631842+08
4337975f-a968-404f-b1e3-11c66f94a06b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:54.388895+08
6cd14eca-3a0b-470f-bda7-198122c704aa	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:55.855376+08
e9601992-77da-4c09-96d9-6d635570c1a6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:57.432118+08
1f3fcef1-1911-4920-ad1c-6d426013ee50	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:53:59.459503+08
47a8d5ca-d889-4270-b936-4742d2a16843	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:54:18.575896+08
dffa87c2-782d-4b56-99f6-e53cde290f89	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:54:20.203569+08
9982885a-c389-4bcf-9f78-172f786fc3f7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:54:22.062262+08
da76f668-fb00-494f-8af1-eb0dc035c3a7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:00.250915+08
7c6ea3e4-931a-42d6-9c1a-1944d49d8dd6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:55:01.528209+08
ddf38461-7f78-475e-9cc9-022ce491aba4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:55:01.694977+08
46d2d416-ef1c-402f-bdc4-edd17fb9084c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:55:01.774531+08
5ed12f70-6c03-42cf-a5df-9bd37f8b079e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:02.012316+08
3ff4ec77-f806-43d0-ae2e-ae786272d936	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:55:02.02004+08
4f4ea9cd-090c-4463-9753-01c9333d2583	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:03.477104+08
7b45654a-1565-4c13-bb75-82dfae3ec69a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:15.301215+08
5f10ae1e-48c6-43ed-84fe-e35c983994bd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:17.28944+08
ebffe12a-0080-4820-8324-3dcf140d6641	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:27.203434+08
f3bdaca4-9fd7-412b-bbee-3224f13fb770	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:40.652165+08
6c89ab7e-36eb-495d-9eed-2794b858eb86	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:52.570552+08
b576582d-9778-4279-b9f7-8d98321cf278	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:12.641632+08
6dcb31e9-4c80-4e51-be48-46fed8e0d5d4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:23.92653+08
84aeeee0-699d-48b7-808c-f69ab96a7e58	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:32.491231+08
74ec9582-b97e-4130-89e4-1d1cfe865863	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:59:11.895394+08
b1110828-18cf-4ed0-bca0-d5a7f65d60e4	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:20:00.651543+08
3a146961-97bf-489e-84f9-a600eaa7ead6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:07.125122+08
ad8ba4bf-b28e-49a8-8486-97821316e57f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:25.364971+08
bf9d6497-0a1d-4c13-b6cd-70df5b2fb77f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:38.137399+08
08b165d3-0735-43cc-bf80-79ff367319b7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:51.004981+08
269b9047-4a9c-4a02-87f2-e1c226c3f333	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:08.493679+08
35adc1e5-e7f2-449e-ae75-2dbc8652a0f7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:22.343058+08
69950a8c-40f4-4eb5-b123-7c6424ea0130	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:30.905423+08
087a0b6f-5b9d-4cce-9397-ebaed68c83ec	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:03:26.384696+08
308fc8a6-3806-498e-bb44-e2f894d2b408	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:27:35.428961+08
7c4eea1d-6021-44f9-abbe-d9904108c01b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:09.263658+08
362c29d8-2bc6-4d01-84a1-328b4d12c1cf	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:21.330425+08
eca1758f-d26b-4fb9-96da-5c38ebcadcfc	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:32.111909+08
2bbcd6d8-84fd-4a4e-ab1a-1822c9026be1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:49.072092+08
580ec6b1-c867-436c-bd38-cb370621203e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:06.037994+08
f0228ecc-ce74-44a5-ac06-7180dd302083	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:20.739653+08
d6c16137-62ee-4c32-8d13-07f5d8d62431	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:28.939555+08
962b0fe2-6ea2-453e-8f81-acdc0c711ad6	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:03:48.979373+08
a3683605-925f-4f86-a59e-e7a11d2e9fbb	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 17:03:53.468415+08
42f4bbee-7f17-47f7-8fa9-be216b982db1	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:03:54.855709+08
8cc430cf-a3e2-4d0e-aa27-d76ffec423fd	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:40:47.676721+08
f94e2683-d825-4d20-9197-9063fbf38839	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:43:55.357239+08
6cfa947c-d236-4a58-81a8-5cb4d88f9fa7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:11.245072+08
28bccfdf-b75b-4690-8099-d0b4b603940e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:19.238278+08
159d50f4-4987-472e-89c7-fc70dfe76195	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:29.054166+08
09b00ae0-843d-4359-8c94-4effb83a93e2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:43.910873+08
77c99e08-487a-4ae3-a651-c23750712161	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:54.21749+08
e8272613-5ccd-4c74-9f64-6a411339d185	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:15.175876+08
5173f30a-5db3-4620-b395-0a7bd66699d3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:17.423725+08
192f4303-d16a-4d9c-bd2a-5e2ea941a75b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:25.573895+08
9f95c659-60c8-4b34-a46d-01ea67fb0d67	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:34.138094+08
dd7a0c32-bca3-4bf1-9726-1a963d461585	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:03:49.175295+08
529914a6-9305-4c07-89db-97c9d511af78	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:03:54.724466+08
942dcb27-0171-4784-b9e9-47f98687957b	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:53:57.634841+08
4a233ca5-2ad3-4871-8796-3b950a4d34de	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 17:54:35.508913+08
f2b36a35-01cf-4056-95d8-415b5d681c02	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:13.244052+08
d8d52ee7-1e24-4246-89cb-f7a3001ce3f8	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:23.36044+08
2ede38ad-e1bb-48f7-b6b6-42b5dd4e434a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:34.380316+08
c8f64ea9-0ff9-49c8-94aa-fdada895a6b3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:55:46.170969+08
c851e8f5-2360-4b31-87b6-815940a9e059	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:03.73916+08
20facd35-f773-4931-b75c-64830ef4931d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:19.082517+08
8e7da321-7305-47e2-8221-cefbf75ef5b6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:27.240969+08
f4383c7e-c5f7-4e77-b228-0489c9468330	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:56:35.799154+08
a590f853-4b5c-44a1-9eb2-f07abc89b726	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:58:35.002476+08
d62841d3-b926-463a-aa2f-b6f4084b3128	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:58:35.230145+08
193f3caf-853f-42ce-8857-17bd23f505fb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:58:35.461567+08
d962dac0-df77-48b0-9ecd-add2939bcf47	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:58:35.689327+08
b01a430f-7ddf-44fc-8fc5-5ba14613f583	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:58:37.284432+08
886f571b-95ce-4944-9957-d3f1044fded7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:58:37.749102+08
2c65d17b-937f-4ee7-9b10-6daeea899ac9	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 03:58:37.806686+08
96710aee-7ceb-4f73-b811-0f7a5c222070	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 03:58:39.771977+08
6814f15b-cb65-43e6-86d6-8f66fb6c02f3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 03:58:39.771905+08
ba8390aa-c191-4344-bc98-133f68fbccc4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:58:48.934455+08
b0344a49-3f48-41da-ad3c-69c1e9481da5	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:58:49.217401+08
0e99fe29-b067-4c12-b347-7525f4d9e395	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:58:49.453272+08
2393b2cc-cbf8-496c-9f2b-0073899d0e77	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:58:50.930078+08
4dac9796-a30a-4f33-b976-8f5a155e15c1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:58:54.475427+08
f465e893-e603-47da-95f8-792b5735bbdb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:58:56.532172+08
f4c3688f-99fc-45c2-befd-59a6eff8005e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:58:58.443108+08
5926871f-6781-41e5-87bb-7cf008368d38	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:02.818563+08
866a43b1-c562-4774-a27f-0f1ca25d5fdb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:04.473414+08
abcd5f17-69a4-4b32-a38a-532ed51d373d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:06.431939+08
8ef2f83e-46a7-46fc-88af-e47a1356893c	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:08.55399+08
86e9f86d-36cf-4da1-99bd-2084d218b7c3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:10.455909+08
93061517-a6f5-43bc-9c14-7ab6c97c1420	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:12.441332+08
96cb4609-35a7-47b6-a40d-de0444adc45f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:14.585585+08
17856ce0-cf4f-4d25-9f04-ee6499ec8b8f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:18.986005+08
e534d57d-bb03-40df-aca1-db511f242c12	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:20.663358+08
b60947d4-7467-485a-8138-f0d1970a7d7d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:22.378072+08
3e960a3f-42a3-4167-9aa6-bd133f4c8fae	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:23.938556+08
1011288e-f24d-4e0e-b74e-fb0f7a947b95	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:25.467027+08
8c74059a-cd61-45d0-bdd4-8a68d607897a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:26.953815+08
e416d17d-789a-472b-8b6e-a60fedd0656a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 03:59:28.809409+08
34fb3a24-f453-4c9f-924a-2e71346fef48	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 03:59:28.877337+08
74b761fb-c6b9-4d1d-8420-1635c4cfa0b9	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 03:59:29.092426+08
8e165bbc-ebbe-487f-95eb-376820b25f14	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:30.604774+08
db00e9a9-4324-46a7-aebd-33b1289a867e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 03:59:30.680281+08
c79356bc-5755-4439-990d-239bb0b8eb96	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:34.311577+08
f1a10887-493f-4057-9981-c768d181f7fe	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 03:59:36.25531+08
b8cbefa8-7ff5-4d74-979c-2738f688b254	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:18.878923+08
dee1321f-3c18-4445-977f-b1dca431ee15	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:00:20.43291+08
cf72a3e5-70d0-4b85-8c8c-7a7e46d402bb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:00:20.482441+08
01caadc5-7103-49f1-b720-23e9d1dbd708	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 04:00:20.664217+08
dfaefd59-307e-4f4b-9a28-1286fd638dd4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 04:00:20.892764+08
39cce837-be45-441c-9ca7-6bf5aeb26344	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:22.130598+08
0cf5890a-5938-42db-a89c-1f85d3944d77	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:25.701841+08
a1a42239-71e7-4df0-9ee5-ed84815e6f18	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:47.919884+08
982b00f6-62c8-4985-84a0-73a4cdf2414a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:49.703899+08
52c1daf2-6d37-48dc-9111-78a939141c31	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:51.287927+08
49ef0a41-d54d-45ef-a031-fb69915baf80	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:00:51.305412+08
032942f6-542f-4f2d-962d-68de82d5aff6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:00:51.501712+08
c316f89d-033d-4986-8d42-4ebf84ba3ffb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/feature-switches		\N	2026-06-04 04:00:51.524078+08
f1f4f2f3-a841-41cb-9bc8-8a603c05d95a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/email-config		\N	2026-06-04 04:00:51.776752+08
226cc23e-de95-4cc7-97d7-31bdefbbc057	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:53.148855+08
cc25ffb8-84dc-46e1-891c-341471d27531	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:00:56.709961+08
1b8f0159-f84e-45db-93b8-6d9ea96dc041	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:01:11.851045+08
38b7d493-8bc0-4147-8fe9-484f7837916b	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:01:14.515674+08
acc815be-233a-4590-9a2b-3c31fb189f17	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:01:14.527877+08
fc00447c-93d0-4f38-9f0b-13b100f213ff	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:01:16.618893+08
01db5ace-e6c3-4232-b53a-f6fd0430d9e0	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 04:01:25.787519+08
fef02fad-238c-4d31-a435-ba1eb03d1bfd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 04:01:26.141926+08
bcd26289-67c9-4b11-a797-b74d99566dd1	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:01:27.443849+08
97c7d9f6-cae7-4cbc-81be-848f4e147dd5	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 04:01:27.454103+08
65dd8d40-ab74-4552-8f64-2185be492894	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:01:29.374391+08
713c49b7-d8a1-4b01-82d7-7d7eef247eca	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:02:01.970148+08
d6404571-fe44-4098-a105-93ed55c8fee7	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:02:03.421349+08
97f7798e-e58b-44c9-9541-13ab885bb2fd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:19:03.441962+08
165eaccd-ddc1-44c4-b491-af7c050e0bb2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 04:19:03.528261+08
c316baae-76ff-4aaa-b1b9-48919371ef21	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 04:19:03.558677+08
54ddf306-5dd5-4470-a5bb-d02c01429c86	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:19:06.039508+08
d69d6627-829a-4209-9ff8-e2e68f80827f	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:19:07.997657+08
2f5738f2-3268-47a9-b97a-d3e96b23c34d	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 04:19:08.011498+08
91a72deb-7659-4d3f-adf3-478f8ade8474	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:20:35.792925+08
1e1bb01c-134b-43d5-9998-d1c1859588e4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:20:38.185929+08
a45b2f97-e364-40ab-aca4-0e82e67df3f4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	操作 /system-update/apply		\N	2026-06-04 04:20:38.461526+08
1ad2deb0-61e7-43b4-91c9-cc4a2fa2445a	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:20:40.006048+08
40d25a62-efc2-466b-a2c3-c2e103410780	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:20:41.22325+08
80610791-3de0-40e1-9396-775d8348ce60	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:20:41.456288+08
e3c2ce05-149d-4d07-a741-0aa34ae811e3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:20:43.2831+08
7d146bb3-d3be-4523-8a9d-5937604b12c2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 04:22:14.637757+08
2aa9ad15-da0f-46d1-9d7c-b4124d3a3aaf	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:22:14.907297+08
5fafb799-03b9-452f-bcf1-19e4457edb58	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 04:22:16.986601+08
2904bbe7-34ed-4b26-883a-25658947dbd2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:25:11.71237+08
8b8da8f6-9f2e-4b2e-8f55-d2d8709fadfb	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 04:25:11.756864+08
25e6008a-b980-48e3-b514-d1cdc6fb4489	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:25:12.286224+08
6825e335-5d94-431a-a8af-ca818db7eca0	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 04:26:25.296033+08
fc872e07-081a-4927-8948-f03894076fe4	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 04:26:25.571919+08
b47a19e3-5d9d-4e24-9b5a-fd67d738a4bd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 04:26:25.608468+08
9936daf7-0cc1-410e-997a-4f8603c9ddc6	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:26:26.951186+08
a1149e73-3710-4a92-825f-9f8f15d1c356	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	商户管理	查看商户列表		\N	2026-06-04 04:26:26.959935+08
1d654af0-fe2b-46f2-8ccf-02f9d33fad23	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /setup/redeem-codes		\N	2026-06-04 04:26:28.719745+08
2532ff9c-57c6-4db8-a157-47ef3ca57e56	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	套餐配置	查看套餐配置		\N	2026-06-04 04:26:28.724102+08
9efa6069-4031-401c-b185-4101cf3be5a2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	消息管理	查看消息列表		\N	2026-06-04 04:26:31.397431+08
8a564aba-c483-4e0b-b825-c19e872401c6	visitor	\N	verify	接口-验证	验证卡密 		\N	2026-06-04 07:39:32.404922+08
62ce489b-66a0-419d-8c1f-d87bca3c4b10	visitor	\N	activate	接口-激活	激活卡密 		\N	2026-06-04 07:39:32.51128+08
19caa64c-a773-4971-aeca-33ae27d950c0	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 11:20:42.618627+08
d127e6ab-d76c-4ad8-ab6b-2bcaae49131e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 11:20:42.678416+08
bbaf5dd3-3168-4749-9b75-de7ad65d7c67	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 11:20:42.732653+08
4020ce7f-88c1-4c30-918e-2f4e1fe157a3	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 11:20:45.576142+08
0c3ac83b-4bd6-40cc-969b-2e356f4e299e	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 11:20:48.080455+08
8f097292-787b-45af-939a-0a12b1c53577	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 11:31:19.923395+08
f412936a-3cdf-4037-a25f-eceeee6374bf	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 11:31:19.995011+08
fdadfe28-34a2-429b-8ab5-e9f4a584c9ce	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 11:31:20.047593+08
69155581-54d2-4b41-8614-3f26cc7cd9b2	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	管理员	查看 /oauth/admin/config		\N	2026-06-04 11:31:21.988357+08
9a7e842a-0951-4d63-972d-193138cc72dd	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /system-update/status		\N	2026-06-04 11:31:24.53309+08
3ad04a54-8215-4d42-b3cf-7ae525a2b471	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 11:31:24.546203+08
1a13dc86-e43d-45fb-9d8d-867d921de792	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 11:31:24.545839+08
d1604a3c-bec1-47e8-b837-7f8576465c94	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	other	其他	查看 /profile		\N	2026-06-04 11:35:14.022306+08
c4320c08-309d-40df-b164-3ca4c2c345ec	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	操作日志	查看全局操作日志		\N	2026-06-04 11:35:14.02759+08
e153640a-f413-46dc-93ac-7273f6ec57da	admin	78981bb8-81fa-4450-aecf-dcae22383fd9	view	管理员	查看平台统计数据		\N	2026-06-04 11:35:14.052268+08
7d80c2b2-2126-4a2b-baeb-9ee1115c6142	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:41:40.022051+08
df763428-f9d6-45f4-9586-10d0f743cf84	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:41:40.594192+08
f52059ca-5ee4-4b53-b5e6-d00ac289b679	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:41:41.115138+08
2d3024e8-f8a1-400c-b967-754a582535ae	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:42:01.020938+08
e136bb27-d547-4bd2-aaee-3547572dec9d	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:42:14.820443+08
ec84872a-17b1-4932-b832-25b13d87148a	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:42:37.3249+08
3057c507-be04-458f-95b3-d7f9b8db746d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 11:43:31.471232+08
a23561d3-47a8-4e09-a65d-57191e198c88	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:43:53.803953+08
7f7f2f6d-d71e-476a-8ea6-28f2f6515586	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 11:43:56.627641+08
7a792504-f5a3-4733-8495-3b996be636a2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 11:56:27.451442+08
7538fc9a-9d6f-4abf-a066-89988fc9454b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:08:09.90938+08
417b4a8c-c81d-4251-b775-ef99eb16f496	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:10:25.438186+08
c2dfc22b-5ffe-48ac-a517-050335a27d1b	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:11:11.033019+08
dd2ed8f9-90c3-441f-b1f5-ac46e740394a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:11:12.529005+08
82fe54e9-3c62-423c-8b6e-7c0b1b072466	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:15:11.941518+08
06684535-0a3c-4b85-a0ff-71961587c44e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:20:34.694669+08
c791cadb-a1fb-44d5-96c9-8418ca44f363	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:54:33.605359+08
9e8f6a7f-33c5-4420-b54c-349328e9ffa7	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:54:33.782942+08
6ef95a12-2d14-45a7-a353-83d8f9449935	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:54:42.489968+08
2926c8c0-d52f-4ac9-b44f-f0ffa5faa31a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:23:53.01203+08
cf4c9318-d106-4267-86ac-81ae9309fead	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:30:31.83909+08
ca901720-443a-4d07-90c6-6c6b7b03d0b7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:30:41.193645+08
d9ec93b0-c7c5-4acf-a3e9-513293dadce9	visitor	\N	other	其他	操作 /setup/install		\N	2026-06-04 12:31:03.974363+08
220a0afb-518a-41b6-a703-fa11f8f64525	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:31:05.309019+08
51af9606-d98b-482a-b80e-e0d57ad6b8aa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:31:10.909315+08
9070acff-8a50-469e-889e-08d0333a8244	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:31:35.22942+08
7b5cf544-f00e-455a-999f-4c23ddfe847f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:35.404322+08
f04e787a-4597-4a0c-9f4e-fd7889bdc3f8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:35.480751+08
80d7ac40-48f4-414d-8876-4838b5abf70b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:35.760157+08
4f8321a0-a1bc-4e43-8128-5209caf3171e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:35.956479+08
eca63bbd-17b2-4564-8b39-c79b803db7a5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.12454+08
9838b59b-2b10-4844-a86e-88bc744f7511	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.245744+08
5ce518c7-de65-4fa7-8a34-6ec6435165e6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.32545+08
9e770faf-cfd2-4891-a0b6-3acabfb261d7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.534235+08
35500e8f-727f-4a16-850d-1b5f32b6dd7d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.60359+08
a3da48ae-ccb6-4088-ad74-760dc8030f29	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.783353+08
6dc81537-1139-408a-b270-d48c1fd5690e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:36.988853+08
f97c83e1-9fc7-411f-9e4e-40fcf2a2f728	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.150022+08
ffceca7d-8261-45f6-ad72-88d1156a68fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.238165+08
842eac5c-bef4-459f-add1-4ea8f0a125eb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.465915+08
7f971b1c-db43-47e9-923b-3fc54db208ce	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.573852+08
a690be39-748f-49eb-ba4d-627662f4b477	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.764371+08
18d6b16e-04c3-4ba9-bb92-c75fbe7e3ae7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.884173+08
7dea3209-972d-463a-8cc9-5cb53f0827e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:37.959576+08
f6e296cc-fa49-4613-a027-f999f3aa8331	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:38.26997+08
8d65703f-d0d5-4ea2-a404-9f82d0883e24	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:38.36385+08
5a177654-db5d-42c1-8688-0392627b2fb2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:38.716105+08
315c32ff-f9f0-49b0-8935-fffe164d88bf	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:51.771151+08
be8806e1-2908-4abe-92f2-b63fa72ee015	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:51.86799+08
0437783b-2171-43a7-b51d-b330abd5721b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.131691+08
b19b9e20-6cdd-429b-ac72-b986b4fc0513	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.24359+08
a2732faa-534c-45ac-9898-ca5a6a5a7ab8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.436625+08
b935c9c9-a495-4fc8-8295-2ae547e9c802	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.544214+08
18e7e42e-f20c-4f3b-9cfa-2eaa073e6cbe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.63791+08
fa0bd6e9-4aff-46bb-b351-a59247148dda	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.837817+08
890bba09-5584-47ab-b2e7-097cbdfb54d4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:52.960864+08
eda13f6a-0b6a-493e-9171-206bc307129d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:53.025951+08
504dcc1b-49d1-400b-95cc-b44e8e03131e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:34:53.209542+08
244c3a7b-a19d-42a5-a054-6b0462950c3d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:09.736694+08
3804431b-c70a-46dd-b3c3-d27b19ef2de0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:09.925592+08
8dbce2a1-a438-4757-a5ad-7525d39aa04e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.020955+08
b35ab7d3-c8de-49cd-b097-ef8a28358ae5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.142125+08
e5c60bab-626c-4679-a20e-db8e10177e03	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.197547+08
75596504-8e5a-4e85-827f-e8e32ac63d00	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.314231+08
7100c39a-5510-49ba-84a3-f9d5413b3133	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.365318+08
31a86076-93b2-4ca4-ba2f-9460d56c1dcf	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.558978+08
0e871c07-5409-4c6a-b8b2-ad7fb08ffe8a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.669174+08
3ca4148c-e1ea-42c7-92b2-7131e67fdda6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.757668+08
5924a19c-f00c-49bf-ae8b-8232bef27b1e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:10.947336+08
06df924b-2541-4ca0-9732-7ff9554e7afd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.043794+08
c98109ac-40f1-4e87-9c87-e9a28ef42e18	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.170803+08
ecb12c6e-33c4-4c5d-b09c-d65ac4aeba46	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.290757+08
a59d507e-4c4c-4be9-823a-136f103e0aa4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.413547+08
51bf0afd-902c-41bd-95de-5c49300cfa05	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.473172+08
ba6e38e0-2ad8-4392-84a9-1d3574f4fc73	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.593178+08
858a471a-46f6-46b6-a419-b93d5e096ff3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.690433+08
820ac679-3572-4a03-8571-4a0be78a6e05	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.872061+08
e12dec82-58e4-42aa-a06b-79eaec368627	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:11.950418+08
2d415abd-4fcb-41c1-bc23-2bb22cbfb937	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.113978+08
cfc42267-44ac-4e6f-a23c-4c44534720e5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.218162+08
3562852c-cb40-4a87-8e93-9135ba868431	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.293858+08
006c4a33-f94b-4b35-84ef-17d38ad25e48	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.477819+08
1ad4393e-3371-49c3-a18e-a7c1c2ac53e8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.839751+08
0275300d-0bf1-4b30-b9c9-165f7d7610f8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:12.930644+08
43292a4c-3a69-4aab-89ec-793ce78cb812	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:13.141619+08
1028bfd0-859c-48e6-a9f5-c13ceeaeece6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:58.690737+08
acdc2b82-97b2-4cae-9759-7eda99d11c2f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.14249+08
58ac4cfc-fdae-4c53-8271-82e32575a369	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.150335+08
8278c13d-2cb3-49c8-9cca-c92ca1ff807a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.260582+08
5d109977-7e1b-453a-a40e-58f288882f30	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.320421+08
a9285f71-756f-4606-b44d-48b8c4f4f062	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.438057+08
fbe0d00e-35f4-4a43-b931-82f1902ed157	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.520319+08
dbafe97b-34f4-4840-ac81-dc734d672b78	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.627571+08
1e703332-bf94-4c7a-8617-d6a0560c992f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.672095+08
e0008ae6-cb6f-47cf-baba-89e932ace311	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.845125+08
31809eb5-2a89-4176-b2b8-9b9ab4d78663	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.374091+08
bb3fc8bc-5d12-4f05-b3a2-ddc2095cf636	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.820725+08
2cc0df66-1b63-474e-9f68-7e0075c75fcb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:01.560093+08
139b3688-2d45-4865-b48d-da6ae53cc9f0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.393331+08
8a688028-7f1b-4c94-a9c1-412b066fec92	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.882671+08
3eda5698-624d-4921-bfa9-0f1be5e7de8c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:03.483839+08
9241dd27-338e-425b-8bc1-fcf91e9cef54	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.477016+08
7e9f629f-c712-4163-b38e-889e2a713ebb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.913226+08
418dfc0a-8cbb-4361-a995-eb8829f3b197	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.546833+08
e9f9fb78-2fce-4786-85e5-58902605a14f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.11931+08
093f6312-e374-427c-af14-5d3c6138b675	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.948656+08
ef96c419-3e5f-4368-85c8-d6961335134e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.407415+08
89df3ee4-c414-4502-8ee7-39f0ba928cac	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.948337+08
2958b9a5-8b2c-43ee-8f3d-38027943c2a7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:31.833697+08
935e3a2f-de1f-4a54-bc2d-2df868b98eb2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.532538+08
8aaf1c8f-9a2b-4f3d-9109-be04f8c969c2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.238735+08
6cad80ac-f503-452c-ae48-e361bdd19aa5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.84897+08
d067d0ed-40d9-470c-a36f-531d3f7dedab	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:39.265342+08
b9021a78-b685-4772-bb7d-61c469ac5f08	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 17:54:33.744906+08
1da08567-91ed-4217-aa56-511cc2e2091c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:35:59.946191+08
f08e616f-dc3f-49f4-9723-9881dbbef4bd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.419908+08
d69fb8de-4a7e-447c-bfce-dc62c6771695	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:01.007519+08
8ad10d1e-a3c7-4690-8906-db222ef928a8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:01.755043+08
792f00d3-c622-43d2-a120-35844d8b6306	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.462297+08
478eb5b0-055f-47e3-b385-052b976cf8ab	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:03.191102+08
f5ddff2c-dfd5-4892-b60f-d43088148851	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:09.860664+08
bb861a52-faca-45dd-8e28-d05e83394de2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.635489+08
b66670db-4723-4881-bbdb-f3bfed790433	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.03688+08
51d532f3-6637-48d3-bacc-cb9e22848075	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.64174+08
b01ab045-fba4-4cdf-822c-e03f739ea812	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:21.999507+08
deff7656-f374-4177-8ead-95ae73c4bc84	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.596224+08
1fcfdfa9-60d6-4499-8fd4-69ed041c35c9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.182798+08
b1122ed1-6bae-4384-870c-f66e5b247a18	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.743784+08
e00ce68b-ab2f-42d2-ac1e-279136ecbca4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:31.572378+08
35c6371b-0e31-4ba9-9e9d-51fec8e9dc93	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.199708+08
52d28f76-7362-403d-97d9-504be73cc03c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.800964+08
f399bc7c-0498-451e-8107-8efd2ecc5515	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.65697+08
6d4fa7a0-f96b-40a8-b952-fb9832ad578e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:34.114281+08
a2206b81-20fa-48bd-a2c0-496f9d5b3528	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 17:54:38.54019+08
2138b801-e058-4ea9-8604-62d73720634b	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 17:54:42.491048+08
2ae05c15-2768-4678-8d7c-2c3cd526d688	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.011247+08
4dfd3f98-9df0-4859-a0ee-59e5e5fa8eb6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.599191+08
65b2ba8c-8aad-44b5-bb46-92a12ab3903d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:01.184781+08
727f43a2-3f5b-4729-a452-c35b97c1944e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.202583+08
65c6b75f-7ce8-48e0-b31c-91868c8ec8b1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.589652+08
05f0e806-0bfa-4426-bb0f-7ec6f709f596	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:03.271033+08
a747e408-6c86-4550-a11a-2632a09fb123	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.298833+08
c779afb6-cad1-47e3-bdb1-d761ce104872	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.689703+08
1924ba31-c735-4c95-9e26-34136c1a8c77	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.16093+08
1335c75c-2400-4e38-8c8e-10d6cafbda0e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.831171+08
9c0e36e7-ac3c-417e-b23a-6883678c4d09	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.09055+08
3855b614-b656-4d08-80c1-2c502a9634f6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.798188+08
144d2b2e-2737-4622-8dd2-dae209793b8f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.26105+08
317e28d5-fc9c-4f4e-85da-ab0d4911acd9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.874731+08
b2a482f6-632a-4238-b437-b9556f0e0198	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:31.652143+08
9e471b2f-55de-49f0-848a-9b1c13e7eee2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.295223+08
10f337e6-77e0-4d85-ab1d-964a95de631b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.994686+08
2d5f8f93-aa23-457d-94ca-6960673da4ad	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.714342+08
ce39ec01-a117-49be-9c1f-f09a3c5b7a02	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:39.197327+08
63dd9bbe-80e0-4449-9254-9445452251aa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.19777+08
5d0a1f93-7fdc-46a5-9a7c-c2725f8414e2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:00.718116+08
f9a1c080-b6bc-4461-b47e-b72177e6100b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:01.38922+08
339408d3-b546-444b-b23e-7dfe2cc7cf20	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.272646+08
a8b00a3a-b729-4b67-b7e8-6e905173459e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:02.672726+08
fdab4760-0933-4edd-b599-29172e52fca6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:03.414872+08
e368e54a-07fa-4f77-b7f8-e50e7a43a97a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.323317+08
1676252b-160a-4bdc-9582-81039feb2d86	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:10.841956+08
3dece8b3-cf02-4e1f-ad69-63735f00510a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:11.417278+08
aa98bf62-0513-4f05-aedf-728885dd2e94	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:36:12.039226+08
f547fa32-1c9a-428e-845f-7bb100b992c0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:29.399201+08
e0b3c3e7-7087-4402-a30d-808094cc4e98	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.020732+08
c47259dd-5ed4-4ca3-bb2d-64ced57e9d74	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:30.535084+08
c1ce750e-25fc-4845-a73c-c47ec26221f1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:31.342489+08
c9069845-09c7-4f1c-a516-9cb33cd7975a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:31.901376+08
78cfb20d-57a9-4fa2-8c1d-9527a0bc3017	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:32.580883+08
1898db5f-9055-44a4-9714-9c87b1833046	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.469773+08
291353d8-02f6-4ad9-b6af-7230a8717052	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:33.906354+08
3fd9748c-6c5c-4cc7-b0ba-ed5d525901bc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:37:39.431313+08
89855c33-ca3c-4775-abf0-1db750c7514e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:25.894043+08
b42405dc-d261-47e8-a77d-a28f482503d3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:25.955848+08
7d9051b8-d41b-4df7-a304-0ed113d33641	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.223912+08
c2504489-9bfc-408c-a6dd-2b8bf9faa47c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.389806+08
ef093e4c-3a0e-4479-9a36-a9a590cd8f61	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.504583+08
1261d799-ed8d-49d5-b980-18669e915752	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.743034+08
0520f434-1f65-4492-a7e2-5fc540301cd6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.874609+08
8c24a751-4604-401f-83ae-3ceaf4d83f21	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:26.939183+08
423b239b-2a2a-4297-8ce1-3a3d6e39f503	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:27.148523+08
6df37254-35d7-4df4-a7af-84dd6634b87c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:27.353359+08
6ac7ded3-6095-4e14-8ff8-e35acd759380	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:27.556867+08
28fa67f1-d04b-459a-8163-74b6cfb9eef9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:27.754542+08
29ff68a5-c692-4796-a26d-6ba4eb1d53e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:27.961452+08
2d659348-d203-4542-a939-2fd9e798367a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:28.184297+08
ffaf352d-a700-4748-9c94-a29ec767cb6b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:28.358145+08
216b03e1-279a-4867-9d09-8896f77b38e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:28.44444+08
64e3eddd-b18e-4f87-bc44-078e640808d8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:28.644996+08
659bab36-5950-4c3a-bef7-c47a734b555f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:29.201739+08
2ed5606f-5c96-4394-bec9-9c4e177efe16	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:29.796105+08
96894401-1248-452b-91ca-c1a80e6e34da	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.220692+08
10344030-0b6a-4ff4-8c8a-94dc3e1a7ebc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.273873+08
69ceb4ff-c2e2-4813-84ce-1aa63506de36	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.427304+08
3b8a5a87-8719-4d49-8c0e-798db8e02d89	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.500106+08
4cd9ca52-ebc8-46e1-bc52-c45a24e569e6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.640911+08
50c7920d-371c-4996-a32e-590dd0ea2968	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.691559+08
029f8a05-3948-4235-8e25-be0428dd5d93	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.829827+08
b25e76bd-0342-4882-bcf9-2f96b3784f70	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:30.921099+08
bc3387ce-cd04-4cf1-ab48-c91fb17dcf07	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:31.142091+08
5c10d4a4-14a6-4761-8732-c3e739b461a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:31.353066+08
8e194725-d16a-4a8e-a0ec-9cf6625a8edc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:31.553179+08
6f26f994-2a78-4c70-ae0f-8e0bc14a48d5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:31.728969+08
107e6ae6-abf8-4084-a80a-7e1506c9cbdc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:31.925991+08
e5b53023-f3c4-41a3-a8cb-a7e01ef2a90f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:32.112895+08
29262c5d-27cf-402a-bfb6-b2dc6fdc76d0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:32.442945+08
04d37494-75fb-4fd1-9539-0e25d6e6ccd4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:32.586157+08
102253f8-1be9-453f-86e1-71d92b06329a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:32.672302+08
1709d093-0907-42d4-8253-ba92b23ee3d7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:32.877107+08
d56e82d6-48c5-4c9b-ba30-6a3462762522	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:33.157087+08
f5308a82-7160-472e-b94b-bbe1e7a3bd64	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:33.366418+08
6537b932-e779-41cf-9c19-f73a019ea0c1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:33.588001+08
056eb27b-c587-4dce-969c-4656d5a9c394	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:33.839505+08
fb68d604-8a07-4914-8a33-a3355acb9923	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:33.973067+08
d6399ba6-4e81-4745-838e-8e68b696afe0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.037197+08
edcbd6a1-c562-4965-a502-f443d2f81470	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.197287+08
bdfb509f-cc94-4a0b-a0ea-f20f5a7d1754	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.308026+08
d348e300-30a7-4087-af7e-adac993adc8f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.659893+08
7480ea0b-2da7-44d1-88ae-0ee2fc71aeae	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.847553+08
607be535-0478-4082-b3ce-03914b3be34c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:34.957005+08
b010326d-9f65-438a-840d-b7464f620393	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:35.257219+08
089cdabe-b8ed-48dd-b1ab-99fdb81667ad	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:35.349093+08
d0bf446a-1bbe-42d7-a226-c88600fd5bed	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:35.650321+08
e710f266-c967-41b7-90ce-4ef96d55484a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:36.339111+08
c8d436a5-497c-41b1-b845-ba033ba2d627	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:36.486807+08
dba98f22-0145-43ba-bf4d-da95150b54ad	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:36.560863+08
d30c04ba-1699-49b4-93c3-ce5907ebbc87	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:36.701941+08
0fe26274-c509-4644-b404-96c7aa3703c9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:36.765054+08
9b8f39aa-0304-4c95-802e-6bcfa1ab4360	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:37.082004+08
bcb3ca3f-29be-49a4-b02d-0cd1806c4af9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.064902+08
9bb5c31d-92af-4320-9714-18f899a8d0e8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.690366+08
648b6465-1340-4b58-b856-7102ff2d51f9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.365715+08
14a44ede-bbc1-4209-a3f0-70a25e4823b3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.975844+08
dce33998-0899-42ec-ba0b-02b70a8bcb9d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.039601+08
5a34620d-2a93-4492-9bd1-ff5ca07c7f03	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.723976+08
de5cc496-d9a6-436b-adad-04aa1a8382fe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.193528+08
a059b162-19fd-4ee1-a116-b46e1a7fb387	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:43.307856+08
792e7126-fb0f-46b8-8e37-541519caff8c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:44.429105+08
de474f97-80a7-465c-814d-af4b25f9b544	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:44.986414+08
85cf07e4-3c22-4bc9-ac8b-19bf68b3c03a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:46.552232+08
aef3e1c7-f9b3-4b98-99f4-bcf610d922fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.516171+08
5be143cc-0eed-468f-90c4-b90143ee4162	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.960481+08
65f2f69c-0b50-4cf8-933f-0a0b3598b01d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.144743+08
191b214e-f4c8-430f-a6f2-8a7737792baa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.547607+08
29f165a4-8aed-4efe-9395-bc00c83fba16	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.11898+08
7fb4cc81-e9d7-47a4-ac90-fba282594dbf	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.587009+08
cc873911-cf6e-420b-bdd6-cc8d2c15c9df	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:51.146604+08
13d7dac7-c5b4-4bc3-b92b-78987752a347	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:52.745194+08
1378d824-1c94-4492-813c-b0af693d9ca1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.465706+08
8de0749b-88e1-49ed-a16b-a64ca764d434	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.955446+08
674d8516-fb42-4dde-abfe-7e7579cb55d8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:54.351957+08
39f0bea3-fdcb-41eb-af5b-c1a0484bed17	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:55.469238+08
5e92cdac-16ce-4842-a820-9dd357047a3f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.207299+08
52cf8725-5d90-4a51-8907-e356558872e9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.593282+08
0b9f20df-cfbd-448e-9bbd-f220033b0544	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:57.350547+08
0d37432d-ee6c-41ed-a739-0b2800095cee	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:57.950213+08
3bae0173-e369-4ba3-85ea-f6ab3509d03f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.49997+08
cd5ce896-0d13-410a-b9b6-fe003a0da2e1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:37.412285+08
777fc2a7-9004-4309-ac1b-3208692a381c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.210837+08
ebe2afe9-13da-41ad-8584-93877de03a51	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.94694+08
44a1304b-7cf8-4fe8-a740-70364e0461a8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.424345+08
c9459a5b-0e00-4c8d-bc89-f51023f615d1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:40.567224+08
d3244c6c-29f1-4f9b-9408-194e087f0d1a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.197802+08
a4e7a44d-6c78-41cf-8dfb-9abdfc9b9d66	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.875155+08
1d456d7a-9ebb-4c0a-8fb9-e5449d9ce8a8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.390884+08
cde571e1-3257-454a-8d08-b98028bc9634	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.749358+08
ad02b05b-f5da-47cb-b887-a967fb7d2b8a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:43.448392+08
3d314c75-d6cf-423c-84cc-ec48391041f5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:44.641144+08
20dee52c-0c08-45fd-8fb1-dac36a840e8b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:45.038161+08
1ef057e4-18ea-4ae4-9abe-a08320cb9ce7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:46.607551+08
db6db59d-1d5d-46c6-8bc1-bff53edb6322	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.562199+08
7a03ea74-9ea4-4aee-a208-1655918bf5bb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:48.514865+08
efbb71e8-ae6d-4533-a551-3ea88dcd6ca7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.195745+08
111008f4-f1b7-4dff-a0ea-f545424671de	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.633262+08
600195c6-5d76-4ded-9d35-70d8527a8eea	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.16795+08
36f15f79-c6d1-482a-94a6-0f53fb5f2347	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.789563+08
9a6c3133-e211-47e5-966a-42a376bb93a0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:51.199967+08
3c3bd532-ac09-445f-925d-2f578123a835	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:52.823154+08
4cf781e5-746c-4830-b577-b953ba1e2400	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.555689+08
bf883231-03fd-4fd7-b765-0d7f8cc1da43	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.998929+08
aa4e8a56-3331-4abd-a5e2-ae35d0f21d90	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:54.40687+08
387b1035-d3d5-4b8b-9d51-dc6070d702fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:55.672968+08
576be6a3-41f5-4eb8-843b-be9dc30ebfc6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.266288+08
4cab5fa8-1ef1-4cf5-bdf5-25812ab36b09	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.669093+08
4592dfc1-d230-4770-a055-4c8a4f993dad	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:57.541649+08
9167be9f-feb1-4532-8960-adde2e3264fe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.03688+08
07d27387-27ec-487a-8b4e-1e51aa90dfb4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.594067+08
b6ae3e46-dfac-425b-8cc6-d02f49c8a442	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:37.760583+08
ee6a79bf-0b96-4670-8503-15d3572dc6fa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.443648+08
452b6e85-8e3b-4ceb-84c1-77763c52cd64	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.104244+08
873b7994-49e8-4acb-b827-c7369dd0b1dc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.754483+08
96b50285-4c9c-41f6-a1c0-163734da78d7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:40.715063+08
4cb317e3-3745-4338-8c10-87e3f63ae2be	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.238401+08
8cb00f8e-7d34-4523-8bfb-acdd2fcba2a6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.97013+08
d3dfdc3d-396b-4b50-a0ea-34b0c06d7ef7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.585471+08
9e513b90-4d09-4150-ad43-96245bdb459e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.8694+08
5108e603-6a62-49ab-b7ce-370a1824176d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:43.552279+08
9541d856-64ca-4395-9089-a92815002dde	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:44.777311+08
4f4fc3e4-4837-499f-b7b6-e3bfc318bc1a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:45.940547+08
243ab3b6-4d27-44eb-b542-6120c9240b0e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.157033+08
c6dcca83-8048-40f8-82b7-a28d892ed2a6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.753052+08
a7ee02cc-fa7f-4da8-894a-6c09b79606d0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:48.730268+08
2f9deeb0-2182-4e8a-a652-f23bf16a9f0e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.335913+08
0e12008d-5c94-4d44-8094-e38cb85b4c47	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.809904+08
cf1e9d99-393b-4144-8fbd-07682e159949	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.360733+08
12e7a263-e552-4961-a5e9-2f57401c9f43	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.945009+08
7d0c8fc7-15c6-4227-afd8-53fcbea2c357	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:51.707406+08
5e737b8e-0211-44af-8906-946f037cf92c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.033217+08
e06f4fcd-000e-48aa-8ac0-864ca5d214e7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.715922+08
c8998471-a460-404a-a0f2-c4fea7aae780	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:54.156528+08
a9d01ab9-b13d-487a-9985-1a65175c9212	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:54.905136+08
bfb44f34-8c39-4a98-806c-192914d44301	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:55.869561+08
ced7d0e9-29c2-4030-970d-dd1c08c50a56	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.409597+08
ffb95bff-e49f-415d-8b18-4ad05ae62039	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.827627+08
d2582b49-a845-410d-a650-7dc207933d63	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:57.707259+08
7857fe64-61a1-424c-9b50-08244f925416	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.23527+08
529739c0-9a21-4bbc-bcc6-da2ff0ebae36	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.86389+08
43014348-7e1b-49cd-977b-966dab64e77e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:37.89963+08
27ff59b8-e305-4444-a313-7f3bb0605740	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:38.62052+08
17f334f1-a9ba-4f20-a9f5-aeda61f9c142	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.204287+08
b0f7a8d4-87e0-4b11-b2ac-937e61cb0e62	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:39.904219+08
6a056cbb-21e0-4f98-8e1b-d816767030d6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:40.785737+08
7bb62ea4-f4f3-45cf-8ab3-37d06615b89c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:41.479064+08
92899d34-1880-4ffb-a487-87c211d684bc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:42.134553+08
36b0de39-fd25-462f-a36e-4341e6daa477	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:43.073732+08
0b6431c8-09ae-4bf3-bf5b-1e8756050ce5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:43.874223+08
399bd26c-108c-4090-a3be-695396ed42d0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:44.835897+08
22faaaed-7763-4318-b0c7-2ccba6d3366a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:46.050747+08
d733f871-ff07-4cc4-a7dc-53e147056cde	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.380659+08
c0e2acd2-dc9a-412b-bb8b-1a2bf443b44f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:47.912228+08
0724e78b-138b-4f78-90d3-8fbc70563d58	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:48.956259+08
8a7c413c-53f7-48e6-9b29-3ea287b5f9c0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.401923+08
273a9033-ff95-454f-a1bd-cd5bc30c2c43	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:49.943133+08
5ee69972-1bf5-4cfd-8df6-7d47c5a34272	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:50.520713+08
618cd068-2720-4415-8620-9cc826b76d5f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:51.00083+08
62475dfd-ddd3-4b2a-a319-c25a3319e9fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:52.323115+08
4fe7f70d-ab8c-4451-b3ce-b5f4038cbf0a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.26026+08
3509ca36-9390-4a09-812a-d740a44b1895	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:53.792215+08
f2d5e9b9-2e06-4e0c-87fc-384c013552d4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:54.204219+08
4730d948-e68d-48fa-8e20-dab0c9bcba32	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:55.174716+08
148b011b-0c53-43f6-9cb4-36c0721aed72	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.078837+08
e214fc2f-fbdd-41c5-a98a-5ae9b424c3a3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.444715+08
ac83883c-a7e7-4bc7-895d-55669898ea54	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:56.914184+08
aea32dc6-d86b-4cfa-8447-45de30a20699	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:57.784959+08
b118dcef-30f7-4aba-8fb0-b0578b8c444b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:58.291063+08
ea26447a-f7b5-4bf3-baa9-770a035b6159	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.196204+08
4384b98b-4d7a-41eb-89a7-ff862cf375d7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.274285+08
21ffe0e6-fa6d-4264-b18f-e9cab3295ec1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.532014+08
58eaaeb9-aeaf-42db-90df-20f91b628893	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.679913+08
1ba7cb30-2277-4ab7-a48f-e07397653ece	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.747659+08
2bd3951a-99a7-42fa-8ca6-6ebb5bc6f84d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:39:59.958812+08
2a0161a8-605a-49b2-9cac-76757e22d141	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:00.159231+08
b464432e-30dc-498f-ad9c-379b60780dde	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:00.382103+08
b0485d0a-ff34-4cdf-9a6b-b49bf435531c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:00.614641+08
f03fe80a-6025-4e60-a295-2443d84d9752	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:00.835879+08
0585628f-ccc0-42c0-97fb-201c3876d060	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:01.06021+08
019fa4e8-933a-4be5-8f74-a9b35a3fe0da	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:01.283176+08
47a6b37e-1b52-481b-88a8-8a5a129aaf97	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:01.475243+08
a21fb143-e79d-465b-96a3-0baf05b1ef4b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:01.699646+08
5c5c5bfb-b5a1-403b-8309-b26b97b53de2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:01.913696+08
d0c3b052-83a5-49b6-aa9f-116c2c5babf0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.052215+08
5750f826-0ba7-4e83-b833-c8256a893284	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.112976+08
22211fd6-80f4-45a5-8122-7a4d340e3a67	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.380273+08
6e648bf0-b853-4b97-bbfd-8d08d8bfb459	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.54408+08
28efb3fb-c909-4736-9d3c-51cb405173ae	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.623289+08
b56bc025-888c-46e3-bafc-28807455b8c8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:02.863154+08
18766ef9-8951-4994-8a59-7adbd07743f1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.002357+08
35feb208-0726-46ed-ba38-b8f2c7cd9968	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.066804+08
c04d73bd-64af-45e5-951d-5a060303acfe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.350668+08
8b2c8a06-c1d9-4bae-b98f-b51cdfa006d7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.501779+08
2d0ca6e6-a593-434e-b0fb-7ac8e06bbb2f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.620618+08
ced456eb-30e2-4172-ad6e-a487a45d5673	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.811511+08
005e7d0b-45ad-4d87-ab48-00e1abc0dfc7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:03.957526+08
85e217e2-b1f7-4ec0-935f-f931926da0b1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:04.005709+08
a57c7d9b-3f31-4d63-bc72-ed050e42d7bc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:04.143397+08
f021827b-b425-4ce1-a054-9255faa09a52	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:04.264721+08
28708e1a-1fcc-47e7-b3a3-9c60fed14940	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:04.431586+08
841f858a-56f2-4a9b-ab64-2cc069e4c924	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:04.484061+08
179449a4-be0c-4fb7-820c-1c312ea76cc2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.190203+08
63729165-1792-4bcd-803d-d94ae0f0e97f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.315446+08
7d3c0bc6-b692-4132-b232-68596ebd3a37	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.438775+08
e77837d0-2ca3-49d1-9839-51654461c0df	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.507298+08
85ffd902-5b72-4a50-8702-81f882e98b45	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.728264+08
b7e8bda2-d712-4657-a731-1ae3876c25ab	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.875895+08
a18ca512-0445-4b26-9a3a-ce99dce0fd3b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:05.981354+08
ba04dff8-08e8-4bc8-b5c1-39f779f9b023	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:06.280358+08
385af10a-dd99-4de5-bd54-5dccf0e50c21	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:06.4487+08
fd3ca707-9288-4abb-ba5d-48483cd9f58d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:06.519111+08
420bda07-93d7-4963-8894-36d0ff0645e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:06.680021+08
2841d5be-dc9f-4cfa-a122-a171452db58a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:06.781997+08
76469187-7077-4566-b420-7b1dd526228f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:07.310993+08
193ce177-cdf2-4826-abf1-7b28fa272c11	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:07.539297+08
14c86828-4501-4a8d-83eb-6b87d7cac752	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:07.764863+08
7d2f064a-ed53-4a8c-8415-6d460ba815e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.378109+08
03d3bad2-88a5-4386-a4df-f2c6965c77a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.927715+08
6f618845-23f0-4d4a-a33d-97515c3021a3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.451727+08
ac95f39f-121f-417e-bc62-3982e0233535	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:10.181574+08
8f1fbc54-1d86-4ab3-a3bb-4b454f74ad25	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:10.606976+08
10369952-5fae-49dd-8eec-a0cd7b7551e5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.592933+08
a1f10bd7-2e1c-4e8f-859f-f04ebcab6517	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.127316+08
f69631db-f175-4399-971a-cee3d4e14010	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.583385+08
98e043d2-44b0-4271-8cbd-8f2e281b3525	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.64699+08
2010d7f6-655b-4081-a293-7fee6cc9f705	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.634175+08
b12d968d-2120-49d6-8513-412b4d287f5d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:14.488416+08
abe39b40-d552-4bc5-897c-ada1a1464cf1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.163022+08
3e07824a-24aa-4ed8-af96-3c5808d79f6e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.629043+08
b9bc8a15-d284-4c5e-b1d3-56934a699dcc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.311617+08
861636f4-a66c-45f4-8dcf-ee672bc21804	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.852262+08
d3521909-22b6-4516-b382-c73b5bc3853c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.308155+08
0ccaef92-036d-47c0-a129-c90ed82ef0d3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.879152+08
c1295696-cf27-4189-ad43-97a7e52c8d87	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.707452+08
f973ec64-eaaa-4f75-b158-e8a8101f93cb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:19.187227+08
6b036070-c073-4b73-94fc-c52a99bbed9b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.028932+08
34d46971-c03e-4b04-909b-3361121e00a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.601233+08
f4233b59-1182-4fcf-b43a-6cd3faa99ef9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.31589+08
ab47c6cf-91c1-41ed-adb6-423435bba504	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.793646+08
9a61cd3a-68a5-4fa4-9900-85613a7ba8fe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:22.734724+08
863b109f-2c92-43f8-be72-5b5f497ef7e8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.523468+08
83679f1e-abd6-46a1-95ae-1d857fd91c0b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.03918+08
a1d70bd3-cbbd-419c-9e8b-7dd292bf79ba	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.540016+08
3f6eef0c-0e76-4d9e-8885-b5ebe05e972f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.2686+08
8afec200-7fd5-400a-a9fd-d30f8c87737a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.954023+08
454ec4e8-aa04-444b-b67a-460d3c479efc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:26.613369+08
70c8c3bb-6d65-4b94-ab5c-1abb56e3e27f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.441751+08
79d537cd-3cdb-4f9c-814d-bb1538ea2949	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.033+08
bf0a1bc7-6294-4fc6-9b3d-b31771eed986	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.71143+08
9f887b7f-a6e3-44db-afb1-b33fbf68cb19	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.282532+08
63cc79e7-33fb-48eb-bcf4-8d0a85825c02	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.813752+08
b2aa4eec-72eb-4e82-b903-cc45f1ec35d2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.355253+08
fea27135-9035-4a4c-a69d-1cc4f407145d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.876595+08
0da8b9e1-07e8-4b06-8a28-c13d9d374168	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.638471+08
3e62cf23-6440-4243-a1ce-8820c093a70f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:32.668417+08
af1dac3e-b55f-4831-b707-b5578dc8a034	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.726859+08
e1396a94-d658-432d-b6c4-4398ef323613	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.190835+08
80ef11fc-6c04-48fb-bfe8-acd89499923d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.86799+08
3e5e1825-826b-4ac0-a9bb-2e31ab24f53b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.398114+08
44ddb582-6004-423a-8cce-1f1dda3b097f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.08854+08
ba273475-52ac-431d-a309-8b35bd4fc3be	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.869703+08
eee913cf-0975-40ba-b71e-ade12ca7e03f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.325462+08
64127c0f-5c27-41ca-9c74-4523ef6ee046	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.810401+08
a2bfaf33-fbb4-46d7-b616-3a825bb711e3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.327749+08
f116e3fd-6b03-4464-bd87-5c76a08c02ac	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.940118+08
cad89a7d-47a5-4f38-b592-ea4f6d74e7a6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.468773+08
710ab60e-4991-46e6-80e1-70f8c8d77191	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.877261+08
68094331-a8c8-4421-8b17-c12c901904ed	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.3563+08
bcf61b52-fca7-41c9-bae0-b6ddb6062f1e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:41.040042+08
5bd3f580-5312-48a2-acc5-5d092a5950b8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:42.407628+08
6d08da94-09ec-4703-924a-43215c3c4700	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:42.850019+08
a6fc6805-8662-4403-b092-973ed5e21b25	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.388084+08
0f80a6f7-8608-45bd-b747-7e97b3ebda96	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.021616+08
fd53b472-950f-4de3-8a1f-9ff5bb777da7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.515296+08
5181fe35-68c6-43c8-8336-a0c0e311c3e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.912909+08
86332097-4161-4d1a-8dc2-518b592f8d4a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:45.820948+08
9a7bb1f6-4b00-418a-96c4-99fdc09e38dc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.24551+08
9068c99d-762f-4b9a-b195-55b4afe484d6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.837864+08
0843bf53-d999-4a65-80d8-0023850480a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:47.889488+08
af77538e-4aa0-4708-80bc-3710ba05c9aa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:48.613975+08
f22831ff-12b2-4766-933e-80f11e630d6e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.349202+08
f7c3e49b-1aa9-49d4-9e9d-0f7fb36085ea	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.80598+08
b3af45ea-70c4-4f5f-85e7-35f17d0604f6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.405501+08
5d8b2d92-73a0-4ef2-b865-9c38a6bfda07	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:52.035538+08
0471e83e-b935-48dd-aea3-f5ea1899a0fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:53.315112+08
5cad8dd2-c427-41ee-ab4b-d22e2360053d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:54.038557+08
b28b6034-b2fd-437a-8708-6590624285c7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:55.239583+08
dee27b67-57d0-4c30-b88a-a56771ddbe65	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:56.055449+08
7de63e84-69fd-4f41-8c05-adbfba899339	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.001788+08
b0fc4896-3d17-4cf1-9081-6d772ad11b67	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.444635+08
1d843238-b56f-4a52-a532-6d490ac3e147	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.082077+08
da4224f1-b728-427c-a764-1f92702f0312	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.631943+08
cf41ceb5-8a53-46c4-b742-6f7a8f6c4432	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:10.343797+08
b3861485-5507-409f-8940-cf95815b7c0d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.084724+08
047c8eda-b493-4991-ad69-b1886bf70ef8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.661119+08
0e2c79e2-36d0-47ea-ae01-08403d9d3c45	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.194292+08
f6188a12-bdcc-4f99-9e77-824ba4534f7e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.150796+08
18025db9-f4d9-4a43-b1ab-2d167afcb291	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.873465+08
e1ec3bbb-2465-4733-85e8-e6a1884d2ffb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:14.700058+08
9f40a16b-f38b-4e73-b2d8-b25730b82a4e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.40273+08
c704d198-ba6d-4789-9dbb-2d212087b3c9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.051023+08
62131203-9bc7-4649-83c6-978358bdc606	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.591961+08
5489b690-e7d0-4695-8014-92dcdc0bf0e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.068026+08
1d5fd942-bdc1-43ad-9191-3dd0129b952f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.620953+08
56093767-9a45-41c4-ac25-15f7c763bfd8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.489878+08
55420e43-829b-4649-8a79-e76cf3c8ead3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.905008+08
2a30c3de-d550-4174-a173-085a082bd110	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:19.484056+08
88ce0514-16b0-42a8-aec3-3ffbf1e14108	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.331346+08
c45fa57a-220c-4eef-ba5a-bcf498c7a1fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.12527+08
c196454b-bc7a-4cd7-a02e-5e1a691af34b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.56398+08
8b6a6119-21da-45e7-9631-edb64973f659	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:22.364741+08
d27f28e4-acd2-4164-abf8-98508d15b917	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.074715+08
cb85ea6e-8a69-400d-a4dc-3fc209d8eaeb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.834637+08
1a81d954-db10-427a-a150-1c7461f749f1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.329172+08
719e10be-4623-46dd-8ac7-bf6375b5bede	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.992089+08
982d5e27-70e4-4f5c-8399-6110319d0581	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.521139+08
2627af8d-3673-4817-9675-da1024b502b8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:26.226886+08
eab0d0da-da04-4d4f-9da9-f907497590e9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.200296+08
0e074967-bae9-4c28-9da2-38dc8094b959	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.794264+08
d4ae6fae-2e10-4960-a159-e7542e163919	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.500386+08
f669ca46-11cd-4f56-bc60-b819d40935d4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.941265+08
33a1bc18-eb36-4ce2-942d-c8da8bbb98b4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.504875+08
b5e7b5c3-5296-4a60-8cf2-dde20a571063	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.083697+08
321e4ce4-04b6-462f-814b-e1b41d1282fa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.592806+08
fed15f09-25df-456a-bcae-1dd86de28d66	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.155407+08
eec493c7-e511-41db-9f67-eef48378886e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.870408+08
bac46488-e3a1-4ca7-ac24-68080f096366	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.437521+08
bf566132-fdd7-43d6-a849-a488c17e0e55	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.991787+08
29ba7a32-6dd7-4b6d-a582-44a45e67a117	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.426678+08
9c117ed4-ffc9-4f13-a708-6b58fd46aa2d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.147336+08
fc92a3bd-0fed-411f-aa3a-cce2a0e4c648	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.823746+08
636f4c94-5b9e-4817-8791-0d9995ee9bf0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.48458+08
53324cea-015c-4cc1-84b4-b7e795b161c1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.083327+08
7794ba1d-70ee-4c14-afd2-ff8c20511d7e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.547412+08
7d0767b6-fd7f-42b9-9fda-40dfc4285c55	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.038231+08
b8fd87b0-7605-4cf1-b79e-f4de16db1be2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.727919+08
c2916384-d1b3-4ab1-9857-92a479128012	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.148504+08
c6be4af1-ca3c-4ba7-911c-988ef234eae4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.681584+08
987ce724-dc68-4b9d-8daa-1cba2e2c1a5d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.116863+08
8dd7750c-cfb2-4913-a9c6-7bee1fa3c7e5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.750435+08
5ae8a60f-bcec-4f2c-b4a5-aa652b8ff15d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:41.251396+08
e13ec85e-4032-4055-84ba-858fa0dbd3b4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.093804+08
adc47f9f-0628-4396-94f8-f29822914939	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.772187+08
d091623e-c424-4f28-8d26-5f46ffe8b662	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.230043+08
6cafce66-fbec-4f02-8be7-c67e8f5adbfb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.713671+08
808bc7ad-8822-45c5-96c4-e5ff67025bb3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:45.468441+08
b9973df2-707c-4bb3-9079-e897d4840933	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.026923+08
ddf1e066-5c44-4a8f-b470-4efc49330ddd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.475736+08
1a7bef2c-f7ce-40ec-9635-d698c6b0c1bc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:47.16693+08
118a71e9-7aac-44b7-9ae4-1a21e82e37fc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:48.243085+08
9a388c22-7d79-432b-9a4b-2d45e44a8af7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.032731+08
ab9dfecc-7c5e-4e74-ac36-b2d569d14173	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.603507+08
4f0ff830-637a-4ec8-a33e-79e32d447dfb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.00905+08
e79ead93-03ba-49e8-960b-743ea3120684	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.743298+08
bd99e8bc-8838-4f79-b746-7040b62fb7d8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:52.472792+08
1afd468b-b4af-4d78-b768-a1ea264c2262	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:53.672166+08
f009b3d5-6f39-4f41-9785-f1294b5c38cb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:54.448648+08
04845010-1f3d-42fc-9fdf-c04c36be4328	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:55.638346+08
c812ea31-5732-431b-b521-b7d0e73c45d2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.16604+08
d42378c0-3975-478a-a249-a63be78994e5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.598806+08
2ec15371-3f9d-4d4c-8e70-10968a3fc126	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.157913+08
74ae3171-7b98-4dd3-ac34-da2380b814b8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.700027+08
d3671734-ba1e-40a7-b015-23b77707f7da	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:10.424031+08
bb5b5e24-2ead-4fa8-a5ef-9de6e7f8585e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.135127+08
e86843d9-7b64-4a17-87ef-a75db720d923	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.798295+08
eea30542-357b-47a3-8436-6705f4a42cc0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.354242+08
3a018633-7717-4f81-851a-7534b24d0878	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.07806+08
eca8909f-6f77-464e-9058-7f7e9ced2b4b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.809691+08
e4104c1a-fbb8-4034-9266-a8abc6499926	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:14.628843+08
416cc618-c0e4-4f66-b8cd-6688f1d0db86	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.330575+08
be8abc15-da35-485a-98a7-3b65690536cd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.87346+08
3cd4fdee-bdd0-4f14-917f-775b8a0f1abe	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.403591+08
fa90d9e8-ed4a-4282-8c33-5010356da035	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.906969+08
6ef5790e-b13a-447b-8594-e2221dfa3b38	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.404276+08
b79b2a84-ee46-4530-882c-188ee9c261f8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.321695+08
04f9eea3-de59-4be7-99cc-e4c245385306	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.76327+08
b81de8f1-3c93-4419-9777-a77018184f73	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:19.233992+08
abff79f8-574e-4a46-b6d1-2c016e0f86a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.177671+08
b0cdfe61-8cbe-4c1e-a85b-28a1851f9cc1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.904437+08
523b9a20-f481-4775-a66b-f55e42ed7713	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.46754+08
e77294fe-c00b-4146-b8ee-238a0addf53f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:22.299848+08
8826e044-ac83-4db2-8901-9968a25e27a5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:22.849603+08
3762a2a4-38c2-4c2b-b2d1-bcc95440657e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.753062+08
0838fd14-634e-47dc-9d5a-311f36dab4b6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.20817+08
811568c1-56fd-42ef-9eb2-3f0bdefced5c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.741481+08
1cf5d773-4e85-4e6e-ac1c-4f5ea1c99f6f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.445004+08
e3671e56-b7b6-49b8-bf22-c8b175b75b08	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:26.111341+08
a7db4b76-ce74-4088-8ef8-a02f8a71c316	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:26.728399+08
2e597c04-1d68-42e5-a921-d3b189354a6d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.511009+08
1224ae9a-456e-4956-8120-11572d81b7b3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.273824+08
d66f8ee7-d034-4204-bb68-6794cea3bf5a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.868575+08
6b2e5a30-8262-45d1-aa0c-6609b6b0b71e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.354291+08
873d6d6d-3ec2-48e5-88bc-16cf70b92973	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.914867+08
5c969b0b-79d6-4afe-95c1-df5e03df4302	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.429073+08
54d18249-c20b-4b3a-b658-61fc94274759	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.027658+08
faca32ab-8283-4a0f-ba32-61c1a820035d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.812924+08
17b1a758-416c-4f74-83a0-b469ffe8564b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.246288+08
0526f9ab-8135-4778-835c-9d2d2c46f102	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.793239+08
7f1954e2-4e45-4727-8924-81de7f8ff92e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.35376+08
9737eee7-efde-4d79-8387-e042c7e023fc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.030262+08
53aa8b75-0a18-4ce3-85a7-fe0b6226c478	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.627313+08
dec9a4ff-354f-44d8-9c7f-6558d5197011	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.327995+08
5b1ae4d4-2eab-4810-8f13-77d468c79b95	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.919423+08
f5f6a59c-d4ac-413e-8cd4-d7d15cac04af	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.482425+08
0514b237-611f-4e0e-904c-816dfc927775	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.975092+08
70b3cd20-a16c-4cc8-ad3d-af25f58a79c1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.560377+08
8c98401a-91f5-4a8f-a96b-76d2a2b72f1c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.99311+08
50be30e1-ebcc-4b17-af88-216cd1b32b1e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.638695+08
8bbc310b-0df3-4a24-9f40-515839b0a75e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.028727+08
b6f7b918-e851-4c72-9ec3-b7aa75f3ff48	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.584559+08
7f6e6e61-2e03-48ae-8764-dd0070b55492	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:41.183174+08
5abbbe40-1399-454c-bbd4-541403d9b54c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:42.919884+08
bf1da79a-22c5-4179-bcc5-80ff89e4a8e9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.605359+08
4241b71c-eb43-41b5-8bef-d992e9bed8fc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.088578+08
b3fd02ca-8e79-4020-8a92-637d1b5e51e6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.667664+08
e952ae4d-8777-43a1-9815-2656852323cb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:45.39323+08
cd327a6e-5801-4c39-93ab-2338125c352c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:45.878794+08
80ddb399-53d8-4830-b64e-c943e855d5b9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.309446+08
0e8a061f-7712-4108-84d0-395967608cca	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.918501+08
728c4a4a-bf24-49e8-be30-d45ae3c80730	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:48.023374+08
d224da36-1687-43e8-ab8c-16905fc5736d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:48.885902+08
ebf2bf77-a7d6-4cb6-a806-99a0b73278fd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.398453+08
3843559b-5c2f-41f3-af17-b4c06f00f581	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:50.168437+08
13920fdd-422d-48a7-9bb2-cf3e2cd358c8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.479262+08
e3cb0d24-d29b-40dc-a22f-5c4781e47eed	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:52.266697+08
a6d93a4e-4956-407a-9f2f-6ba9b2016e8e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:53.517992+08
8a0480ea-f3c2-4b2c-86f9-8f5a0f172416	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:54.262522+08
771fbd37-87a1-4408-83ad-38997219570b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:55.431294+08
f3bf2a12-60b1-417b-a4c6-4b72efe46a19	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.235065+08
184f25af-543d-4ba6-8022-bd4ae9b51b14	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:08.685898+08
aba32b0c-9c3c-41c8-b261-b02d32c512b0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.35172+08
993f6888-2dfb-4f5f-a806-28f262db8cc4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:09.95736+08
035e4eae-943c-483a-943a-0a28d5b12a52	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:10.555391+08
02eee35e-90ba-413f-ad37-bf1a1a2bf35f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.432822+08
6825332a-3a46-4e95-8dfc-a9783790c916	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:11.900263+08
6eb5cb4a-2426-45f1-8fe9-89d47cd0c599	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:12.440311+08
56147e3f-f5de-44ec-b734-5fa670642da7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:13.398646+08
6bab4527-946e-4ae0-bfb7-58475c21f2f8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:14.429484+08
292fedf5-f7c9-48f1-bc09-b0f832e3adcc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:14.900071+08
f7a913bb-945e-4d35-a9e9-2f22a4f03817	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:15.55513+08
43003113-90af-48d0-864d-9b09b0120bfa	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.140284+08
c3050cc1-ea6c-4748-905c-ec1cd88725a9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:16.689818+08
e06c3a42-6e69-4ed4-8324-846476d52b2e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.153426+08
550d0c1b-7e2e-4c44-b143-fd7f55b50c9f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:17.81933+08
71020005-4891-441c-b9a0-18bcfecfc2ac	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.555771+08
ad323e53-3dbc-41a7-b75e-fa8c9b723842	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:18.973768+08
e283606f-c004-41e6-a158-045c54048b0d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:19.832064+08
b1f9b513-4f98-44c5-8abf-7fbf44540156	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:20.39912+08
dc39b4ef-aacb-499c-85bf-97c8406763b8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.270585+08
6696eeef-f325-4396-9ce8-39b2efd2393a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:21.759116+08
3207801a-746e-477b-853f-6bf63c863c9c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:22.60494+08
91e2fe1b-50d7-4a9e-a47e-1c568898995e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.310571+08
395d7a69-59c4-4f1d-82d4-16296073aa6d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:23.990957+08
c85497ef-fd7c-4475-a36c-1f7c63bc6a7b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:24.470215+08
7506aaac-13bf-44cd-97b2-8d95e2b66338	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.17762+08
fced02bf-a4e6-4788-a65f-08d780cffe76	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:25.740367+08
4558cfed-48c2-4699-b7fe-19591e33e761	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:26.436033+08
1dab8906-9c77-46b5-9fa7-d14298a5838a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.283578+08
90b94cde-0e89-4e61-ba45-a7bb1de8db80	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:27.955095+08
d41293dc-706f-4d37-81ba-c0b94fda62d9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:28.648305+08
de73cbcd-c907-4d17-b84e-30dbb27476a6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.150346+08
2c29841f-7426-45dd-ba9e-3436bab45a27	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:29.638706+08
f67fac35-57be-49a4-b061-13ea3cb9b6bf	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.196309+08
38dfe930-f835-4f53-b3e9-ca90e78be478	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:30.663101+08
f562162c-f859-4122-8815-3472817fca1d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:31.380195+08
782bcc41-4112-45c1-83c6-e19224cec090	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:32.436829+08
530cd20f-87a7-4924-9556-2adc9bd14274	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:33.596567+08
6695c227-8345-4eaa-893c-4b847e984387	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.125317+08
f50cc141-6a18-47be-811e-38cbdc3f29dc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:34.639962+08
7d5a7d5b-fcdf-4911-9d59-2fc2759cb784	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.323719+08
ad814406-b41b-408d-83d0-4f99ddb7e7ef	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:35.971686+08
a8148924-2b9c-4391-bd5e-5fa3def7a578	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:36.548652+08
495acc7e-38db-490f-8638-eb1ededa05af	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.127301+08
d7dbd02e-a8fb-46b7-af26-a3997a9402f4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:37.708033+08
1a7d6b1e-4b2a-4b40-8d6c-93f3c2f0285e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.21161+08
9da3dd79-7a1e-4617-9460-23776cce5497	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:38.782145+08
b7f7db64-599f-4621-9a91-44f9ac290c35	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.248207+08
571f173a-8789-4c0c-bba5-738c49a8d0a6	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:39.823904+08
44ba8de2-400b-4aa1-83c1-b96c065098f1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.267832+08
a36229fd-2e83-4c3b-bc2f-0301a57346f8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:40.833521+08
65a0e202-06c7-41fa-af83-5886bf879695	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:42.173081+08
631fcbe4-225b-426e-b3a1-208f12556be8	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:42.689268+08
8fc78ad6-fe09-44c2-ac1a-1dcef69f7e7e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.16209+08
764ecf8c-3e5a-4acb-b433-73bb2822a251	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:43.844845+08
06495424-8e33-4613-8529-c6b4782be5c4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.31209+08
b15bbab4-72e0-4377-b3db-d41da718bef9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:44.836726+08
47985859-159f-4a62-9300-f14177f76e84	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:45.681011+08
2ce3673b-914a-48fa-96f9-babe61868cd1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.085315+08
83c07d57-f937-48ab-8c21-af641d5fba96	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:46.58059+08
ce15c722-1b25-4273-adc4-cc8a8a4980e9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:47.723327+08
8a83895a-b8d2-4823-8858-c5214b805150	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:48.396777+08
992c51cc-6965-439f-9199-45b317152909	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.146969+08
5b271989-59ec-41b9-8280-8a3e7cefc041	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:49.728543+08
cb3e641c-d5ef-49f7-bbfa-3a5d912c584d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.254863+08
9aeaecb0-83d4-49b2-ae84-deeacca4d12e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:51.780822+08
97c20112-1eaf-4cc1-a3bd-c759a0581a0f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:53.077353+08
d46894bf-7e79-4d4b-9274-853a8739f655	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:53.745098+08
39c301fb-7775-48c3-af9f-bdef9f8ef804	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:54.666848+08
3b9916f3-7a65-4aec-a595-1b025b37cc40	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:40:55.847918+08
a0f4f690-eed4-4107-8357-88b81398ae45	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.132239+08
4a99289a-c279-482f-b968-5c57644f81cc	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.209553+08
455d80d5-5a5b-4b26-956d-17cc0263e288	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.463125+08
4e8ba938-c288-4641-b5ad-d132daab09f3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.632064+08
4cce4f8e-52d3-4563-9db2-cc60d73cd955	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.752048+08
bf08dc4a-fc50-4871-b2b3-aeee833dda3b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:01.23342+08
1cf42ac9-4b4d-4ffc-ae94-43cee833f8c0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:02.226579+08
0a5ffe65-ba29-4f98-afcd-6d05b41a23d0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.028582+08
34b1379e-f602-418e-b28f-36f05592d0d3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.590727+08
174e4a13-35a6-47fb-9fe6-86b4b782d7a3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.984806+08
c98c57f9-99db-4969-ba3c-fe10cf2539c5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.482666+08
fb89761c-1e18-49db-a368-974d1571387b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.054162+08
81dec89c-59df-4c7e-81d5-f8c409fe8928	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.594374+08
eb87bcbf-b677-43da-a7db-74519d54498f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.415244+08
93e5dbda-fd29-4e26-96ac-d649366fd240	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.877979+08
05edc9d2-458c-4267-bf38-218daacf4ae0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.556489+08
6a6d3a56-f86b-4286-b820-c68c5dd082e1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:37.267482+08
243b193f-a60b-415f-a9cc-61f87a069bcd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:54.875631+08
e6e366be-a07f-4082-90c3-616a608eadfb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.812083+08
ee3f7dae-4ad1-4f14-ad81-e1ad5c919f8b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:01.684673+08
b538d0fa-e4a5-413a-af63-9a91d0e3ec55	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:02.420481+08
f31df78d-bc36-49cb-8aec-3920c795dfe4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.152085+08
1614ec74-d3b5-4bf7-9f7e-93254ee2341c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.715653+08
45a943b3-03aa-454b-a824-8b83dea99586	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:04.690654+08
8d585dc1-01cb-4c5b-8889-ac00217b2af1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.624818+08
983f1f99-b8b1-49e9-bc74-2b9a7401fc8a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.181641+08
9d56d6ce-747c-419e-8cf9-6589df6e9588	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.907858+08
d4df9edf-284f-4aa6-b62d-0e967cba8906	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.567693+08
1fad027b-cc4d-4bb5-b7b4-acd4a128e0a3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.115095+08
9f787519-1a59-4094-bd05-78c7329324dd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.748584+08
d2c016a6-0719-4727-9ca9-f079c7649dee	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:40.234404+08
f7c8e0a4-bf3d-4197-80be-869a950732ac	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:42:10.242003+08
51cdff7a-bdd9-45bd-bdb5-34f0e7a1e6be	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:00.929684+08
98528b87-95f1-40d2-beec-7b61bac7e99c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:01.874989+08
dfbb6b3c-8c4c-4e82-a346-5fffda234fdd	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:02.610027+08
02e62398-06ea-4bee-a8b6-f0d1b85aaa07	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.204711+08
c778550a-ca8e-47a6-bcd5-420907204aa4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.794205+08
ea443384-5d06-46b3-9b3e-401f139ee5ff	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.23073+08
b9be6a90-caa9-45fc-ac18-f0e3621a84e0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.703876+08
4f5daf89-566d-4db4-a260-f7d5b50cc267	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.390846+08
3dd77c80-36c9-43e6-a662-f009b4932ba7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.026648+08
f6217bcf-41b5-4ffa-ae38-558c0e7a5730	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.65092+08
ba950b2f-fd45-4ed6-adc0-51d63dc74311	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.274735+08
93c8c7ef-6fa3-4cb8-83e1-fa76a7e5bcad	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.841047+08
088d3051-1629-4d25-a8d1-d85e6bd88275	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:01.040415+08
5c79de24-1f54-45b3-bcc9-adfa5470cc2c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:02.062742+08
4aa87440-9ad3-4ec4-8d04-6377ee30b859	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:02.830259+08
4304e3bf-4d6e-4080-be95-98944bc0ff01	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.418332+08
33491673-9ebc-4911-a316-00d945e82d17	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:03.923947+08
9295a153-c430-45e5-9256-786b740a6e93	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.385195+08
0b980d92-fbfe-4431-ba7c-b8ca08e69203	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:05.912515+08
cc9cef67-3162-4965-857b-3cac7c5a9945	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:06.54704+08
fc4b3d59-056e-4add-8c05-e90b009ef660	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.323914+08
c27449e7-961f-4822-8336-9292da9e1db9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:07.802001+08
ff93303d-225e-45c7-875c-d7efef5caa0f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:08.485483+08
826cb1a1-d32f-482b-9056-f7e2270bc8a9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:09.161753+08
4e649aca-d8e9-4861-9bef-300848e7e83d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:41:37.172449+08
e1c9b531-c7ed-4af0-ad4d-f7bf575398c3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:49:24.999272+08
c487ff00-d632-4d8c-bb85-f29ab6a6996b	visitor	\N	other	其他	操作 /setup/install		\N	2026-06-04 12:49:40.87086+08
353f85e5-73a5-447a-8869-1aba2d466519	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:49:41.627066+08
cd204df0-7ece-45e9-adc1-18f5277c258f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:50:57.071153+08
bc561892-b9d9-4a50-ae99-196637a08e3e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:53:13.666169+08
582e5474-2cbe-40ba-b07f-9c3c7dd2c572	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:53:13.788988+08
fae35833-971c-42df-85da-a82b31df1d21	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 12:53:16.331193+08
e75a2230-5701-4178-81c7-930b4521de11	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 12:53:37.798631+08
135d5b4a-e380-4746-99c4-a8f25689017f	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:53:45.506946+08
904385db-42b9-4ffa-9fa5-ed3a8928e34a	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:53:46.955127+08
febb85b6-cfcc-415f-8296-4c4c2a8ad4d3	visitor	\N	other	认证	操作 /auth/send-reset-code		\N	2026-06-04 12:53:51.472443+08
743cd7b0-4ae7-4325-ab75-0d2255bb1b83	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:32.442897+08
ff5172d7-89a5-412c-93a2-d770275bc4d1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:32.601089+08
bf74de54-508b-4f58-9d0c-caa3ea347605	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:56:48.39083+08
4ec34623-695b-498f-b47f-e29939ced234	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:48.443926+08
3a0bafed-6f39-4de5-83f4-aa952fa0be56	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:48.905888+08
524adec5-3ada-4e71-b8f4-5365cd3100c4	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:56:51.349628+08
8ca28b66-7b63-4a7e-9d68-f02ec1c52d61	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:51.363964+08
1a671bce-cc46-4b4b-9c91-5385225a7d9c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:51.448539+08
98cc9ceb-f561-44d2-9b06-cb3c2ff1e69f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:55.066485+08
073101db-8682-4f67-8772-eccb3629723c	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:56:55.06846+08
717e291f-f7e4-4817-aff0-36c6e769ea12	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:56:55.153247+08
4771e4c5-22ce-4975-b65e-a464f5c32794	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:57:16.693264+08
9f13ffaa-9340-4140-af63-5ef2bdc084d8	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:57:16.693475+08
28c6009e-450e-441f-9838-ddc59b4413ff	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:57:16.778796+08
6ffed31a-6bee-4594-a2d2-44e4b72e2dd3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:58:22.218373+08
c9629540-a9e3-4feb-8abb-d00cb9eb94b0	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:59:17.891355+08
19e975ba-4c24-4dd7-8d4f-efe1e68a3688	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:59:17.925447+08
2afc914c-30e4-4541-8ff4-36044fb7ddb2	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 12:59:18.2749+08
9d54f40e-30d3-4620-9dfa-2f74c2df4d89	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 12:59:18.278954+08
524538ef-b18e-4ceb-bf68-c7dd1783558f	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 12:59:20.564556+08
b0138fb6-8f6c-4465-837c-dd749e7171b6	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:09.50168+08
e6ef2b27-dacd-4f28-bda8-8599d27ee5b7	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:09.758384+08
e7e28c0b-7ca9-470c-ae4a-11889fc35a40	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:10.838755+08
328d2278-394e-4026-abb0-0c744640d8f2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:10.840662+08
7508719a-fe78-432b-a32f-105cc5a061a3	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:42.66172+08
19b9b467-edec-47ba-a686-45bc54f47072	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:42.668556+08
f2333cfd-4597-4855-9204-6c362aa9d5c9	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:43.566342+08
47d930a1-4c45-4208-9bab-0e537b8e8a30	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:43.568838+08
65269eb6-4271-45e6-ae54-8c3735301d88	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:44.582019+08
f1eab581-631f-45fe-9672-b5502fbaa134	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:44.589769+08
0e58bfd7-cbc8-4911-9a04-db6b4b7a0362	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:06:48.087725+08
313e20a6-cc34-488d-ae9c-9425f9edc0ea	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:06:48.135315+08
40dacde5-8145-4415-8dbd-d744dc9562c9	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:07:02.935236+08
67982071-025b-4177-8fa6-be81b0adf5af	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:07:02.937452+08
13db191a-d918-44dd-833a-9ceca9783689	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:07:04.852624+08
badb00f0-b65d-435f-9d6f-59ccdb7e46a3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:07:04.864721+08
d2422cb5-72ec-4573-b2e8-bbfd0de08007	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:07:16.522078+08
8e07f396-68c0-4ed5-8119-3aa20f687208	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:07:16.533889+08
82f84930-6b42-4a5b-9910-f81419d78973	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:07:19.620568+08
c978b3d4-f5b7-46b2-b926-e97ddebdce67	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:07:19.629757+08
8039acec-6f4a-4da6-977a-f4a5e0ac19b9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:08:04.865816+08
d9f6cad3-9bec-4616-b520-2cee68a15b37	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:10:44.366001+08
94e8f3ba-9c21-4932-b12a-0484bd76aaba	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:10:44.643298+08
8c035871-390d-4e12-a148-788d8f608493	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:11:14.177968+08
e050bd18-8ae5-40ea-9d94-126c89a45199	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:12:18.367428+08
9f012fd4-305c-4dd9-b451-cd8f7654b95c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:18.401127+08
f1779378-1549-4fef-a2be-3f3e2dde8599	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:19.344457+08
1110ce54-a162-459f-8c9e-6fb2a9a8037a	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:12:19.346083+08
38aad227-a8db-44df-95ef-767761118847	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:30.849789+08
7e43a1b2-e5b1-4ab1-bb90-a586a23b971d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:30.853735+08
6127a849-27e9-4378-ae2a-4892b4147813	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:39.895489+08
715da441-f026-44a0-a8a2-b20baf55d932	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:45.046572+08
15703f2d-ca8c-4767-ba3b-3fd505bf19c1	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:12:47.802926+08
9c513f4e-395b-400a-9f8b-2916ea12a582	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:14:36.232889+08
bef07d11-10e2-438f-91f3-1e8b056da317	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:16:35.828465+08
1c8d2f28-c8ab-4e8b-9379-17ae46bd1b55	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:12:47.752855+08
5bc86036-e7fc-411f-a589-4d745bd44f42	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:13:19.245046+08
147a7311-7c5f-42c7-94be-eeda164e885b	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:13:04.576945+08
0cb3153e-1867-4187-be4e-5617cb541953	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:13:04.577657+08
bad082fa-7ee5-40fe-88fd-d3c8a378ca95	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:13:12.176779+08
a11b245b-9a30-40b8-99c6-9910bb5e1ee0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:18:31.426741+08
a46ba4c1-8f73-476e-8068-93bcc39ae88e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:18:52.890396+08
3182bf49-511f-4c05-8ff8-9e8c0130e8eb	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:20:01.738124+08
505d4fd1-47f1-4c44-9a78-a2c8c6a48c6e	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:20:01.900512+08
1ffcd9f4-c372-4314-832d-5b4204c2b3a4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:20:06.060275+08
6f0eb488-2154-48ac-b9c0-ca9bf7f7db5e	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:20:06.145139+08
0dd911cf-9795-422c-8d9e-8f3fee4dd149	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:20:20.265291+08
2c39d7e3-1874-4f8b-8b21-22f3478ba66a	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:21:45.083482+08
5b5f8e84-9d8a-4215-a018-5b028410ff93	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:21:45.123049+08
8fe6d7dd-d87e-478f-8380-41e25cd8dcd9	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:21:46.627803+08
68bf724e-ada4-4bba-b885-5be2c466669d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:21:46.629338+08
04f4d8ce-ccb9-4173-a2dc-55a6ffbc21d9	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:21:53.24862+08
5de09371-ce36-4810-8c0e-46b7183e9b42	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:21:53.250511+08
c2136dd8-14ee-4d70-81d2-edf454a892e5	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:21:55.88468+08
3886bc34-cd98-406c-a41d-2cd758a0bb18	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:21:55.890144+08
0e7bf695-1cb8-420b-bbd4-f0d3c24c7f0e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:23:32.643063+08
65d01d33-253c-4c01-a669-d25f49715e9a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:24:12.248934+08
d4c0c232-f38c-4539-bf01-85e7b574096d	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:24:20.952596+08
fee6348d-be08-47e0-baf6-79cbc369d262	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:24:43.613933+08
44afac38-3892-4484-af0d-fcae2842eb79	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:24:47.915481+08
46724d09-c978-4678-ad8a-1f71f7283474	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:25:24.959257+08
444bc84e-57a0-483c-88bf-e81b9804242c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:25:51.32798+08
c0063353-05e0-46b4-90e8-c9b526130b6f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:25:51.704552+08
3f6f473e-b343-4e77-8128-f9f829341929	visitor	\N	other	其他	操作 /setup/install		\N	2026-06-04 13:26:16.568283+08
c365cf3b-c93f-436b-9296-6966bc3aab1c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:26:17.658237+08
3acd1993-8e75-4107-8aac-47761c955d2f	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:26:17.780474+08
c0fa4cbc-aab4-45e6-8568-9314adde4b70	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:26:20.069114+08
d9b1672d-bec3-4add-a42c-70930fd74242	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:26:21.357481+08
d703a4f7-6e43-4cd1-98cd-f00c31b24657	visitor	\N	other	其他	查看 /oauth/config		\N	2026-06-04 13:26:21.458887+08
ea53d329-158f-4ea8-8ccb-fff89825e5d6	visitor	\N	login	认证	登录系统 (admin@example.com)		\N	2026-06-04 13:27:05.001982+08
afb4631e-ba3a-4dbf-b3b7-4dcdc00ffb67	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:27:44.96517+08
f1865ee0-41a6-4b71-9f34-af3b4f219ac7	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:28:07.502559+08
ddadc204-f11b-4f5f-90c5-e0072d8e3e31	visitor	\N	login	认证	登录系统 (3230649356@qq.com)		\N	2026-06-04 13:28:13.032085+08
4e6dd4ca-0cd3-4fcb-983c-968a43a1d6f3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:28:34.760766+08
fc9df0cd-01e6-4bbb-9082-f43ab5fc2b01	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:28:34.854745+08
b1848815-3e2d-4c4f-8402-c9280598248e	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:28:50.806945+08
fe57d636-bacd-49f8-99ad-6571d0b1afd4	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:28:50.887119+08
83decfbc-2330-429e-8c22-7f6848cd9a62	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:29:10.320432+08
341b838e-e617-4bbc-b7e4-4a066b0f8f07	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:29:10.41182+08
19a96a35-7934-44db-8ea6-53caeeb19025	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 13:29:41.366968+08
0aa920bc-227d-4317-9a8a-237b39f622c3	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:03:13.688467+08
fa52f018-b78f-43f8-8023-ed8b2aa1cc23	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:03:13.789046+08
44a2fef3-22a8-4420-8158-6aad3ae30262	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:03:15.261057+08
4aca948f-a8c6-4775-98ce-44a62f642b80	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:03:15.351557+08
5b612b9e-e07a-4cee-99c2-d4235691d2f0	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:24:01.034397+08
1efdcd02-7712-4c10-9a31-db0c4207ddd2	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:24:01.225507+08
94918af1-4342-45bd-9d4c-688452da1998	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:24:14.133536+08
9736efad-e624-4bde-88b8-b6b4c70aba7f	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:24:14.242097+08
99cd0fdf-fec1-4898-940c-51a5a41ab35a	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:34.481629+08
d05fe61a-6b96-41c3-abdc-a775aee58635	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:34.668325+08
723f141b-b02c-4c77-b964-3dd07a1f85ce	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:37.236562+08
84446c2b-461d-49ef-b04b-457b253c3e45	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:37.320418+08
12ff7016-7115-473f-b216-1cf454bceb8c	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:39.336725+08
e3cbfb71-6f4c-48f8-b19e-c19e724229db	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:27:39.438883+08
0bbb1df3-2113-43c8-aee3-c20f1f466280	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:29:52.032613+08
063ee838-4ed7-4ab5-820b-f69e734ef7a9	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:29:52.156764+08
51443e8f-0639-4de4-bb5c-455b88086c51	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:29:53.5519+08
e8801b99-72af-4297-ada3-1767f1d34859	visitor	\N	other	其他	查看 /setup/status		\N	2026-06-04 14:29:53.668266+08
b60f6e83-09ff-4cd4-ad3f-b4b413397d3e	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:30:54.622032+08
17defae4-80c2-42af-9a53-8a3fd71aeafd	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:30:54.776133+08
cdf5f50c-813e-4571-aea0-decead97660d	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:30:56.712065+08
d544078f-724e-47da-b319-1bbf1364408a	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:31:06.243511+08
656b9eb0-6f95-4940-affd-64e2a0165670	visitor	\N	login	认证	登录系统 (admin@kamism.com)		\N	2026-06-04 15:31:06.646139+08
123da8da-f1ba-4ad7-9f16-fb6bb929fe9c	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:32:13.974585+08
bf41ed51-a7d4-449f-8d21-3fd12ff9bbcd	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:32:18.125645+08
c7167835-a7c9-4d55-ad87-0128f78275cb	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:32:18.210215+08
b60ba9bf-180a-4cfb-bf00-6bd5e9587a91	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:46:53.734734+08
543983e8-c8f2-422b-8f52-d4f576cf7493	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:47:03.181813+08
1bc92cff-373c-4be9-aacd-93b554d955aa	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:49:25.675244+08
ba149aa7-e5d0-4849-bf27-33bae4a161c7	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:51:06.345886+08
d2080652-b001-4f43-a2fe-6cab5fc11133	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:57:34.954417+08
85ca2834-70e0-4b5f-a320-d18e59a90513	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 15:58:12.142351+08
bfc19d48-4e66-4915-a6c1-0867ae87e517	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:15:27.572201+08
ec1934d6-9e9d-4dd8-bc23-69788c94cc66	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:35.802695+08
af6f0698-bec0-45fe-a101-efd2de860eca	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:42.209779+08
1adf24de-6d3c-4bb5-b326-23603658c2cc	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:46.399785+08
1a52c82d-e0ca-4702-9414-5d78a170937d	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:50.218516+08
a3bc91c1-514c-48f6-b8a0-0934ebaa512c	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:22:41.862562+08
6bb07ba7-5e19-4a7b-8847-681fe4453026	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:44.148157+08
ab146778-f399-4fba-a90e-7ac078c2678a	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:53.760599+08
82a77ca5-4220-4149-a36c-881036d04694	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:25:01.059585+08
83b20c66-d74c-4409-8ca9-4a1d2e726da8	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:38.199698+08
64655c7f-22d6-40e2-8fed-c181be2c23c1	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:44.631374+08
3b91a45d-376b-4726-a660-9895a5dd7a3d	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:16:47.170572+08
47f1bc29-86da-4c6a-b0c0-95674fd99231	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:18:28.034762+08
2e74011c-fd12-4cd5-b877-6cd4263599c2	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:32.060784+08
0de2ff18-182d-4fb3-aec6-0a2ae2789385	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:33.431489+08
7ed211db-72e9-4bfd-ab9d-b8bcd261823a	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:55.811252+08
016603fc-58b2-44ff-868a-6f9406534be5	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:24:01.315071+08
e29e7d25-44d2-457e-a877-2b8283569ab2	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:24:39.798725+08
af244d19-3f5a-497a-8445-61dd957f52a9	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:24:58.680034+08
de7b5053-7136-4c3e-880b-8cd6d47ed88b	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:25:01.375285+08
3c92734d-8ac9-4a5c-9cb0-44ad65f61652	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:17:06.749488+08
9693824f-06a7-4068-a52b-777fe8213d63	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:19:55.282808+08
7b81c5b2-f52e-429a-bf67-71bc74ae08ec	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:21:24.841869+08
1e13612b-8c55-45b9-a2a0-6db4f1d29679	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:44.063777+08
4d48158d-9bf6-4e35-aa00-c5b85eaa2967	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:53.670697+08
cebc88e2-b44e-452e-a7e1-b22023e0d9ac	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:27:25.615865+08
22232133-4771-4bd5-8409-7b45529f7b27	visitor	\N	other	其他	操作 /install/complete		\N	2026-06-04 16:22:29.528267+08
9f85cdea-267d-4173-a786-cc68ec569fcc	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:32.202232+08
cb09d284-4489-46a2-85e2-d9f0bd4860d7	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:22:34.908162+08
75749194-0d77-4bce-96f4-011348cac8d8	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:27:19.693951+08
3151d55a-d6f7-44bb-953b-8c7dc2c69660	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:27:25.357896+08
b474f063-258d-498c-9f00-9a66c39ce40b	visitor	\N	other	其他	查看 /install/status		\N	2026-06-04 16:39:49.86062+08
\.


--
-- Data for Name: plan_configs; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.plan_configs (id, plan, label, max_apps, max_cards, max_devices, max_gen_once, updated_at, price_monthly, price_quarterly, price_yearly, price_month, price_quarter, price_year, description, sort_order, is_active) FROM stdin;
3f964f75-855a-4538-b1fd-c3d1d4ec0acd	free	免费版	1	500	3	100	2026-06-04 02:25:59.03318+08	0.00	0.00	0.00	0	0	0		1	t
1bf9bd5c-7625-43c5-916d-ebe93a30209d	pro	专业版	-1	-1	100	1000	2026-06-04 02:25:59.03318+08	29.00	79.00	299.00	29	79	299		10	t
\.


--
-- Data for Name: recharge_cards; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.recharge_cards (id, code_hash, code_plain, plan, duration_months, status, merchant_id, redeemed_at, created_at) FROM stdin;
\.


--
-- Data for Name: recharge_codes; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.recharge_codes (id, code, plan, billing_cycle, duration_days, status, merchant_id, used_at, created_at, note) FROM stdin;
\.


--
-- Data for Name: redeem_codes; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.redeem_codes (id, code, code_hash, plan_code, duration_days, amount, status, used_by, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: risk_settings; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.risk_settings (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: system_config; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.system_config (key, value, updated_at) FROM stdin;
postgres_password	kamism	2026-06-04 03:36:57.846322+08
rabbitmq_password	kamism	2026-06-04 03:36:57.846322+08
jwt_secret	1234567890123456789012345678901234567890123456789012345678901234	2026-06-04 03:36:57.846322+08
master_key	1234567890123456789012345678901234567890123456789012345678901234	2026-06-04 03:36:57.846322+08
frontend_port	1420	2026-06-04 03:36:57.846322+08
rust_log	info	2026-06-04 03:36:57.846322+08
is_installed	true	2026-06-04 02:33:24.823595+08
merchant.enabled_features	["dashboard", "apps", "cards", "activations", "messages", "blacklist", "agents", "api_docs", "api_manage"]	2026-06-04 15:28:14.977785+08
mail.smtp	{}	2026-06-04 15:28:14.977785+08
install.runtime	{"rust_log": "info", "jwt_secret": "4k17154v5t4a6f4h260g13095q6f2c4i43021b4a1u0o6p38", "master_key": "452b10edba9c92151c6b2ed757f44d012447611d59bb1ff5b1498f0d04230791", "admin_email": "admin@example.com", "frontend_port": 1420, "postgres_password": "kamism", "rabbitmq_password": "kamism"}	2026-06-04 17:10:05.444407+08
install.completed	true	2026-06-04 17:10:05.955796+08
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.system_settings (key, value, updated_at) FROM stdin;
merchant_features	{"apps": true, "cards": true, "agents": true, "api_docs": true, "messages": true, "recharge": true, "blacklist": true, "dashboard": true, "api_manage": true, "activations": true}	2026-06-04 11:40:41.822413+08
smtp	{"from_name": "KamiSM", "smtp_host": "", "smtp_pass": "", "smtp_port": 465, "smtp_user": "", "from_email": ""}	2026-06-04 11:40:41.822413+08
\.


--
-- Data for Name: system_versions; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.system_versions (id, version_text, commit_hash, commit_message, updated_at) FROM stdin;
1	local version	local	local install version	2026-06-04 15:28:14.977785+08
\.


--
-- Data for Name: whitelist; Type: TABLE DATA; Schema: public; Owner: kamism
--

COPY public.whitelist (id, type, value, reason, created_at) FROM stdin;
\.


--
-- Name: api_call_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kamism
--

SELECT pg_catalog.setval('public.api_call_logs_id_seq', 1, false);


--
-- Name: encrypted_fields_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kamism
--

SELECT pg_catalog.setval('public.encrypted_fields_log_id_seq', 2, true);


--
-- Name: encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kamism
--

SELECT pg_catalog.setval('public.encryption_keys_id_seq', 1, false);


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public._sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: activation_alerts activation_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activation_alerts
    ADD CONSTRAINT activation_alerts_pkey PRIMARY KEY (id);


--
-- Name: activations activations_card_id_device_id_hash_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activations
    ADD CONSTRAINT activations_card_id_device_id_hash_key UNIQUE (card_id, device_id_hash);


--
-- Name: activations activations_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activations
    ADD CONSTRAINT activations_pkey PRIMARY KEY (id);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: agent_commission_logs agent_commission_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_commission_logs
    ADD CONSTRAINT agent_commission_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_quota_logs agent_quota_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_quota_logs
    ADD CONSTRAINT agent_quota_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_relations agent_relations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_relations
    ADD CONSTRAINT agent_relations_invite_code_key UNIQUE (invite_code);


--
-- Name: agent_relations agent_relations_parent_id_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_relations
    ADD CONSTRAINT agent_relations_parent_id_agent_id_key UNIQUE (parent_id, agent_id);


--
-- Name: agent_relations agent_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_relations
    ADD CONSTRAINT agent_relations_pkey PRIMARY KEY (id);


--
-- Name: api_call_logs api_call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.api_call_logs
    ADD CONSTRAINT api_call_logs_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: app_webhooks app_webhooks_app_id_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.app_webhooks
    ADD CONSTRAINT app_webhooks_app_id_key UNIQUE (app_id);


--
-- Name: app_webhooks app_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.app_webhooks
    ADD CONSTRAINT app_webhooks_pkey PRIMARY KEY (id);


--
-- Name: apps apps_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_pkey PRIMARY KEY (id);


--
-- Name: card_blacklist card_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_blacklist
    ADD CONSTRAINT card_blacklist_pkey PRIMARY KEY (id);


--
-- Name: card_usage_daily card_usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_usage_daily
    ADD CONSTRAINT card_usage_daily_pkey PRIMARY KEY (card_hash, date);


--
-- Name: card_usage_total card_usage_total_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_usage_total
    ADD CONSTRAINT card_usage_total_pkey PRIMARY KEY (card_hash);


--
-- Name: card_whitelist card_whitelist_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_whitelist
    ADD CONSTRAINT card_whitelist_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: custom_plans custom_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.custom_plans
    ADD CONSTRAINT custom_plans_pkey PRIMARY KEY (id);


--
-- Name: custom_plans custom_plans_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.custom_plans
    ADD CONSTRAINT custom_plans_plan_code_key UNIQUE (plan_code);


--
-- Name: device_blacklist device_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.device_blacklist
    ADD CONSTRAINT device_blacklist_pkey PRIMARY KEY (id);


--
-- Name: device_heartbeats device_heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.device_heartbeats
    ADD CONSTRAINT device_heartbeats_pkey PRIMARY KEY (id);


--
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- Name: encrypted_fields_log encrypted_fields_log_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encrypted_fields_log
    ADD CONSTRAINT encrypted_fields_log_pkey PRIMARY KEY (id);


--
-- Name: encrypted_fields_log encrypted_fields_log_table_name_record_id_field_name_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encrypted_fields_log
    ADD CONSTRAINT encrypted_fields_log_table_name_record_id_field_name_key UNIQUE (table_name, record_id, field_name);


--
-- Name: encryption_keys encryption_keys_key_id_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_key_id_key UNIQUE (key_id);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: ip_blacklist ip_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.ip_blacklist
    ADD CONSTRAINT ip_blacklist_pkey PRIMARY KEY (id);


--
-- Name: merchant_feature_switches merchant_feature_switches_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchant_feature_switches
    ADD CONSTRAINT merchant_feature_switches_pkey PRIMARY KEY (feature_key);


--
-- Name: merchant_topups merchant_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchant_topups
    ADD CONSTRAINT merchant_topups_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_api_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_api_key_hash_key UNIQUE (api_key_hash);


--
-- Name: merchants merchants_email_hash_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_email_hash_key UNIQUE (email_hash);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_username_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_username_key UNIQUE (username);


--
-- Name: message_reads message_reads_message_id_merchant_id_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_merchant_id_key UNIQUE (message_id, merchant_id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: oauth_settings oauth_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.oauth_settings
    ADD CONSTRAINT oauth_settings_pkey PRIMARY KEY (id);


--
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- Name: plan_configs plan_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.plan_configs
    ADD CONSTRAINT plan_configs_pkey PRIMARY KEY (id);


--
-- Name: plan_configs plan_configs_plan_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.plan_configs
    ADD CONSTRAINT plan_configs_plan_key UNIQUE (plan);


--
-- Name: recharge_cards recharge_cards_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_cards
    ADD CONSTRAINT recharge_cards_code_hash_key UNIQUE (code_hash);


--
-- Name: recharge_cards recharge_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_cards
    ADD CONSTRAINT recharge_cards_pkey PRIMARY KEY (id);


--
-- Name: recharge_codes recharge_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_code_key UNIQUE (code);


--
-- Name: recharge_codes recharge_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_pkey PRIMARY KEY (id);


--
-- Name: redeem_codes redeem_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.redeem_codes
    ADD CONSTRAINT redeem_codes_code_key UNIQUE (code);


--
-- Name: redeem_codes redeem_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.redeem_codes
    ADD CONSTRAINT redeem_codes_pkey PRIMARY KEY (id);


--
-- Name: risk_settings risk_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.risk_settings
    ADD CONSTRAINT risk_settings_key_key UNIQUE (key);


--
-- Name: risk_settings risk_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.risk_settings
    ADD CONSTRAINT risk_settings_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: system_versions system_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.system_versions
    ADD CONSTRAINT system_versions_pkey PRIMARY KEY (id);


--
-- Name: whitelist whitelist_pkey; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.whitelist
    ADD CONSTRAINT whitelist_pkey PRIMARY KEY (id);


--
-- Name: whitelist whitelist_type_value_key; Type: CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.whitelist
    ADD CONSTRAINT whitelist_type_value_key UNIQUE (type, value);


--
-- Name: idx_activations_activated_at; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_activations_activated_at ON public.activations USING btree (activated_at DESC);


--
-- Name: idx_activations_card_device_hash; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX idx_activations_card_device_hash ON public.activations USING btree (card_id, device_id_hash);


--
-- Name: idx_activations_card_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_activations_card_id ON public.activations USING btree (card_id);


--
-- Name: idx_activations_device_id_hash; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_activations_device_id_hash ON public.activations USING btree (device_id_hash);


--
-- Name: idx_activations_last_verified; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_activations_last_verified ON public.activations USING btree (last_verified_at DESC);


--
-- Name: idx_agent_invite_code; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_agent_invite_code ON public.agent_relations USING btree (invite_code);


--
-- Name: idx_agent_relations_agent; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_agent_relations_agent ON public.agent_relations USING btree (agent_id);


--
-- Name: idx_agent_relations_parent; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_agent_relations_parent ON public.agent_relations USING btree (parent_id);


--
-- Name: idx_alerts_merchant; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_alerts_merchant ON public.activation_alerts USING btree (merchant_id, created_at DESC);


--
-- Name: idx_alerts_unread; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_alerts_unread ON public.activation_alerts USING btree (merchant_id, is_read) WHERE (is_read = false);


--
-- Name: idx_api_call_logs_created; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_call_logs_created ON public.api_call_logs USING btree (created_at DESC);


--
-- Name: idx_api_call_logs_key_name; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_call_logs_key_name ON public.api_call_logs USING btree (key_name);


--
-- Name: idx_api_call_logs_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_call_logs_status ON public.api_call_logs USING btree (status);


--
-- Name: idx_api_keys_merchant_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_keys_merchant_id ON public.api_keys USING btree (merchant_id);


--
-- Name: idx_api_keys_name; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_keys_name ON public.api_keys USING btree (name);


--
-- Name: idx_api_keys_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_api_keys_status ON public.api_keys USING btree (status);


--
-- Name: idx_app_webhooks_app; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_app_webhooks_app ON public.app_webhooks USING btree (app_id);


--
-- Name: idx_app_webhooks_merchant; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_app_webhooks_merchant ON public.app_webhooks USING btree (merchant_id);


--
-- Name: idx_apps_id_merchant_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_apps_id_merchant_status ON public.apps USING btree (id, merchant_id, status);


--
-- Name: idx_apps_merchant_downgraded; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_apps_merchant_downgraded ON public.apps USING btree (merchant_id, downgraded) WHERE (downgraded = true);


--
-- Name: idx_apps_merchant_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_apps_merchant_id ON public.apps USING btree (merchant_id);


--
-- Name: idx_cards_app_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_app_id ON public.cards USING btree (app_id);


--
-- Name: idx_cards_code_hash; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_code_hash ON public.cards USING btree (code_hash);


--
-- Name: idx_cards_code_hash_merchant_app; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX idx_cards_code_hash_merchant_app ON public.cards USING btree (code_hash, merchant_id, app_id);


--
-- Name: idx_cards_merchant_created; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_merchant_created ON public.cards USING btree (merchant_id, created_at DESC);


--
-- Name: idx_cards_merchant_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_merchant_id ON public.cards USING btree (merchant_id);


--
-- Name: idx_cards_merchant_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_merchant_status ON public.cards USING btree (merchant_id, status);


--
-- Name: idx_cards_status_expires; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_cards_status_expires ON public.cards USING btree (status, expires_at) WHERE (((status)::text = 'active'::text) AND (expires_at IS NOT NULL));


--
-- Name: idx_commission_agent; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_commission_agent ON public.agent_commission_logs USING btree (agent_id, created_at DESC);


--
-- Name: idx_commission_parent; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_commission_parent ON public.agent_commission_logs USING btree (parent_id, created_at DESC);


--
-- Name: idx_commission_relation; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_commission_relation ON public.agent_commission_logs USING btree (relation_id);


--
-- Name: idx_encrypted_fields_log_table; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_encrypted_fields_log_table ON public.encrypted_fields_log USING btree (table_name, record_id);


--
-- Name: idx_encryption_keys_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_encryption_keys_status ON public.encryption_keys USING btree (status);


--
-- Name: idx_heartbeats_device; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_heartbeats_device ON public.device_heartbeats USING btree (device_id_hash);


--
-- Name: idx_heartbeats_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_heartbeats_status ON public.device_heartbeats USING btree (status);


--
-- Name: idx_merchants_api_key_hash; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX idx_merchants_api_key_hash ON public.merchants USING btree (api_key_hash);


--
-- Name: idx_merchants_email_hash; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX idx_merchants_email_hash ON public.merchants USING btree (email_hash);


--
-- Name: idx_merchants_plan_expires; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_merchants_plan_expires ON public.merchants USING btree (plan, plan_expires_at) WHERE (((plan)::text = 'pro'::text) AND (plan_expires_at IS NOT NULL));


--
-- Name: idx_merchants_provider_key; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX idx_merchants_provider_key ON public.merchants USING btree (provider_key) WHERE (provider_key IS NOT NULL);


--
-- Name: idx_message_reads_merchant; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_message_reads_merchant ON public.message_reads USING btree (merchant_id);


--
-- Name: idx_message_reads_message; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_message_reads_message ON public.message_reads USING btree (message_id);


--
-- Name: idx_messages_expires_at; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_expires_at ON public.messages USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_messages_pinned; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_pinned ON public.messages USING btree (pinned) WHERE (pinned = true);


--
-- Name: idx_messages_pinned_created; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_pinned_created ON public.messages USING btree (pinned DESC, created_at DESC);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_target_id; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_target_id ON public.messages USING btree (target_id);


--
-- Name: idx_messages_type; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_messages_type ON public.messages USING btree (type);


--
-- Name: idx_op_logs_action; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_op_logs_action ON public.operation_logs USING btree (action);


--
-- Name: idx_op_logs_created; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_op_logs_created ON public.operation_logs USING btree (created_at DESC);


--
-- Name: idx_op_logs_user; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_op_logs_user ON public.operation_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_quota_logs_relation; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_quota_logs_relation ON public.agent_quota_logs USING btree (relation_id);


--
-- Name: idx_recharge_codes_merchant; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_recharge_codes_merchant ON public.recharge_codes USING btree (merchant_id);


--
-- Name: idx_recharge_codes_status; Type: INDEX; Schema: public; Owner: kamism
--

CREATE INDEX idx_recharge_codes_status ON public.recharge_codes USING btree (status);


--
-- Name: uq_card_blacklist; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX uq_card_blacklist ON public.card_blacklist USING btree (COALESCE((merchant_id)::text, 'global'::text), card_key);


--
-- Name: uq_card_whitelist; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX uq_card_whitelist ON public.card_whitelist USING btree (COALESCE((merchant_id)::text, 'global'::text), card_key);


--
-- Name: uq_device_blacklist; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX uq_device_blacklist ON public.device_blacklist USING btree (COALESCE((merchant_id)::text, 'global'::text), device_id_hash);


--
-- Name: uq_ip_blacklist; Type: INDEX; Schema: public; Owner: kamism
--

CREATE UNIQUE INDEX uq_ip_blacklist ON public.ip_blacklist USING btree (COALESCE((merchant_id)::text, 'global'::text), ip);


--
-- Name: activation_alerts activation_alerts_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activation_alerts
    ADD CONSTRAINT activation_alerts_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;


--
-- Name: activation_alerts activation_alerts_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activation_alerts
    ADD CONSTRAINT activation_alerts_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: activations activations_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activations
    ADD CONSTRAINT activations_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;


--
-- Name: activations activations_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.activations
    ADD CONSTRAINT activations_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: agent_commission_logs agent_commission_logs_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_commission_logs
    ADD CONSTRAINT agent_commission_logs_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;


--
-- Name: agent_commission_logs agent_commission_logs_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_commission_logs
    ADD CONSTRAINT agent_commission_logs_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES public.agent_relations(id) ON DELETE CASCADE;


--
-- Name: agent_quota_logs agent_quota_logs_relation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_quota_logs
    ADD CONSTRAINT agent_quota_logs_relation_id_fkey FOREIGN KEY (relation_id) REFERENCES public.agent_relations(id) ON DELETE CASCADE;


--
-- Name: agent_relations agent_relations_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_relations
    ADD CONSTRAINT agent_relations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: agent_relations agent_relations_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.agent_relations
    ADD CONSTRAINT agent_relations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: app_webhooks app_webhooks_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.app_webhooks
    ADD CONSTRAINT app_webhooks_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;


--
-- Name: app_webhooks app_webhooks_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.app_webhooks
    ADD CONSTRAINT app_webhooks_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: apps apps_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: card_blacklist card_blacklist_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_blacklist
    ADD CONSTRAINT card_blacklist_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: card_whitelist card_whitelist_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.card_whitelist
    ADD CONSTRAINT card_whitelist_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: cards cards_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;


--
-- Name: cards cards_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: device_blacklist device_blacklist_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.device_blacklist
    ADD CONSTRAINT device_blacklist_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: ip_blacklist ip_blacklist_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.ip_blacklist
    ADD CONSTRAINT ip_blacklist_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchants merchants_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.agent_relations(id) ON DELETE SET NULL;


--
-- Name: message_reads message_reads_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.admins(id) ON DELETE CASCADE;


--
-- Name: messages messages_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: recharge_cards recharge_cards_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_cards
    ADD CONSTRAINT recharge_cards_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: recharge_codes recharge_codes_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kamism
--

ALTER TABLE ONLY public.recharge_codes
    ADD CONSTRAINT recharge_codes_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 5LcaU72wJJpsLRNqDah69NpXWoMoT6cnIgcPZCt2M9W8GhOFd5ZikQnBdzzlbjr


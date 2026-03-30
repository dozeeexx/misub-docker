export const VPS_PUBLIC_THEME_PRESETS = {
  default: {
    key: 'default',
    label: '默认',
    layout: 'default',
    root: 'bg-[#f6f3ee] text-[#1f1b17] dark:bg-[#0b0f16] dark:text-slate-100',
    heroBadge: 'border-[#e4ddd0] bg-white/80 text-[#7b6e5f] dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300',
    heroTitle: 'text-[#1f1b17] dark:text-slate-100',
    heroText: 'text-[#6c5f52] dark:text-slate-400',
    statCard: 'border-[#eadfce] bg-white/70 shadow-[0_18px_40px_-28px_rgba(120,98,74,0.25)] dark:border-slate-800/70 dark:bg-slate-900/60',
    panel: 'border-[#e6dbc9] bg-white/82 shadow-[0_20px_48px_-34px_rgba(120,98,74,0.22)] dark:border-slate-800/70 dark:bg-slate-900/60',
    panelSoft: 'border-[#efe3d5] bg-[#fdf8f1] dark:border-slate-800 dark:bg-slate-900/60',
    pill: 'border-[#efe3d5] bg-[#fdf8f1] text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
    pillActive: 'border-[#1f1b17] bg-[#1f1b17] text-white shadow-lg shadow-black/10 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900',
    accentButton: 'border-[#d7c9b7] bg-[#1f1b17] text-white shadow-lg shadow-black/10 dark:border-slate-700/60 dark:bg-slate-100 dark:text-slate-900',
    nodeCard: 'border-[#efe3d5] bg-[#fdf8f1] dark:border-slate-800 dark:bg-slate-900',
    detailTable: 'text-[#1f1b17] dark:text-slate-200',
    backdrop: 'theme-default'
  },
  komari: {
    key: 'komari',
    label: 'Komari 风',
    layout: 'hero-split',
    root: 'bg-[#f2f6fb] text-slate-900 dark:bg-[#0b1222] dark:text-slate-100',
    heroBadge: 'border-sky-100 bg-white/90 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-300',
    heroTitle: 'text-slate-900 dark:text-slate-100',
    heroText: 'text-slate-600 dark:text-slate-400',
    statCard: 'border-sky-100/90 bg-white/92 shadow-[0_22px_50px_-30px_rgba(14,165,233,0.28)] dark:border-sky-900/40 dark:bg-sky-900/30 dark:shadow-[0_22px_50px_-30px_rgba(14,165,233,0.15)]',
    panel: 'border-sky-100/90 bg-white/92 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.15)] dark:border-sky-900/40 dark:bg-sky-900/30 dark:shadow-[0_24px_64px_-40px_rgba(14,165,233,0.15)]',
    panelSoft: 'border-sky-100/90 bg-gradient-to-br from-white via-sky-50/70 to-indigo-50/70 dark:border-sky-900/40 dark:bg-gradient-to-br from-sky-900/40 via-sky-800/30 to-indigo-900/30',
    pill: 'border-sky-100/90 bg-white/88 text-sky-700 shadow-sm shadow-sky-100/60 dark:border-sky-900/40 dark:bg-sky-900/30 dark:text-sky-300 dark:shadow-sm dark:shadow-sky-900/20',
    pillActive: 'border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/30 dark:border-sky-400 dark:bg-sky-400 dark:text-slate-900',
    accentButton: 'border-sky-200 bg-sky-500 text-white shadow-lg shadow-sky-500/20 dark:border-sky-700 dark:bg-sky-600 dark:shadow-lg dark:shadow-sky-600/30',
    nodeCard: 'border-sky-100 bg-white/95 shadow-[0_20px_40px_-30px_rgba(56,189,248,0.45)] dark:border-sky-900/40 dark:bg-sky-900/30 dark:shadow-[0_20px_40px_-30px_rgba(56,189,248,0.25)]',
    detailTable: 'text-slate-800 dark:text-slate-200',
    themeClass: 'vps-theme-komari',
    backdrop: 'theme-komari'
  },
  minimal: {
    key: 'minimal',
    label: '极简',
    layout: 'minimal',
    root: 'bg-white text-slate-900 dark:bg-[#0f141d] dark:text-slate-100',
    heroBadge: 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
    heroTitle: 'text-slate-900 dark:text-slate-100',
    heroText: 'text-slate-500 dark:text-slate-400',
    statCard: 'border-slate-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-none',
    panel: 'border-slate-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-none',
    panelSoft: 'border-slate-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-800/90 dark:shadow-none',
    pill: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    pillActive: 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900',
    accentButton: 'border-slate-200 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-700 dark:text-white',
    nodeCard: 'border-slate-200 bg-white shadow-none dark:border-slate-700 dark:bg-slate-800 dark:shadow-none',
    detailTable: 'text-slate-700 dark:text-slate-300',
    themeClass: 'vps-theme-minimal',
    backdrop: 'theme-minimal'
  },
  tech: {
    key: 'tech',
    label: '科技',
    layout: 'tech-grid',
    root: 'bg-[#f3f7fb] text-slate-900 dark:bg-[#050816] dark:text-slate-100',
    heroBadge: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300',
    heroTitle: 'text-slate-900 dark:text-slate-50',
    heroText: 'text-slate-600 dark:text-slate-400',
    statCard: 'border-cyan-200/80 bg-white/90 shadow-[0_22px_52px_-34px_rgba(6,182,212,0.26)] dark:border-cyan-400/20 dark:bg-[#0b1226]/96 dark:shadow-[0_22px_52px_-34px_rgba(6,182,212,0.28)]',
    panel: 'border-cyan-200/80 bg-white/90 shadow-[0_26px_60px_-36px_rgba(6,182,212,0.22)] dark:border-cyan-400/20 dark:bg-[#0b1226]/94 dark:shadow-[0_26px_60px_-36px_rgba(6,182,212,0.24)]',
    panelSoft: 'border-cyan-200/80 bg-gradient-to-br from-white via-cyan-50/70 to-blue-50/70 dark:border-cyan-400/20 dark:bg-gradient-to-br from-[#091122] via-[#0d1730] to-[#122044]',
    pill: 'border-cyan-200/80 bg-cyan-50/80 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-200',
    pillActive: 'border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 dark:border-cyan-300/40 dark:bg-cyan-300/90 dark:text-slate-950',
    accentButton: 'border-cyan-300 bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 dark:border-cyan-300/30 dark:bg-cyan-300/92 dark:text-slate-950 dark:shadow-lg dark:shadow-cyan-500/16',
    nodeCard: 'border-cyan-200/80 bg-white/95 shadow-[0_20px_45px_-30px_rgba(34,211,238,0.35)] dark:border-cyan-500/20 dark:bg-[#08101f] dark:shadow-[0_20px_45px_-30px_rgba(34,211,238,0.35)]',
    detailTable: 'text-slate-800 dark:text-slate-200',
    themeClass: 'vps-theme-tech',
    backdrop: 'theme-tech'
  },
  glass: {
    key: 'glass',
    label: '玻璃态',
    layout: 'glass-showcase',
    root: 'bg-[#e9f1ff] text-slate-900 dark:bg-[#0f172a] dark:text-slate-100',
    heroBadge: 'border-white/40 bg-white/30 text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:backdrop-blur-xl',
    heroTitle: 'text-slate-900 dark:text-slate-100',
    heroText: 'text-slate-600 dark:text-slate-400',
    statCard: 'border-white/34 bg-white/38 backdrop-blur-2xl shadow-[0_20px_46px_-32px_rgba(99,102,241,0.2)] dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-2xl dark:shadow-[0_20px_46px_-32px_rgba(99,102,241,0.12)]',
    panel: 'border-white/34 bg-white/38 backdrop-blur-2xl shadow-[0_22px_60px_-38px_rgba(99,102,241,0.2)] dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-2xl dark:shadow-[0_22px_60px_-38px_rgba(99,102,241,0.12)]',
    panelSoft: 'border-white/34 bg-white/34 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-2xl',
    pill: 'border-white/45 bg-white/46 text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:backdrop-blur-xl',
    pillActive: 'border-slate-900/80 bg-slate-900/90 text-white backdrop-blur-xl dark:border-white/20 dark:bg-white/15 dark:text-white',
    accentButton: 'border-white/40 bg-slate-900/85 text-white backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl',
    nodeCard: 'border-white/30 bg-white/35 backdrop-blur-2xl shadow-[0_22px_48px_-34px_rgba(148,163,184,0.45)] dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-2xl dark:shadow-[0_22px_48px_-34px_rgba(148,163,184,0.25)]',
    detailTable: 'text-slate-800 dark:text-slate-200',
    themeClass: 'vps-theme-glass',
    backdrop: 'theme-glass'
  }
};

export const VPS_PUBLIC_THEME_PREVIEW_CARDS = [
  {
    key: 'default',
    title: '默认',
    description: '延续 MiSub 现有公开页风格，平衡信息量与视觉层次。',
    previewClass: 'from-stone-100 via-white to-slate-100',
    accentClass: 'bg-stone-800'
  },
  {
    key: 'komari',
    title: 'Komari 风',
    description: '明亮卡片 + 分栏头图，适合做对外展示首页。',
    previewClass: 'from-sky-100 via-white to-indigo-100',
    accentClass: 'bg-sky-500'
  },
  {
    key: 'minimal',
    title: '极简',
    description: '弱化装饰，仅保留核心信息与节点展示。',
    previewClass: 'from-slate-50 via-white to-slate-100',
    accentClass: 'bg-slate-900'
  },
  {
    key: 'tech',
    title: '科技',
    description: '科技感十足的监控大屏风格，支持亮色和深色模式。',
    previewClass: 'from-slate-50 via-cyan-50 to-blue-50',
    accentClass: 'bg-cyan-500'
  },
  {
    key: 'glass',
    title: '玻璃态',
    description: '透明卡片与模糊背景，适合高颜值展示。',
    previewClass: 'from-indigo-100 via-white/90 to-sky-100',
    accentClass: 'bg-indigo-500'
  }
];

export const VPS_PUBLIC_THEME_SECTIONS = [
  { key: 'anomalies', label: '异常区' },
  { key: 'nodes', label: '节点列表' },
  { key: 'featured', label: '重点轮播' },
  { key: 'details', label: '明细表' }
];

export function resolveVpsPublicTheme(preset) {
  return VPS_PUBLIC_THEME_PRESETS[preset] || VPS_PUBLIC_THEME_PRESETS.default;
}

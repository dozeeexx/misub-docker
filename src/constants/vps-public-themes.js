export const VPS_PUBLIC_THEME_PRESETS = {
  default: {
    key: 'default',
    label: '默认',
    layout: 'default',
    root: 'bg-[#f7f6f1] text-[#1f1b17] dark:bg-[#0a0d14] dark:text-slate-100',
    heroBadge: 'border-[#e7e1d6] bg-white/80 text-[#8a7f70] dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300',
    heroTitle: 'text-[#1f1b17] dark:text-slate-100',
    heroText: 'text-[#6a5f54] dark:text-slate-400',
    statCard: 'border-[#e9e2d6] bg-white/70 dark:border-slate-800/70 dark:bg-slate-900/60',
    panel: 'border-[#e7e1d6] bg-white/80 dark:border-slate-800/70 dark:bg-slate-900/60',
    panelSoft: 'border-[#efe6db] bg-[#fdfaf6] dark:border-slate-800 dark:bg-slate-900/60',
    pill: 'border-[#efe6db] bg-[#fdfaf6] text-[#6a5f54] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
    accentButton: 'border-[#d9cdbd] bg-[#1f1b17] text-white dark:border-slate-700/60 dark:bg-slate-100 dark:text-slate-900',
    nodeCard: 'border-[#efe6db] bg-[#fdfaf6] dark:border-slate-800 dark:bg-slate-900',
    detailTable: 'text-[#1f1b17] dark:text-slate-200',
    backdrop: 'theme-default'
  },
  komari: {
    key: 'komari',
    label: 'Komari 风',
    layout: 'hero-split',
    root: 'bg-[#f0f7ff] text-slate-900',
    heroBadge: 'border-sky-200 bg-white/95 text-sky-800 backdrop-blur-sm',
    heroTitle: 'text-slate-900 font-semibold',
    heroText: 'text-slate-600',
    statCard: 'border-sky-200 bg-gradient-to-br from-white via-sky-50/30 to-white shadow-[0_8px_30px_rgba(14,165,233,0.12)] hover:shadow-[0_12px_40px_rgba(14,165,233,0.18)] transition-shadow duration-300',
    panel: 'border-sky-200 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 shadow-[0_8px_30px_rgba(14,165,233,0.1)]',
    panelSoft: 'border-sky-150 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/50 shadow-sm',
    pill: 'border-sky-200 bg-white/90 text-sky-700 shadow-[0_2px_8px_rgba(14,165,233,0.08)] hover:shadow-[0_4px_12px_rgba(14,165,233,0.15)] transition-shadow',
    accentButton: 'border-sky-300 bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-[0_4px_16px_rgba(14,165,233,0.28)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.38)] hover:scale-[1.02] transition-all duration-200',
    nodeCard: 'border-sky-200 bg-gradient-to-br from-white via-sky-50/40 to-white shadow-[0_8px_28px_rgba(14,165,233,0.15)] hover:shadow-[0_12px_38px_rgba(14,165,233,0.22)] transition-all duration-300 hover:-translate-y-0.5',
    detailTable: 'text-slate-800',
    themeClass: 'vps-theme-komari',
    backdrop: 'theme-komari'
  },
  minimal: {
    key: 'minimal',
    label: '极简',
    layout: 'minimal',
    root: 'bg-slate-50 text-slate-900',
    heroBadge: 'border-slate-200 bg-white/80 text-slate-600 backdrop-blur-sm',
    heroTitle: 'text-slate-900 font-medium',
    heroText: 'text-slate-600',
    statCard: 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200',
    panel: 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
    panelSoft: 'border-slate-150 bg-white shadow-sm',
    pill: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-colors',
    accentButton: 'border-slate-300 bg-slate-900 text-white shadow-[0_2px_8px_rgba(15,23,42,0.15)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.25)] hover:scale-[1.02] transition-all duration-200',
    nodeCard: 'border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5',
    detailTable: 'text-slate-700',
    themeClass: 'vps-theme-minimal',
    backdrop: 'theme-minimal'
  },
  tech: {
    key: 'tech',
    label: '科技',
    layout: 'tech-grid',
    root: 'bg-gradient-to-br from-slate-50 via-cyan-50/30 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100',
    heroBadge: 'border-cyan-300/40 bg-cyan-100/20 text-cyan-700 backdrop-blur-sm dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300',
    heroTitle: 'text-slate-900 dark:text-slate-50 font-semibold',
    heroText: 'text-slate-600 dark:text-slate-400',
    statCard: 'border-cyan-200/60 bg-white/90 shadow-[0_8px_30px_rgba(6,182,212,0.12)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.18)] transition-shadow duration-300 dark:border-cyan-500/20 dark:bg-slate-900/80 dark:shadow-[0_8px_30px_rgba(6,182,212,0.15)]',
    panel: 'border-cyan-200/60 bg-white/95 shadow-[0_8px_30px_rgba(6,182,212,0.1)] dark:border-cyan-500/20 dark:bg-slate-900/85 dark:shadow-[0_12px_40px_rgba(6,182,212,0.12)]',
    panelSoft: 'border-cyan-150 bg-gradient-to-br from-white via-cyan-50/40 to-white dark:border-cyan-500/15 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900',
    pill: 'border-cyan-200/50 bg-cyan-50/30 text-cyan-700 shadow-[0_2px_8px_rgba(6,182,212,0.08)] hover:shadow-[0_4px_12px_rgba(6,182,212,0.15)] transition-shadow dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300',
    accentButton: 'border-cyan-300 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_4px_16px_rgba(6,182,212,0.28)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.38)] hover:scale-[1.02] transition-all duration-200 dark:border-cyan-400 dark:from-cyan-500 dark:to-cyan-600',
    nodeCard: 'border-cyan-200/60 bg-white/95 shadow-[0_8px_28px_rgba(6,182,212,0.15)] hover:shadow-[0_12px_38px_rgba(6,182,212,0.22)] transition-all duration-300 hover:-translate-y-0.5 dark:border-cyan-500/20 dark:bg-slate-900/85 dark:shadow-[0_8px_28px_rgba(6,182,212,0.18)]',
    detailTable: 'text-slate-800 dark:text-slate-200',
    themeClass: 'vps-theme-tech',
    backdrop: 'theme-tech'
  },
  glass: {
    key: 'glass',
    label: '玻璃态',
    layout: 'glass-showcase',
    root: 'bg-gradient-to-br from-indigo-50 via-sky-50 to-indigo-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100',
    heroBadge: 'border-white/50 bg-white/40 text-slate-700 backdrop-blur-xl shadow-[0_4px_16px_rgba(255,255,255,0.28)] dark:border-slate-700/50 dark:bg-slate-800/40 dark:text-slate-200 dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
    heroTitle: 'text-slate-900 dark:text-slate-50 font-semibold',
    heroText: 'text-slate-600 dark:text-slate-400',
    statCard: 'border-white/40 bg-gradient-to-br from-white/50 via-white/35 to-white/45 backdrop-blur-2xl shadow-[0_8px_32px_rgba(99,102,241,0.12)] hover:shadow-[0_12px_48px_rgba(99,102,241,0.2)] transition-shadow duration-300 dark:border-slate-700/30 dark:bg-gradient-to-br dark:from-slate-800/40 dark:via-slate-900/30 dark:to-slate-800/40 dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
    panel: 'border-white/45 bg-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(99,102,241,0.15)] dark:border-slate-700/30 dark:bg-slate-900/50 dark:backdrop-blur-2xl dark:shadow-[0_12px_48px_rgba(0,0,0,0.35)]',
    panelSoft: 'border-white/35 bg-white/30 backdrop-blur-xl dark:border-slate-700/25 dark:bg-slate-900/30 dark:backdrop-blur-xl',
    pill: 'border-white/50 bg-white/45 text-slate-700 backdrop-blur-xl shadow-[0_2px_12px_rgba(255,255,255,0.25)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.35)] transition-shadow dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-300 dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
    accentButton: 'border-white/40 bg-gradient-to-r from-slate-900/90 to-slate-800/90 text-white backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all duration-200 dark:border-slate-600/40 dark:from-slate-800/90 dark:to-slate-700/90',
    nodeCard: 'border-white/35 bg-gradient-to-br from-white/45 via-white/30 to-white/40 backdrop-blur-2xl shadow-[0_8px_30px_rgba(148,163,184,0.15)] hover:shadow-[0_12px_42px_rgba(148,163,184,0.22)] transition-all duration-300 hover:-translate-y-0.5 dark:border-slate-700/25 dark:bg-gradient-to-br dark:from-slate-800/35 dark:via-slate-900/25 dark:to-slate-800/35 dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]',
    detailTable: 'text-slate-800 dark:text-slate-200',
    themeClass: 'vps-theme-glass',
    backdrop: 'theme-glass'
  },
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
    description: '明亮天蓝渐变 + 柔和阴影，清新通透的视觉效果。',
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
    key: 'tech-dark',
    title: '深色科技',
    description: '偏监控大屏与赛博仪表盘质感。',
    previewClass: 'from-slate-950 via-slate-900 to-cyan-950',
    accentClass: 'bg-cyan-400'
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

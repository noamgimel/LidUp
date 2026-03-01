import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, Flame, Thermometer, Snowflake, CheckCircle, XCircle } from 'lucide-react';
import { PRIORITY_CONFIG } from './LeadPriorityConfig';

// Priority tabs config
const priorityTabConfig = {
  all: {
    label: 'הכל',
    icon: Users,
    button: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    activeButton: 'ring-2 ring-offset-1 ring-blue-400 shadow-lg bg-blue-200',
    badge: 'bg-blue-200 text-blue-900 border-transparent',
    activeBadge: 'bg-white text-blue-800 border-blue-500'
  },
  overdue: {
    label: 'חורגים SLA',
    icon: AlertTriangle,
    button: PRIORITY_CONFIG.overdue.button,
    activeButton: PRIORITY_CONFIG.overdue.activeButton,
    badge: PRIORITY_CONFIG.overdue.badgeTab,
    activeBadge: PRIORITY_CONFIG.overdue.activeBadgeTab
  },
  hot: {
    label: 'חמים 🔥',
    icon: Flame,
    button: PRIORITY_CONFIG.hot.button,
    activeButton: PRIORITY_CONFIG.hot.activeButton,
    badge: PRIORITY_CONFIG.hot.badgeTab,
    activeBadge: PRIORITY_CONFIG.hot.activeBadgeTab
  },
  warm: {
    label: 'בינוניים',
    icon: Thermometer,
    button: PRIORITY_CONFIG.warm.button,
    activeButton: PRIORITY_CONFIG.warm.activeButton,
    badge: PRIORITY_CONFIG.warm.badgeTab,
    activeBadge: PRIORITY_CONFIG.warm.activeBadgeTab
  },
  cold: {
    label: 'קרים',
    icon: Snowflake,
    button: PRIORITY_CONFIG.cold.button,
    activeButton: PRIORITY_CONFIG.cold.activeButton,
    badge: PRIORITY_CONFIG.cold.badgeTab,
    activeBadge: PRIORITY_CONFIG.cold.activeBadgeTab
  }
};

// Lifecycle tabs
const lifecycleTabConfig = {
  open:  { label: 'פעילים', icon: Users,        button: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',  activeButton: 'ring-2 ring-offset-1 ring-blue-400 shadow-lg bg-blue-200',  badge: 'bg-blue-200 text-blue-900',  activeBadge: 'bg-white text-blue-800 border-blue-500' },
  won:   { label: 'נסגרו ✅', icon: CheckCircle, button: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200', activeButton: 'ring-2 ring-offset-1 ring-green-400 shadow-lg bg-green-200', badge: 'bg-green-200 text-green-900', activeBadge: 'bg-white text-green-800 border-green-500' },
  lost:  { label: 'לא רלוונטי ❌', icon: XCircle,  button: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',  activeButton: 'ring-2 ring-offset-1 ring-slate-400 shadow-lg bg-slate-200',  badge: 'bg-slate-200 text-slate-900',  activeBadge: 'bg-white text-slate-800 border-slate-500' }
};

export default function LeadFilterTabs({ activePriority, onPriorityChange, activeLifecycle, onLifecycleChange, counts }) {
  const priorityTabs = ['all', 'overdue', 'hot', 'warm', 'cold'];
  const lifecycleTabs = ['open', 'won', 'lost'];

  const renderTab = (key, config, isActive, onClick, count) => {
    const Icon = config.icon;
    return (
      <button
        key={key}
        onClick={() => onClick(key)}
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border whitespace-nowrap text-sm font-medium ${config.button} ${isActive ? config.activeButton : ''}`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'scale-110' : ''}`} />
        <span>{config.label}</span>
        {count > 0 && (
          <Badge variant="outline" className={`text-xs border ${isActive ? config.activeBadge : config.badge}`}>
            {count}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2 mb-4">
      {/* Priority filter row */}
      <div className="flex flex-wrap gap-2">
        {priorityTabs.map(key => {
          const cnt = key === 'all'
            ? (counts.priority?.overdue || 0) + (counts.priority?.hot || 0) + (counts.priority?.warm || 0) + (counts.priority?.cold || 0)
            : (counts.priority?.[key] || 0);
          return renderTab(key, priorityTabConfig[key], activePriority === key, onPriorityChange, cnt);
        })}
      </div>

      {/* Lifecycle filter row */}
      <div className="flex flex-wrap gap-2">
        {lifecycleTabs.map(key => {
          const cnt = counts.lifecycle?.[key] || 0;
          return renderTab(key, lifecycleTabConfig[key], activeLifecycle === key, onLifecycleChange, cnt);
        })}
      </div>
    </div>
  );
}

// Keep named export for backward compat
export { priorityTabConfig as statusConfig };
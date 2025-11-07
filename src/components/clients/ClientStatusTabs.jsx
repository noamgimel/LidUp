
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, Zap, CheckCircle, XCircle, Flame, Briefcase } from 'lucide-react';

const statusConfig = {
  all: {
    label: 'הכל',
    icon: Users,
    button: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 hover:border-blue-400',
    activeButton: 'ring-2 ring-offset-1 ring-blue-400 shadow-lg bg-blue-200',
    badge: 'bg-blue-200 text-blue-900 border-transparent',
    activeBadge: 'bg-white text-blue-800 border-blue-500',
    iconFillClass: 'fill-blue-800'
  },
  lead: {
    label: 'לידים',
    icon: Zap,
    button: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 hover:border-yellow-400',
    activeButton: 'ring-2 ring-offset-1 ring-yellow-400 shadow-lg bg-yellow-200',
    badge: 'bg-yellow-200 text-yellow-900 border-transparent',
    activeBadge: 'bg-white text-yellow-800 border-amber-500',
    iconFillClass: 'fill-yellow-800'
  },
  hot_lead: {
    label: 'לידים חמים',
    icon: Flame,
    button: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 hover:border-orange-400',
    activeButton: 'ring-2 ring-offset-1 ring-orange-400 shadow-lg bg-orange-200',
    badge: 'bg-orange-200 text-orange-900 border-transparent',
    activeBadge: 'bg-white text-orange-800 border-orange-500',
    iconFillClass: 'fill-orange-800'
  },
  client: {
    label: 'לקוחות',
    icon: Briefcase,
    button: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400',
    activeButton: 'ring-2 ring-offset-1 ring-green-400 shadow-lg bg-green-200',
    badge: 'bg-green-200 text-green-900 border-transparent',
    activeBadge: 'bg-white text-green-800 border-green-600',
    iconFillClass: 'fill-green-800'
  },
  inactive: {
    label: 'לא פעילים',
    icon: XCircle,
    button: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400',
    activeButton: 'ring-2 ring-offset-1 ring-slate-400 shadow-lg bg-slate-200',
    badge: 'bg-slate-200 text-slate-900 border-transparent',
    activeBadge: 'bg-white text-slate-800 border-slate-500',
    iconFillClass: 'fill-slate-800'
  }
};

export default function ClientStatusTabs({ activeTab, onTabChange, statusCounts }) {
  const tabs = ['all', 'lead', 'hot_lead', 'client', 'inactive'];

  const renderTab = (status) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    const isActive = activeTab === status;
    const count = status === 'all' ? 
      Object.values(statusCounts).reduce((sum, count) => sum + count, 0) : 
      statusCounts[status] || 0;

    return (
      <button
        key={status}
        onClick={() => onTabChange(status)}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-300 border whitespace-nowrap ${
          config.button
        } ${
          isActive ? config.activeButton : ''
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            isActive ? `${config.iconFillClass} scale-110` : 'fill-transparent group-hover:scale-105'
        }`}/>
        <span className={`font-medium text-sm transition-transform duration-200 ${
            isActive ? 'scale-105' : 'group-hover:scale-100'
        }`}>{config.label}</span>
        {count > 0 && (
          <Badge 
            variant="outline" 
            className={`text-xs transition-all duration-300 border ${isActive ? `${config.activeBadge} scale-110` : config.badge}`}
          >
            {count}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div className="mb-6">
      {/* Desktop Tabs */}
      <div className="hidden sm:block">
        <div className="flex flex-wrap gap-2">
          {tabs.map(renderTab)}
        </div>
      </div>

      {/* Mobile Tabs - Horizontal Scroll with improved spacing */}
      <div className="sm:hidden">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {tabs.map(renderTab)}
        </div>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}

// Export status config for use in other components
export { statusConfig };

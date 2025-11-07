import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subTitle, icon: Icon, colorScheme }) {
  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
    className: "rtl-text h-full"
  };

  const colors = {
    blue: {
      border: 'border-t-blue-500',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      valueText: 'text-blue-900',
    },
    green: {
      border: 'border-t-green-500',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      valueText: 'text-green-900',
    },
    purple: {
      border: 'border-t-purple-500',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      valueText: 'text-purple-900',
    },
  };

  const currentColors = colors[colorScheme] || colors.blue;

  return (
    <motion.div {...motionProps}>
        <Card className={`shadow-sm hover:shadow-lg transition-shadow duration-300 border-slate-200 border-t-4 ${currentColors.border} h-full`}>
            <CardContent className="p-3 md:p-5 rtl-text flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                    <p className="font-semibold text-slate-800 text-sm md:text-base">{title}</p>
                    <div className={`p-2 md:p-3 rounded-lg ${currentColors.iconBg}`}>
                        <Icon className={`w-4 h-4 md:w-6 md:h-6 ${currentColors.iconText}`} />
                    </div>
                </div>
                 <div className="text-right mt-3 md:mt-4">
                     <p className={`text-xl md:text-3xl font-bold ${currentColors.valueText}`}>{value}</p>
                     {subTitle && <p className="text-xs md:text-sm text-slate-500 mt-1">{subTitle}</p>}
                </div>
            </CardContent>
        </Card>
    </motion.div>
  );
}
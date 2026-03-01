import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { useToast } from "@/components/ui/use-toast";

/**
 * Props: leadId, currentWorkStage, onDone(stageId|null), onClose
 */
export default function WorkStagePrompt({ leadId, currentWorkStage, onDone, onClose }) {
  const { userWorkStages } = useUserWorkStages();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  // Show ALL active stages (including closed), sorted by order, current stage highlighted but still selectable
  const availableStages = userWorkStages
    .filter(s => s.is_active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const save = async (stageId) => {
    setIsSaving(true);
    setError(null);
    const stageLabel = userWorkStages.find(s => s.id === stageId)?.label || stageId;
    try {
      console.log("[WorkStagePrompt] updateWorkStage →", { action: "update stage", lead_id: leadId, stage_id: stageId });
      const res = await base44.functions.invoke("updateWorkStage", { lead_id: leadId, stage_id: stageId, stage_label: stageLabel });
      console.log("[WorkStagePrompt] updateWorkStage ←", res?.status, res?.data);
      const data = res?.data;
      if (!data?.ok) {
        setError(data?.error || "שגיאה בשמירת השלב. אנא נסה שוב.");
        return;
      }
      toast({
        title: "שלב עודכן",
        description: `שלב המכירה עודכן ל: ${stageLabel}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      onDone?.(stageId);
    } catch (err) {
      setError(err?.response?.data?.error || "שגיאה בשמירת השלב. אנא נסה שוב.");
    } finally {
      setIsSaving(false);
    }
  };

  // Color dot mapping
  const dotColor = (color) => {
    const map = {
      blue: "bg-blue-500", green: "bg-green-500", yellow: "bg-yellow-500",
      orange: "bg-orange-500", red: "bg-red-500", purple: "bg-purple-500",
      pink: "bg-pink-500", gray: "bg-slate-400"
    };
    return map[color] || map.gray;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm rtl-text z-10 max-h-[85vh] flex flex-col">
        <button onClick={onClose} className="absolute top-3 left-3 p-1 rounded-full text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">עדכן שלב מכירה</h3>
            <p className="text-xs text-slate-500">בחר את השלב הנוכחי בתהליך</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pb-2">
          {availableStages.map(stage => {
            const isSelected = selected === stage.id;
            const isCurrent = stage.id === currentWorkStage;
            return (
              <button
                key={stage.id}
                onClick={() => setSelected(stage.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-right transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : isCurrent
                    ? "border-slate-400 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor(stage.color)}`} />
                <span className="text-sm font-medium text-slate-800 flex-1">{stage.label}</span>
                {isCurrent && <span className="text-xs text-slate-400">נוכחי</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => onDone?.(null)}
            className="flex-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            לא עכשיו
          </Button>
          <Button
            onClick={() => selected && save(selected)}
            disabled={!selected || isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            {isSaving ? "שומר..." : "עדכן שלב"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
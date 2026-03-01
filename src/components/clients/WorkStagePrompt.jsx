import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";

/**
 * Props: leadId, currentWorkStage, onDone(stageId|null), onClose
 */
export default function WorkStagePrompt({ leadId, currentWorkStage, onDone, onClose }) {
  const { userWorkStages } = useUserWorkStages();
  const [isSaving, setIsSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  // All stages except closed ones
  const availableStages = userWorkStages.filter(s =>
    s.id !== "closed_won" &&
    s.id !== "closed_lost" &&
    s.is_active !== false
  );

  const save = async (stageId) => {
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Client.update(leadId, {
        work_stage: stageId,
        last_activity_at: new Date().toISOString()
      });
      await base44.entities.LeadActivity.create({
        lead_id: leadId,
        event_type: "stage_change",
        content: `שלב מכירה עודכן ל: ${userWorkStages.find(s => s.id === stageId)?.label || stageId}`,
        created_by_email: user?.email || ""
      });
      onDone?.(stageId);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm rtl-text z-10">
        <button onClick={onClose} className="absolute top-3 left-3 p-1 rounded-full text-slate-400 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">עדכן שלב מכירה</h3>
            <p className="text-xs text-slate-500">האם השלב השתנה לאחר הפנייה?</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {availableStages.map(stage => {
            const colorClass = getWorkStageColorClass(stage.color);
            const isSelected = selected === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setSelected(stage.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-right transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass.replace(/text-\S+/g, "").replace(/border-\S+/g, "")}`} />
                <span className="text-sm font-medium text-slate-800">{stage.label}</span>
              </button>
            );
          })}
        </div>

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
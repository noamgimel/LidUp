import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_WORK_STAGES } from "../utils/workStagesUtils";

export function useUserWorkStages() {
  const [userWorkStages, setUserWorkStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserWorkStages();
  }, []);

  const loadUserWorkStages = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user?.email) {
        setUserWorkStages(DEFAULT_WORK_STAGES);
        setIsLoading(false);
        return;
      }

      const records = await base44.entities.UserCustomWorkStages.filter({ user_email: user.email });
      console.log("[useUserWorkStages] fetched records:", records?.length, records?.[0]?.custom_work_stages?.length);

      if (records?.length > 0 && records[0].custom_work_stages?.length > 0) {
        const validStages = records[0].custom_work_stages.filter(s => s?.id && s?.label);
        setUserWorkStages(validStages);
      } else {
        setUserWorkStages(DEFAULT_WORK_STAGES);
      }
    } catch (error) {
      console.error("[useUserWorkStages] error:", error);
      setUserWorkStages(DEFAULT_WORK_STAGES);
    }
    setIsLoading(false);
  };

  const saveUserWorkStages = async (stages) => {
    try {
      const user = await base44.auth.me();
      if (!user?.email) throw new Error("Not authenticated");

      const validStages = stages.filter(s => s?.id && s?.label).map(stage => ({
        id: stage.id,
        label: stage.label,
        description: stage.description || "",
        color: stage.color || "blue",
        order: stage.order || 1,
        is_active: stage.is_active !== false
      }));

      const existing = await base44.entities.UserCustomWorkStages.filter({ user_email: user.email });
      const stageData = { user_email: user.email, custom_work_stages: validStages };

      if (existing.length > 0) {
        await base44.entities.UserCustomWorkStages.update(existing[0].id, stageData);
      } else {
        await base44.entities.UserCustomWorkStages.create(stageData);
      }
    } catch (error) {
      console.error("[useUserWorkStages] save error:", error);
      throw error;
    }
  };

  const addUserWorkStage = async (stageName, stageColor = 'blue', stageDescription = '') => {
    try {
      // בדיקה שהשם לא ריק
      const safeStageName = String(stageName || '').trim();
      if (!safeStageName) {
        throw new Error("Stage name cannot be empty.");
      }

      // יצירת שלב חדש עם ID ייחודי
      const newStage = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: safeStageName,
        description: String(stageDescription || '').trim(),
        color: stageColor,
        order: userWorkStages.length + 1,
        is_active: true
      };

      console.log('Creating new stage:', newStage);

      // עדכון המערך המקומי
      const updatedStages = [...userWorkStages, newStage];
      
      // שמירה במסד הנתונים
      await saveUserWorkStages(updatedStages);
      
      // עדכון ה-state המקומי
      setUserWorkStages(updatedStages);
      
      console.log('Stage created successfully:', newStage);
      return newStage;
      
    } catch (error) {
      console.error("Error adding work stage:", error);
      throw error;
    }
  };

  return { userWorkStages, isLoading, loadUserWorkStages, addUserWorkStage, saveUserWorkStages };
}
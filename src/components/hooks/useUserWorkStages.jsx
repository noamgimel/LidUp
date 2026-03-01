import { useState, useEffect } from "react";
import { UserCustomWorkStages } from "@/entities/UserCustomWorkStages";
import { User } from "@/entities/User";
import { DEFAULT_WORK_STAGES } from "../utils/workStagesUtils";

export function useUserWorkStages() {
  const [userWorkStages, setUserWorkStages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserWorkStages();
  }, []);

  const loadUserWorkStages = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const customWorkStages = await UserCustomWorkStages.filter({ user_email: user.email });
      
      if (customWorkStages.length > 0 && customWorkStages[0].custom_work_stages) {
        // Validate that all stages have required fields
        const validStages = customWorkStages[0].custom_work_stages.filter(stage => 
          stage && stage.id && stage.label
        );
        setUserWorkStages(validStages);
      } else {
        setUserWorkStages(DEFAULT_WORK_STAGES);
      }
    } catch (error) {
      console.error("שגיאה בטעינת שלבי מכירה:", error);
      setUserWorkStages(DEFAULT_WORK_STAGES);
    }
    setIsLoading(false);
  };

  const saveUserWorkStages = async (stages) => {
    if (!currentUser) return;
    
    try {
      // Validate and clean stages before saving
      const validStages = stages.filter(stage => 
        stage && 
        stage.id && 
        stage.label && 
        typeof stage.id === 'string' && 
        typeof stage.label === 'string'
      ).map(stage => ({
        id: stage.id,
        label: stage.label,
        description: stage.description || "",
        color: stage.color || "blue",
        order: stage.order || 1,
        is_active: stage.is_active !== false
      }));

      console.log('Saving work stages:', validStages);

      const existingRecord = await UserCustomWorkStages.filter({ user_email: currentUser.email });
      
      const stageData = {
        user_email: currentUser.email,
        custom_work_stages: validStages
      };

      if (existingRecord.length > 0) {
        await UserCustomWorkStages.update(existingRecord[0].id, stageData);
      } else {
        await UserCustomWorkStages.create(stageData);
      }
      
      // The calling function (addUserWorkStage) will update the state locally,
      // but if saveUserWorkStages is called directly, we should update state here.
      // For consistency with the requested change, `addUserWorkStage` will explicitly set state.
      // setUserWorkStages(validStages); // This line is not needed here if addUserWorkStage sets the state.
    } catch (error) {
      console.error("Error saving user work stages:", error);
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

  return { 
    userWorkStages, 
    isLoading, 
    loadUserWorkStages, 
    addUserWorkStage,
    saveUserWorkStages 
  };
}
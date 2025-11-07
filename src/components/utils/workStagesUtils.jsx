
export const DEFAULT_WORK_STAGES = [
  { 
    id: "initial_contact", 
    label: "פניה ראשונית", 
    description: "קשר ראשוני עם הלקוח",
    color: "gray", 
    order: 1,
    is_active: true
  },
  { 
    id: "consultation", 
    label: "שיחה/פגישת ייעוץ", 
    description: "פגישת היכרות וייעוץ ראשוני",
    color: "blue", 
    order: 2,
    is_active: true
  },
  { 
    id: "proposal_sent", 
    label: "הצעת מחיר", 
    description: "נשלחה הצעת מחיר ללקוח",
    color: "blue", 
    order: 3,
    is_active: true
  },
  { 
    id: "contract_stage", 
    label: "שלב חוזה", 
    description: "משא ומתן וחתימה על חוזה",
    color: "blue", 
    order: 4,
    is_active: true
  },
  { 
    id: "specification_stage", 
    label: "שלב אפיון", 
    description: "אפיון מפורט של הפרויקט",
    color: "blue", 
    order: 5,
    is_active: true
  },
  { 
    id: "development_stage", 
    label: "שלב פיתוח/עבודה", 
    description: "ביצוע והפיתוח של הפרויקט",
    color: "blue", 
    order: 6,
    is_active: true
  },
  { 
    id: "project_completion", 
    label: "סיום פרויקט", 
    description: "הפרויקט הושלם ונמסר",
    color: "green", 
    order: 7,
    is_active: true
  },
  { 
    id: "ongoing_service", 
    label: "שירות שוטף", 
    description: "מתן שירות תחזוקה ותמיכה",
    color: "green", 
    order: 8,
    is_active: true
  },
  { 
    id: "awaiting_response", 
    label: "ממתין לתגובה", 
    description: "ממתין לתגובה מהלקוח",
    color: "red", 
    order: 9,
    is_active: true
  }
];

export const getWorkStageColorClass = (color) => {
  const colorClasses = {
    blue: "bg-blue-600 text-white border-blue-700",
    green: "bg-green-600 text-white border-green-700",
    yellow: "bg-yellow-500 text-white border-yellow-600",
    orange: "bg-orange-600 text-white border-orange-700",
    red: "bg-red-600 text-white border-red-700",
    purple: "bg-purple-600 text-white border-purple-700",
    pink: "bg-pink-600 text-white border-pink-700",
    gray: "bg-slate-600 text-white border-slate-700"
  };
  return colorClasses[color] || colorClasses.gray;
};

export const DEFAULT_WORK_STAGES = [
  { 
    id: "new_lead", 
    label: "ליד חדש", 
    description: "ליד שנכנס למערכת ועדיין לא טופל",
    color: "gray", 
    order: 1,
    is_active: true,
    locked: false
  },
  { 
    id: "first_contact", 
    label: "נוצר קשר", 
    description: "יצרנו קשר ראשוני עם הליד",
    color: "blue", 
    order: 2,
    is_active: true,
    locked: false
  },
  { 
    id: "qualification", 
    label: "איסוף פרטים / סינון", 
    description: "בירור צרכים, תקציב והתאמה",
    color: "blue", 
    order: 3,
    is_active: true,
    locked: false
  },
  { 
    id: "meeting_scheduled", 
    label: "פגישה/ייעוץ נקבעו", 
    description: "נקבעה פגישה או שיחת ייעוץ",
    color: "purple", 
    order: 4,
    is_active: true,
    locked: false
  },
  { 
    id: "proposal_sent", 
    label: "הצעה נשלחה", 
    description: "נשלחה הצעת מחיר/שירות ללקוח",
    color: "orange", 
    order: 5,
    is_active: true,
    locked: false
  },
  { 
    id: "follow_up", 
    label: "פולואפ", 
    description: "ממתינים לתגובה, מבצעים מעקב",
    color: "yellow", 
    order: 6,
    is_active: true,
    locked: false
  },
  { 
    id: "closed_won", 
    label: "נסגר ✅", 
    description: "הליד נסגר בהצלחה",
    color: "green", 
    order: 7,
    is_active: true,
    locked: true
  },
  { 
    id: "closed_lost", 
    label: "לא רלוונטי ❌", 
    description: "הליד לא הבשיל לעסקה",
    color: "red", 
    order: 8,
    is_active: true,
    locked: true
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
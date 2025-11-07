// Utility functions for managing custom statuses

export const DEFAULT_STATUSES = [
  { id: "lead", label: "ליד", base_status: "lead", color: "yellow", order: 1 },
  { id: "hot_lead", label: "ליד חם", base_status: "hot_lead", color: "orange", order: 2 },
  { id: "client", label: "לקוח", base_status: "client", color: "green", order: 3 },
  { id: "inactive", label: "לא פעיל", base_status: "inactive", color: "gray", order: 4 }
];

export const COLOR_CLASSES = {
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red: "bg-red-100 text-red-800 border-red-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200"
};

export const getStatusColorClass = (color) => {
  return COLOR_CLASSES[color] || COLOR_CLASSES.gray;
};

export const getStatusLabel = (statusId, userStatuses = DEFAULT_STATUSES) => {
  const status = userStatuses.find(s => s.id === statusId);
  return status ? status.label : statusId;
};

export const getBaseStatus = (statusId, userStatuses = DEFAULT_STATUSES) => {
  const status = userStatuses.find(s => s.id === statusId);
  return status ? status.base_status : statusId;
};

// Convert user statuses to options format for selects
export const statusesToOptions = (userStatuses) => {
  return userStatuses.map(status => ({
    value: status.id,
    label: status.label,
    color: status.color,
    base_status: status.base_status
  }));
};

// Group statuses by base status for reporting
export const groupStatusesByBase = (userStatuses) => {
  const grouped = {};
  userStatuses.forEach(status => {
    if (!grouped[status.base_status]) {
      grouped[status.base_status] = [];
    }
    grouped[status.base_status].push(status);
  });
  return grouped;
};
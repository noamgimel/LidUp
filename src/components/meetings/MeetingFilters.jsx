import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

const statusOptions = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "scheduled", label: "מתוכנן" },
  { value: "completed", label: "הושלם" },
  { value: "cancelled", label: "בוטל" },
  { value: "rescheduled", label: "נדחה" }
];

const typeOptions = [
  { value: "all", label: "כל הסוגים" },
  { value: "phone", label: "שיחת טלפון" },
  { value: "video", label: "פגישת וידאו" },
  { value: "in_person", label: "פגישה פרונטלית" }
];

export default function MeetingFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (field, value) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <Filter className="w-4 h-4 text-slate-400" />
      
      <Select
        value={filters.status}
        onValueChange={(value) => handleFilterChange("status", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="סטטוס" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {statusOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type}
        onValueChange={(value) => handleFilterChange("type", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="סוג פגישה" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {typeOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="upcoming"
          checked={filters.upcoming}
          onCheckedChange={(checked) => handleFilterChange("upcoming", checked)}
        />
        <Label htmlFor="upcoming" className="text-sm text-slate-600">
          רק פגישות קרובות
        </Label>
      </div>
    </div>
  );
}
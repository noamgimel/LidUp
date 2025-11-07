
import React, { useMemo } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { ChevronDown, Filter } from "lucide-react"; // Added Filter icon
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientFilters({ filters, onFiltersChange }) {
  const { userWorkStages, isLoading: workStagesLoading } = useUserWorkStages();

  const handleFilterChange = (field, value) => {
    onFiltersChange({ ...filters, [field]: value });
  };
  
  const selectedStageLabel = useMemo(() => {
    if (filters.work_stage === "all" || !filters.work_stage) return "כל השלבים";
    if (filters.work_stage === "undefined") return "לא מוגדר";
    return userWorkStages.find(stage => stage.id === filters.work_stage)?.label || "כל השלבים";
  }, [filters.work_stage, userWorkStages]);

  if (workStagesLoading) {
      return <Skeleton className="h-10 w-10 md:w-40" /> // Adjusted skeleton width
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button 
                variant="outline" 
                className="h-10 w-10 md:w-auto md:min-w-[160px] flex-shrink-0 justify-center md:justify-between text-right bg-slate-50 border-slate-300 hover:bg-slate-100 focus:border-blue-500 focus:ring-blue-500 p-0 md:px-3" // Adjusted button classes
            >
                {/* Mobile Icon */}
                <Filter className="h-5 w-5 md:hidden text-slate-600" />
                
                {/* Desktop Content */}
                <span className="truncate hidden md:inline">{selectedStageLabel}</span>
                <ChevronDown className="mr-auto h-4 w-4 opacity-50 flex-shrink-0 hidden md:inline-block" /> {/* Hidden on mobile, inline-block on desktop */}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" dir="rtl" className="w-56">
            <DropdownMenuItem onSelect={() => handleFilterChange("work_stage", "all")}>
                כל השלבים
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleFilterChange("work_stage", "undefined")}>
                לא מוגדר
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {userWorkStages.map(stage => (
                <DropdownMenuItem key={stage.id} onSelect={() => handleFilterChange("work_stage", stage.id)}>
                    {stage.label}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
  );
}

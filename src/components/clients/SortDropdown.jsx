
import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Check } from "lucide-react";

const sortOptions = [
    { value: 'recommended', label: 'מיון מומלץ' },
    { value: 'newest', label: 'החדש ביותר' },
    { value: 'oldest', label: 'הישן ביותר' },
    { value: 'alphabetical', label: 'א-ת' },
    { value: 'last_updated', label: 'עודכן לאחרונה' }
];

export default function SortDropdown({ sortOption, onSortChange }) {
    const selectedLabel = sortOptions.find(opt => opt.value === sortOption)?.label || "מיון";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-10 md:w-auto md:min-w-[160px] flex-shrink-0 justify-center md:justify-between text-right bg-slate-50 border-slate-300 hover:bg-slate-100 focus:border-blue-500 focus:ring-blue-500 p-0 md:px-3">
                    {/* Mobile Icon */}
                    <ArrowUpDown className="h-5 w-5 md:hidden text-slate-600" />
                    
                    {/* Desktop Content */}
                    <span className="truncate hidden md:inline">{selectedLabel}</span>
                    <ArrowUpDown className="mr-auto h-4 w-4 opacity-50 flex-shrink-0 hidden md:inline-block" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" dir="rtl" className="w-56">
                {sortOptions.map(option => (
                    <DropdownMenuItem key={option.value} onSelect={() => onSortChange(option.value)}>
                         {option.label}
                        {sortOption === option.value && <Check className="h-4 w-4 mr-auto" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Filter, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface FilterSidebarProps {
  categories: { id: string; name: string; slug: string }[];
  filters: {
    query: string;
    categoryId: string;
    condition: string;
    locationZone: string;
    minPrice: string;
    maxPrice: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}

export function FilterSidebar({
  categories,
  filters,
  onFilterChange,
  onReset,
}: FilterSidebarProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const locationZones = [
    "All Zones",
    "Pepple Street",
    "Otigba Street",
    "Medical Road",
    "Kodesoh Street",
    "Ola Ayeni Street",
    "Akinremi Street",
    "Adepele Street",
    "Francis Oremuji Street",
    "Oshitelo Street",
    "Simbiat Abiola Way",
    "Olu Koleosho Street",
    "Oremeji Street",
    "Obafemi Awolowo Way",
  ];

  return (
    <div className="w-full shrink-0 rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900 lg:w-64">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
          <Filter className="h-4 w-4 text-blue-600" /> Filters
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen((open) => !open)} className="gap-1 text-xs text-blue-600 lg:hidden">
            {mobileFiltersOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {mobileFiltersOpen ? "Hide" : "Show"}{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-xs text-gray-500 hover:text-blue-600"><RotateCcw className="h-3 w-3" /> Reset</Button>
        </div>
      </div>

      <div className={`${mobileFiltersOpen ? "mt-6 block" : "hidden"} space-y-6 lg:mt-6 lg:block`}>
      {/* Search Input */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Search Products
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="e.g. MacBook, iPhone 15..."
            value={filters.query}
            onChange={(e) => onFilterChange("query", e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setCategoriesOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-expanded={categoriesOpen}
          aria-controls="marketplace-categories"
        >
          <span>Category{filters.categoryId ? " (selected)" : ""}</span>
          {categoriesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {categoriesOpen && (
        <div id="marketplace-categories" className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onFilterChange("categoryId", "")}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !filters.categoryId
                ? "bg-blue-600 text-white font-bold"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange("categoryId", cat.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filters.categoryId === cat.id
                  ? "bg-blue-600 text-white font-bold"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Condition Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Item Condition
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {["ALL", "NEW", "REFURBISHED", "USED"].map((cond) => {
            const isSelected =
              (cond === "ALL" && !filters.condition) || filters.condition === cond;
            return (
              <button
                key={cond}
                onClick={() => onFilterChange("condition", cond === "ALL" ? "" : cond)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Zone Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Computer Village Zone
        </Label>
        <select
          value={filters.locationZone}
          onChange={(e) => onFilterChange("locationZone", e.target.value === "All Zones" ? "" : e.target.value)}
          className="w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-200"
        >
          {locationZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Price Range (₦)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilterChange("minPrice", e.target.value)}
            className="text-xs"
          />
          <span className="text-gray-400 text-xs">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange("maxPrice", e.target.value)}
            className="text-xs"
          />
        </div>
      </div>
      </div>
    </div>
  );
}

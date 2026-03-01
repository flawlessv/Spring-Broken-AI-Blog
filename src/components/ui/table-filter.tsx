"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type TableFilterType = "text" | "select" | "multiselect" | "date";
export type TableFilterValue = string | string[] | null | undefined;

export interface TableFilterOption {
  label: string;
  value: string;
  color?: string;
}

interface TableFilterProps {
  columnKey: string;
  columnTitle: string;
  filterType: TableFilterType;
  options?: TableFilterOption[];
  placeholder?: string;
  currentValue?: TableFilterValue;
  onFilterChange: (columnKey: string, value: TableFilterValue) => void;
  onApply: (columnKey: string) => void;
  onReset: (columnKey: string) => void;
  onOpen: (columnKey: string) => void;
  onClose: (columnKey: string) => void;
  isOpen: boolean;
}

export function TableFilter({
  columnKey,
  columnTitle,
  filterType,
  options = [],
  placeholder,
  currentValue,
  onFilterChange,
  onApply,
  onReset,
  onOpen,
  onClose,
  isOpen,
}: TableFilterProps) {
  const [tempValue, setTempValue] = useState<TableFilterValue>(currentValue);

  const handleOpen = () => {
    setTempValue(currentValue);
    onOpen(columnKey);
  };

  const handleClose = () => {
    onClose(columnKey);
  };

  const handleApply = () => {
    onFilterChange(columnKey, tempValue);
    onApply(columnKey);
  };

  const handleReset = () => {
    setTempValue(null);
    onReset(columnKey);
  };

  const hasActiveFilter =
    currentValue !== null &&
    currentValue !== undefined &&
    (Array.isArray(currentValue)
      ? currentValue.length > 0
      : currentValue !== "");

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => (open ? handleOpen() : handleClose())}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 hover:bg-gray-200 ${
            hasActiveFilter ? "bg-gray-200 text-black" : ""
          }`}
        >
          <Filter
            className={`h-3 w-3 ${hasActiveFilter ? "fill-current" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* 筛选选项 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filterType === "text" && (
              <div className="space-y-2">
                <Input
                  placeholder={placeholder || `筛选${columnTitle}`}
                  value={typeof tempValue === "string" ? tempValue : ""}
                  onChange={(e) => setTempValue(e.target.value)}
                  className="h-8"
                />
              </div>
            )}

            {filterType === "multiselect" && options.length > 0 && (
              <>
                {options.map((option) => {
                  const currentValues = Array.isArray(tempValue)
                    ? tempValue
                    : [];
                  const isSelected = currentValues.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setTempValue([...currentValues, option.value]);
                          } else {
                            setTempValue(
                              currentValues.filter(
                                (value) => value !== option.value
                              )
                            );
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </>
            )}

            {filterType === "select" && options.length > 0 && (
              <>
                {options.map((option) => {
                  const isSelected = tempValue === option.value;
                  return (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setTempValue(option.value);
                          } else {
                            setTempValue(null);
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800"
            >
              重置
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
            >
              确定
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

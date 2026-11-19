"use client";

import { cn } from "cn";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
}

interface SimpleSelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  size?: "sm" | "default";
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/** A select over a plain list of options that shows the option's label, not its value. */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
  size = "default",
  disabled,
  invalid,
  id,
  className,
  ...aria
}: SimpleSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={aria["aria-label"]}
        aria-invalid={invalid || undefined}
        className={cn("w-full min-w-0 bg-card", className)}
      >
        <SelectValue>
          {(current: unknown) => {
            const option = options.find((entry) => entry.value === current);
            return option ? option.label : <span className="text-muted-foreground">{placeholder}</span>;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" className="max-h-72">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

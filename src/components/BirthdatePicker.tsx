import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BirthdatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

export const BirthdatePicker = ({ value, onChange }: BirthdatePickerProps) => {
  const [day, setDay] = useState<number | null>(value ? value.getDate() : null);
  const [month, setMonth] = useState<number | null>(value ? value.getMonth() : null);
  const [year, setYear] = useState<number | null>(value ? value.getFullYear() : null);

  const updateDate = (newDay: number | null, newMonth: number | null, newYear: number | null) => {
    if (newDay !== null && newMonth !== null) {
      // Use a default year if not provided (e.g., 2000) for storage purposes
      const dateYear = newYear || 2000;
      const date = new Date(dateYear, newMonth, newDay);
      onChange(date);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="birthdate">Birthdate</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={month !== null ? month.toString() : ""}
          onValueChange={(value) => {
            const newMonth = parseInt(value);
            setMonth(newMonth);
            updateDate(day, newMonth, year);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Month *" />
          </SelectTrigger>
          <SelectContent>
            {months.map((monthName, index) => (
              <SelectItem key={index} value={index.toString()}>
                {monthName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={day !== null ? day.toString() : ""}
          onValueChange={(value) => {
            const newDay = parseInt(value);
            setDay(newDay);
            updateDate(newDay, month, year);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Day *" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d.toString()}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={year !== null ? year.toString() : "no-year"}
          onValueChange={(value) => {
            const newYear = value === "no-year" ? null : parseInt(value);
            setYear(newYear);
            updateDate(day, month, newYear);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-year">No year</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Month and day are required. Year is optional.
      </p>
    </div>
  );
};
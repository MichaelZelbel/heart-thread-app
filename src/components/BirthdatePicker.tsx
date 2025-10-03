import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface BirthdatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
}
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = Array.from({
  length: 31
}, (_, i) => i + 1);
const years = Array.from({
  length: 100
}, (_, i) => new Date().getFullYear() - i);
export const BirthdatePicker = ({
  value,
  onChange
}: BirthdatePickerProps) => {
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
  return;
};
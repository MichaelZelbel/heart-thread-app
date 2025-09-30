import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Heart, MessageCircle, Clock, HandHelping, Gift } from "lucide-react";

interface LoveLanguageValues {
  physical: number;
  words: number;
  quality: number;
  acts: number;
  gifts: number;
}

interface LoveLanguageDialsProps {
  values: LoveLanguageValues;
  onChange: (values: LoveLanguageValues) => void;
}

export const LoveLanguageDials = ({ values, onChange }: LoveLanguageDialsProps) => {
  const handleChange = (key: keyof LoveLanguageValues, newValue: number) => {
    const total = Object.values(values).reduce((sum, val) => sum + val, 0);
    const remaining = 100 - newValue;
    const otherKeys = Object.keys(values).filter(k => k !== key) as (keyof LoveLanguageValues)[];
    
    // Calculate the difference
    const diff = total - 100;
    
    if (diff === 0) {
      // If already at 100, adjust others proportionally
      const newValues = { ...values, [key]: newValue };
      const otherTotal = remaining;
      
      otherKeys.forEach((otherKey) => {
        const proportion = values[otherKey] / (total - values[key]);
        newValues[otherKey] = Math.round(otherTotal * proportion);
      });
      
      // Fix rounding errors
      const finalTotal = Object.values(newValues).reduce((sum, val) => sum + val, 0);
      if (finalTotal !== 100) {
        const firstKey = otherKeys[0];
        newValues[firstKey] = newValues[firstKey] + (100 - finalTotal);
      }
      
      onChange(newValues);
    } else {
      onChange({ ...values, [key]: newValue });
    }
  };

  const total = Object.values(values).reduce((sum, val) => sum + val, 0);
  const isValid = total === 100;

  const languages = [
    { key: 'physical' as const, label: 'Physical Touch', icon: Heart, color: 'hsl(340 75% 55%)' },
    { key: 'words' as const, label: 'Words of Affirmation', icon: MessageCircle, color: 'hsl(280 60% 65%)' },
    { key: 'quality' as const, label: 'Quality Time', icon: Clock, color: 'hsl(25 85% 65%)' },
    { key: 'acts' as const, label: 'Acts of Service', icon: HandHelping, color: 'hsl(200 80% 60%)' },
    { key: 'gifts' as const, label: 'Receiving Gifts', icon: Gift, color: 'hsl(150 60% 55%)' },
  ];

  return (
    <div className="space-y-6">
      {languages.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center space-x-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span>{label}</span>
            </Label>
            <span className="text-sm font-semibold" style={{ color }}>
              {values[key]}%
            </span>
          </div>
          <Slider
            value={[values[key]]}
            onValueChange={(val) => handleChange(key, val[0])}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      ))}
      
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total:</span>
          <span className={`text-sm font-bold ${isValid ? 'text-primary' : 'text-destructive'}`}>
            {total}%
          </span>
        </div>
        {!isValid && (
          <p className="text-xs text-destructive mt-1">
            Love languages must total exactly 100%
          </p>
        )}
      </div>
    </div>
  );
};

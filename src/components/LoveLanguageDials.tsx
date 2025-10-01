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
    const oldValue = values[key];
    const diff = newValue - oldValue;
    
    if (diff === 0) return;
    
    const newValues = { ...values, [key]: newValue };
    const otherKeys = Object.keys(values).filter(k => k !== key) as (keyof LoveLanguageValues)[];
    
    // Amount to distribute among others (opposite of diff)
    let toDistribute = -diff;
    
    if (toDistribute > 0) {
      // Slider decreased, increase others evenly
      const perSlider = Math.floor(toDistribute / otherKeys.length);
      let remainder = toDistribute % otherKeys.length;
      
      otherKeys.forEach(k => {
        const extra = remainder > 0 ? 1 : 0;
        newValues[k] = values[k] + perSlider + extra;
        if (extra) remainder--;
      });
    } else {
      // Slider increased, decrease others evenly
      toDistribute = Math.abs(toDistribute);
      let availableKeys = otherKeys.filter(k => newValues[k] > 0);
      
      while (toDistribute > 0 && availableKeys.length > 0) {
        const perSlider = Math.floor(toDistribute / availableKeys.length);
        const extraCount = toDistribute % availableKeys.length;
        
        availableKeys.forEach((k, idx) => {
          const decrease = perSlider + (idx < extraCount ? 1 : 0);
          const actualDecrease = Math.min(decrease, newValues[k], toDistribute);
          newValues[k] = newValues[k] - actualDecrease;
          toDistribute -= actualDecrease;
        });
        
        availableKeys = availableKeys.filter(k => newValues[k] > 0);
      }
    }
    
    onChange(newValues);
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

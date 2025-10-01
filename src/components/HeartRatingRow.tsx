import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeartRatingRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export const HeartRatingRow = ({ label, value, onChange }: HeartRatingRowProps) => {
  const hearts = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(0)}
          className={`h-8 px-3 text-xs ${
            value === 0 ? 'bg-accent' : ''
          }`}
          aria-label={`Set ${label} to not at all`}
        >
          Not at all
        </Button>
      </div>
      <div 
        className="flex gap-2" 
        role="radiogroup" 
        aria-label={`${label} rating`}
      >
        {hearts.map((heartValue) => (
          <button
            key={heartValue}
            type="button"
            onClick={() => onChange(heartValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(heartValue);
              }
            }}
            className="touch-target focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded transition-transform hover:scale-110"
            role="radio"
            aria-checked={value === heartValue}
            aria-label={`${heartValue} of 5 hearts for ${label}`}
          >
            <Heart
              className={`w-10 h-10 transition-all ${
                heartValue <= value
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

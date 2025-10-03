import { Heart, MessageCircle, Clock, HandHelping, Gift } from "lucide-react";
import { HeartRatingRow } from "./HeartRatingRow";
interface LoveLanguageValues {
  physical: number;
  words: number;
  quality: number;
  acts: number;
  gifts: number;
}
interface LoveLanguageHeartRatingsProps {
  values: LoveLanguageValues;
  onChange: (values: LoveLanguageValues) => void;
}
export const LoveLanguageHeartRatings = ({
  values,
  onChange
}: LoveLanguageHeartRatingsProps) => {
  const handleChange = (key: keyof LoveLanguageValues, newValue: number) => {
    onChange({
      ...values,
      [key]: newValue
    });
  };
  const languages = [{
    key: 'physical' as const,
    label: 'Physical Touch',
    icon: Heart
  }, {
    key: 'words' as const,
    label: 'Words of Affirmation',
    icon: MessageCircle
  }, {
    key: 'quality' as const,
    label: 'Quality Time',
    icon: Clock
  }, {
    key: 'acts' as const,
    label: 'Acts of Service',
    icon: HandHelping
  }, {
    key: 'gifts' as const,
    label: 'Receiving Gifts',
    icon: Gift
  }];
  return <div className="space-y-6">
      <div className="space-y-2">
        
        <p className="text-sm text-muted-foreground">
          How much do they love this?
        </p>
        <p className="text-xs text-muted-foreground">
          1 = almost not at all, 5 = all the way. Or choose 'Not at all' if it doesn't fit them.
        </p>
      </div>

      {languages.map(({
      key,
      label,
      icon: Icon
    }) => <HeartRatingRow key={key} label={label} value={values[key]} onChange={newValue => handleChange(key, newValue)} />)}
    </div>;
};
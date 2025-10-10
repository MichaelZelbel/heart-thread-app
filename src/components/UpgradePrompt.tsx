import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface UpgradePromptProps {
  featureName: string;
  description?: string;
}

export const UpgradePrompt = ({ featureName, description }: UpgradePromptProps) => {
  return (
    <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex justify-center mb-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{featureName}</h3>
      <p className="text-muted-foreground mb-6">
        {description || "This is a Pro feature. Upgrade to unlock it."}
      </p>
      <Button asChild size="lg" className="gap-2">
        <Link to="/pricing">
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro
        </Link>
      </Button>
    </Card>
  );
};

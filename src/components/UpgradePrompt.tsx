import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface UpgradePromptProps {
  featureName: string;
  description?: string;
}

export const UpgradePrompt = ({ featureName, description }: UpgradePromptProps) => {
  return (
    <Card className="p-8 text-center bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
      <div className="flex justify-center mb-4">
        <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20">
          <span className="text-4xl">🤍</span>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{featureName}</h3>
      <p className="text-muted-foreground mb-6">
        {description || "This is a Pro feature. Upgrade to unlock it."}
      </p>
      <Button 
        asChild 
        size="lg" 
        className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
      >
        <Link to="/pricing" className="flex items-center gap-2">
          <span>Upgrade to Pro</span>
          <span>🤍</span>
        </Link>
      </Button>
    </Card>
  );
};

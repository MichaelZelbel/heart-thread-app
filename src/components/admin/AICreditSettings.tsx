import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Loader2, Settings } from "lucide-react";

interface CreditSetting {
  key: string;
  value_int: number;
  description: string | null;
  pendingValue?: number;
  isSaving?: boolean;
}

export const AICreditSettings = () => {
  const [settings, setSettings] = useState<CreditSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_credit_settings')
        .select('*')
        .order('key');

      if (error) throw error;

      setSettings(data.map(s => ({
        ...s,
        pendingValue: s.value_int,
        isSaving: false
      })));
    } catch (error) {
      console.error('Error fetching credit settings:', error);
      toast.error("Failed to load AI credit settings");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, pendingValue: numValue } : s
    ));
  };

  const saveSetting = async (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting || setting.pendingValue === setting.value_int) return;

    setSettings(prev => prev.map(s => 
      s.key === key ? { ...s, isSaving: true } : s
    ));

    try {
      const { error } = await supabase
        .from('ai_credit_settings')
        .update({ value_int: setting.pendingValue })
        .eq('key', key);

      if (error) throw error;

      setSettings(prev => prev.map(s => 
        s.key === key ? { ...s, value_int: setting.pendingValue!, isSaving: false } : s
      ));

      toast.success(`Updated ${formatKey(key)}`);
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error("Failed to save setting");
      setSettings(prev => prev.map(s => 
        s.key === key ? { ...s, isSaving: false } : s
      ));
    }
  };

  const saveAllSettings = async () => {
    const changedSettings = settings.filter(s => s.pendingValue !== s.value_int);
    if (changedSettings.length === 0) {
      toast.info("No changes to save");
      return;
    }

    for (const setting of changedSettings) {
      await saveSetting(setting.key);
    }
  };

  const formatKey = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const hasChanges = settings.some(s => s.pendingValue !== s.value_int);

  if (loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Settings className="h-6 w-6" />
              AI Credit Settings
            </CardTitle>
            <CardDescription>
              Configure global AI credit allocation and token ratios
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={saveAllSettings} className="gap-2">
              <Save className="h-4 w-4" />
              Save All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {settings.map((setting) => {
            const hasChanged = setting.pendingValue !== setting.value_int;
            
            return (
              <div 
                key={setting.key} 
                className="flex flex-col sm:flex-row sm:items-end gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor={setting.key} className="text-base font-semibold">
                    {formatKey(setting.key)}
                  </Label>
                  {setting.description && (
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  )}
                  <Input
                    id={setting.key}
                    type="number"
                    value={setting.pendingValue ?? setting.value_int}
                    onChange={(e) => handleValueChange(setting.key, e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant={hasChanged ? "default" : "outline"}
                  disabled={!hasChanged || setting.isSaving}
                  onClick={() => saveSetting(setting.key)}
                  className="gap-2 min-w-24"
                >
                  {setting.isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {settings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No AI credit settings found
          </div>
        )}
      </CardContent>
    </Card>
  );
};

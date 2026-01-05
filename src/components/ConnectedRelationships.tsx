import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CherishedOption {
  id: string;
  name: string;
}

interface Connection {
  id: string;
  cherishedId: string;
  cherishedName: string;
  description: string;
}

interface ConnectedRelationshipsProps {
  partnerId: string;
  partnerName: string;
  availableCherished: CherishedOption[];
  connections: Connection[];
  onConnectionsChange?: (connections: Connection[]) => void;
}

export const ConnectedRelationships = ({
  partnerId,
  partnerName,
  availableCherished,
  connections,
  onConnectionsChange,
}: ConnectedRelationshipsProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [newCherishedId, setNewCherishedId] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Filter out current partner and already connected cherished
  const availableToConnect = availableCherished.filter(
    (c) => c.id !== partnerId && !connections.some((conn) => conn.cherishedId === c.id)
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddConnection = () => {
    if (!newCherishedId) return;

    const selectedCherished = availableCherished.find((c) => c.id === newCherishedId);
    if (!selectedCherished) return;

    const newConnection: Connection = {
      id: crypto.randomUUID(),
      cherishedId: newCherishedId,
      cherishedName: selectedCherished.name,
      description: newDescription,
    };

    onConnectionsChange?.([...connections, newConnection]);
    setNewCherishedId("");
    setNewDescription("");
    setIsAdding(false);
  };

  const handleRemoveConnection = (connectionId: string) => {
    onConnectionsChange?.(connections.filter((c) => c.id !== connectionId));
  };

  const handleUpdateDescription = (connectionId: string, description: string) => {
    onConnectionsChange?.(
      connections.map((c) => (c.id === connectionId ? { ...c, description } : c))
    );
  };

  const shouldTruncate = (text: string) => {
    return text.length > 150 || text.split("\n").length > 3;
  };

  const truncateText = (text: string) => {
    const lines = text.split("\n").slice(0, 3);
    const truncated = lines.join("\n");
    return truncated.length > 150 ? truncated.substring(0, 150) + "..." : truncated;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-foreground">Connected Relationships</h4>
        <span className="text-xs text-muted-foreground">(optional)</span>
      </div>

      {/* Existing connections */}
      {connections.length > 0 && (
        <div className="space-y-3">
          {connections.map((connection) => {
            const isExpanded = expandedIds.has(connection.id);
            const needsTruncation = shouldTruncate(connection.description);
            const displayText =
              needsTruncation && !isExpanded
                ? truncateText(connection.description)
                : connection.description;

            return (
              <div
                key={connection.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">
                    {connection.cherishedName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveConnection(connection.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {connection.description ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {displayText}
                    </p>
                    {needsTruncation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        onClick={() => toggleExpanded(connection.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Show more
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Textarea
                    placeholder="How is this relationship connected or relevant?"
                    className="min-h-[60px] text-sm resize-none"
                    value={connection.description}
                    onChange={(e) => handleUpdateDescription(connection.id, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new connection form */}
      {isAdding ? (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <Select value={newCherishedId} onValueChange={setNewCherishedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Cherished to connect..." />
            </SelectTrigger>
            <SelectContent>
              {availableToConnect.length > 0 ? (
                availableToConnect.map((cherished) => (
                  <SelectItem key={cherished.id} value={cherished.id}>
                    {cherished.name}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No other Cherished available
                </div>
              )}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="How is this relationship connected or relevant? (optional)"
            className="min-h-[80px] text-sm resize-none"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewCherishedId("");
                setNewDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddConnection}
              disabled={!newCherishedId}
            >
              Add Connection
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setIsAdding(true)}
          disabled={availableToConnect.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect to another Cherished
        </Button>
      )}

      {connections.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground text-center">
          Describe how {partnerName} relates to your other Cherished in your own words.
        </p>
      )}
    </div>
  );
};

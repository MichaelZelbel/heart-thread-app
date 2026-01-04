import { useState } from "react";
import { 
  FileText, 
  Plus, 
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ArrowLeft,
  Check,
  Sparkles,
  BookOpen,
  MessageSquare,
  Heart,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Document {
  id: string;
  title: string;
  type: "journal" | "chat-notes" | "reflections" | "other";
  content: string;
  lastEdited: string;
  indexed: boolean;
}

interface CherishedDocumentsProps {
  partnerName: string;
}

const DOCUMENT_TYPES = [
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "chat-notes", label: "Chat Notes", icon: MessageSquare },
  { id: "reflections", label: "Reflections", icon: Heart },
  { id: "other", label: "Other", icon: FileText },
] as const;

const PLACEHOLDER_DOCUMENTS: Document[] = [
  {
    id: "1",
    title: "How we handle disagreements",
    type: "reflections",
    content: `Over time, I've noticed some patterns in how we navigate conflict:\n\n**What works:**\n- Taking a short break when things get heated\n- Using "I feel" statements instead of accusations\n- Coming back to the conversation after we've both cooled down\n\n**Things to avoid:**\n- Bringing up past issues when discussing current ones\n- Making assumptions about what the other person is thinking\n- Letting things fester without addressing them\n\nWe've gotten better at this over the years. The key is remembering we're on the same team.`,
    lastEdited: "2 days ago",
    indexed: true,
  },
  {
    id: "2",
    title: "Gift ideas & wishes",
    type: "journal",
    content: `Things they've mentioned wanting:\n\n- That vintage record player we saw at the antique shop\n- A weekend trip somewhere with mountains\n- The cookbook from their favorite chef\n- More quality time, fewer gifts (noted)\n\nThings that always work:\n- Handwritten notes\n- Planning a surprise date\n- Making their favorite meal`,
    lastEdited: "1 week ago",
    indexed: true,
  },
  {
    id: "3",
    title: "Notes from our last deep conversation",
    type: "chat-notes",
    content: `Last Sunday, we talked for hours about where we see ourselves in 5 years.\n\nKey takeaways:\n- They want to feel more settled, maybe buy a place\n- Career is important but not at the expense of time together\n- They mentioned feeling like we should travel more while we can\n- Family is becoming more important to them\n\nI should follow up on the travel idea. Maybe plan something for our anniversary.`,
    lastEdited: "3 weeks ago",
    indexed: false,
  },
];

const getTypeIcon = (type: Document["type"]) => {
  const typeConfig = DOCUMENT_TYPES.find(t => t.id === type);
  return typeConfig?.icon || FileText;
};

const getTypeLabel = (type: Document["type"]) => {
  const typeConfig = DOCUMENT_TYPES.find(t => t.id === type);
  return typeConfig?.label || "Other";
};

export const CherishedDocuments = ({ partnerName }: CherishedDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>(PLACEHOLDER_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isNewDocDialog, setIsNewDocDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<Document["type"]>("journal");
  const [isRenameDialog, setIsRenameDialog] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");

  const handleOpenDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setEditingContent(doc.content);
  };

  const handleCloseDoc = () => {
    // Save changes before closing
    if (selectedDoc) {
      setDocuments(docs => 
        docs.map(d => 
          d.id === selectedDoc.id 
            ? { ...d, content: editingContent, lastEdited: "Just now" }
            : d
        )
      );
    }
    setSelectedDoc(null);
    setEditingContent("");
  };

  const handleCreateDoc = () => {
    if (!newDocTitle.trim()) return;
    
    const newDoc: Document = {
      id: Date.now().toString(),
      title: newDocTitle.trim(),
      type: newDocType,
      content: "",
      lastEdited: "Just now",
      indexed: false,
    };
    
    setDocuments([newDoc, ...documents]);
    setNewDocTitle("");
    setNewDocType("journal");
    setIsNewDocDialog(false);
    handleOpenDoc(newDoc);
  };

  const handleRename = () => {
    if (!selectedDoc || !renameTitle.trim()) return;
    
    setDocuments(docs =>
      docs.map(d =>
        d.id === selectedDoc.id
          ? { ...d, title: renameTitle.trim() }
          : d
      )
    );
    setSelectedDoc({ ...selectedDoc, title: renameTitle.trim() });
    setIsRenameDialog(false);
  };

  const handleDuplicate = (doc: Document) => {
    const duplicate: Document = {
      ...doc,
      id: Date.now().toString(),
      title: `${doc.title} (copy)`,
      lastEdited: "Just now",
    };
    setDocuments([duplicate, ...documents]);
  };

  const handleDelete = (docId: string) => {
    setDocuments(docs => docs.filter(d => d.id !== docId));
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
    }
  };

  // Document Editor View
  if (selectedDoc) {
    const TypeIcon = getTypeIcon(selectedDoc.type);
    
    return (
      <div className="space-y-4">
        {/* Editor Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCloseDoc}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{selectedDoc.title}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedDoc.indexed && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="w-3 h-3" />
                Used by Claire
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setRenameTitle(selectedDoc.title);
                  setIsRenameDialog(true);
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(selectedDoc)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDelete(selectedDoc.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Editor Content */}
        <div className="space-y-3">
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[400px] resize-none text-sm leading-relaxed font-mono"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last edited: {selectedDoc.lastEdited}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-green-500" />
              Auto-saved
            </span>
          </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialog} onOpenChange={setIsRenameDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rename-title">Title</Label>
                <Input
                  id="rename-title"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRenameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRename}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Document List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""} about {partnerName}
          </span>
        </div>
        <Button onClick={() => setIsNewDocDialog(true)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New document
        </Button>
      </div>

      {/* Document List */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => {
            const TypeIcon = getTypeIcon(doc.type);
            
            return (
              <div
                key={doc.id}
                className={cn(
                  "group relative p-4 rounded-lg border border-border/50 bg-card",
                  "hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer"
                )}
                onClick={() => handleOpenDoc(doc)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-md bg-muted/50 text-muted-foreground">
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                        {doc.indexed && (
                          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                            <Sparkles className="w-2.5 h-2.5" />
                            Indexed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{getTypeLabel(doc.type)}</span>
                        <span>·</span>
                        <span>Edited {doc.lastEdited}</span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => {
                        setSelectedDoc(doc);
                        setRenameTitle(doc.title);
                        setIsRenameDialog(true);
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(doc)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(doc.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-lg">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-medium text-lg mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Create documents to store important information about {partnerName}. 
            Claire can use these to give you better advice.
          </p>
          <Button onClick={() => setIsNewDocDialog(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Create your first document
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/60 text-center">
          Documents are your private notes. Indexed documents help Claire understand your relationship better.
        </p>
      </div>

      {/* New Document Dialog */}
      <Dialog open={isNewDocDialog} onOpenChange={setIsNewDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g., How we handle stress"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type</Label>
              <Select value={newDocType} onValueChange={(v) => setNewDocType(v as Document["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDoc} disabled={!newDocTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

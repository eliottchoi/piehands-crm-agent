import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2 } from 'lucide-react';

interface FilterQuery {
  id: string;
  type: 'event' | 'property' | 'cohort';
  display: string;
  query: any;
}

interface CohortSaveModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterQuery[];
  onSave: (cohortData: { name: string; description: string; filters: FilterQuery[] }) => void;
  isSaving?: boolean;
}

export const CohortSaveModal: React.FC<CohortSaveModalProps> = ({
  isOpen,
  onOpenChange,
  filters,
  onSave,
  isSaving = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      name: name.trim(),
      description: description.trim(),
      filters
    });
    
    // Reset form
    setName('');
    setDescription('');
  };

  const handleCancel = () => {
    onOpenChange(false);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Save className="h-5 w-5" />
            <span>Save as Cohort</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Preview current filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Current Filter Conditions ({filters.length})
            </Label>
            <div className="p-3 bg-muted/20 rounded-lg border text-sm space-y-1">
              {filters.map((filter, index) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  {index > 0 && (
                    <span className="text-xs text-muted-foreground">AND</span>
                  )}
                  <span className="text-muted-foreground">{filter.display}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Cohort name */}
          <div className="space-y-2">
            <Label htmlFor="cohort-name">Cohort Name *</Label>
            <Input
              id="cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Value Customers"
              className="w-full"
            />
          </div>
          
          {/* Cohort description */}
          <div className="space-y-2">
            <Label htmlFor="cohort-description">Description (Optional)</Label>
            <Textarea
              id="cohort-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this cohort represents..."
              rows={3}
              className="w-full resize-none"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || isSaving}
            className="min-w-20"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Cohort
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

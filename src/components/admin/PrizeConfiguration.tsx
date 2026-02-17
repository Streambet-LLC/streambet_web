import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { Loader2, Plus, Trash2, X, Edit, AlertCircle } from 'lucide-react';
import {
  PrizeConfiguration as PrizeTier,
  CreatePrizeTierRequest,
  UpdatePrizeTierRequest,
} from '@/types/prize';
import PhotoCropper from '../PhotoCropper';
import { useImageCropper } from '@/hooks/useImageCropper';
import { IMAGE_UPLOAD_CONFIG } from '@/utils/imageUploadConstants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Bugsnag from '@bugsnag/js';
import { getMessage, getThumbnailUrl } from '@/utils/helper';

export const PrizeConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useAdminPrizeTiers();

  // Image upload hook
  const imageUpload = useImageCropper({
    checkNSFW: false,
    onError: error => setImageError(error),
  });

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PrizeTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<PrizeTier | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Validation state
  const [validationError, setValidationError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<CreatePrizeTierRequest>({
    amount: 500,
    name: '',
    description: '',
    imageUrl: '',
    category: 'slab',
    stock: 0,
  });

  const resetForm = () => {
    setFormData({
      amount: 500,
      name: '',
      description: '',
      imageUrl: '',
      category: 'slab',
      stock: 0,
    });
    setValidationError('');
    imageUpload.clearImage();
    setImageError(null);
  };

  // Drag and drop handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) imageUpload.handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) imageUpload.handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Validate tier number uniqueness
  const isTierNumberUnique = (
    tierNumber: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    if (existingTiers.some(t => t.prizeTier === tierNumber)) {
      return { isValid: false, error: `Tier ${tierNumber} already exists` };
    }
    return { isValid: true };
  };

  // Validate amount uniqueness
  const isAmountUnique = (
    amount: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    if (existingTiers.some(t => Number(t.amount) === amount)) {
      return {
        isValid: false,
        error: `A prize with ${amount.toLocaleString('en-US')} coins already exists`,
      };
    }
    return { isValid: true };
  };

  // Main validation function - just check amount uniqueness
  const validatePrizeAmount = (
    amount: number,
    existingTiers: PrizeTier[],
    editingTierId?: string
  ): { isValid: boolean; error?: string } => {
    // Filter out the tier being edited
    const otherTiers = existingTiers.filter(t => t.id !== editingTierId);

    return isAmountUnique(amount, otherTiers);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreatePrizeTierRequest) => api.prize.createPrizeTier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: error => handleMutationError(error, 'Failed to create item'),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePrizeTierRequest }) =>
      api.prize.updatePrizeTier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item updated successfully',
      });
      setEditingTier(null);
      resetForm();
    },
    onError: error => handleMutationError(error, 'Failed to update item'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.prize.deletePrizeTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Item deleted successfully',
      });
      setDeletingTier(null);
    },
    onError: error => handleMutationError(error, 'Failed to delete item'),
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setValidationError('Item name is required');
      return;
    }

    // Validate amount is unique
    const validation = validatePrizeAmount(formData.amount, tiers || []);

    if (!validation.isValid) {
      setValidationError(validation.error || 'Validation failed');
      return;
    }

    // Check for image errors
    if (imageError) {
      toast({
        variant: 'destructive',
        title: 'Image Error',
        description: imageError,
      });
      return;
    }

    setValidationError('');

    try {
      // Upload image if new file selected
      const imageUrl = await handleImageUpload();

      createMutation.mutate({
        ...formData,
        imageUrl,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error uploading image',
        description: getMessage(error) || 'Failed to upload item image. Please try again.',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingTier) return;
    if (!formData.name.trim()) {
      setValidationError('Item name is required');
      return;
    }

    // Validate amount is unique
    const validation = validatePrizeAmount(formData.amount, tiers || [], editingTier.id);

    if (!validation.isValid) {
      setValidationError(validation.error || 'Validation failed');
      return;
    }

    // Check for image errors
    if (imageError) {
      toast({
        variant: 'destructive',
        title: 'Image Error',
        description: imageError,
      });
      return;
    }

    setValidationError('');

    try {
      // Upload image if new file selected
      const imageUrl = await handleImageUpload();

      updateMutation.mutate({
        id: editingTier.id,
        payload: {
          ...formData,
          imageUrl,
        },
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error uploading image',
        description: getMessage(error) || 'Failed to upload item image. Please try again.',
      });
    }
  };

  const handleEdit = (tier: PrizeTier) => {
    setFormData({
      amount: tier.amount,
      name: tier.name,
      description: tier.description || '',
      imageUrl: tier.imageUrl || '',
      category: tier.category,
      stock: tier.stock,
    });
    imageUpload.clearImage();
    setEditingTier(tier);
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!imageUpload.selectedFile) {
      return formData.imageUrl; // Return existing URL if no new file
    }

    try {
      setIsUploading(true);
      const response = await api.auth.uploadImage(imageUpload.selectedFile, 'thumbnail');
      const url = response?.data?.Key;

      if (!url || typeof url !== 'string') {
        throw new Error('Invalid upload response: missing image URL');
      }

      return url;
    } catch (error) {
      Bugsnag.notify(error);
      throw error; // Re-throw to be caught by handleCreate/handleUpdate
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeTiers = tiers?.filter(t => t.isActive) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shop Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Manage items in the shop</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Add Item</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTiers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active prize tiers</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create First Tier
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Slab Category Section */}
              {activeTiers.some(t => t.category === 'slab') && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Slab Prizes</h3>
                  <div className="space-y-3">
                    {activeTiers
                      .filter(t => t.category === 'slab')
                      .sort((a, b) => a.prizeTier - b.prizeTier)
                      .map(tier => (
                        <div
                          key={tier.id}
                          className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          {/* Left side - prize info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{tier.name}</h3>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-sm text-muted-foreground">
                                {tier.amount.toLocaleString('en-US')} coins
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  tier.stock > 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                                }`}
                              >
                                Stock: {tier.stock}
                              </span>
                            </div>
                            {tier.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                {tier.description}
                              </p>
                            )}
                          </div>

                          {/* Right side - actions */}
                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(tier)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingTier(tier)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Sealed Category Section */}
              {activeTiers.some(t => t.category === 'sealed') && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-primary">Sealed Prizes</h3>
                  <div className="space-y-3">
                    {activeTiers
                      .filter(t => t.category === 'sealed')
                      .sort((a, b) => a.prizeTier - b.prizeTier)
                      .map(tier => (
                        <div
                          key={tier.id}
                          className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          {/* Left side - prize info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{tier.name}</h3>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-sm text-muted-foreground">
                                {tier.amount.toLocaleString('en-US')} coins
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded font-medium ${
                                  tier.stock > 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                                }`}
                              >
                                Stock: {tier.stock}
                              </span>
                            </div>
                            {tier.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                {tier.description}
                              </p>
                            )}
                          </div>

                          {/* Right side - actions */}
                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(tier)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeletingTier(tier)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || editingTier !== null}
        onOpenChange={open => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTier(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Item' : 'Create Item'}</DialogTitle>
            <DialogDescription>
              {editingTier
                ? 'Update the item details. This will create a new version and deactivate the old one.'
                : 'Add a new item for users to purchase.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2.5">
              <Label htmlFor="amount" className="text-base font-medium">
                Coin Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={e => {
                  setFormData({ ...formData, amount: parseInt(e.target.value) || 0 });
                  setValidationError('');
                }}
                className="h-12 text-base"
                placeholder="0"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-base font-medium">
                Prize Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  setValidationError('');
                }}
                className="h-12 text-base"
                placeholder="e.g., Collector"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="category" className="text-base font-medium">
                Prize Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={value => {
                  setFormData({ ...formData, category: value as 'slab' | 'sealed' });
                  setValidationError('');
                }}
              >
                <SelectTrigger id="category" className="h-12 text-base">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slab">Slab</SelectItem>
                  <SelectItem value="sealed">Sealed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="stock" className="text-base font-medium">
                Stock Quantity
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={e => {
                  setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                  setValidationError('');
                }}
                className="h-12 text-base"
                placeholder="0 = unlimited"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="description" className="text-base font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Prize description..."
                rows={4}
                className="text-base resize-none"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-base font-medium">Prize Image</Label>
              {imageUpload.previewUrl ||
              (editingTier && formData.imageUrl && !imageUpload.selectedFile) ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={imageUpload.previewUrl || getThumbnailUrl(formData.imageUrl)}
                    alt="Preview"
                    className="w-full aspect-[16/9] object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-10 w-10 shadow-lg"
                    onClick={() => {
                      imageUpload.clearImage();
                      setFormData({ ...formData, imageUrl: '' });
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`w-full flex flex-col items-center justify-center bg-secondary rounded-lg py-8 px-4 cursor-pointer border-2 border-dashed transition-colors ${isDragging ? 'ring-2 ring-primary border-primary' : 'border-border'} ${imageError ? 'border-destructive' : ''}`}
                  onClick={imageUpload.isValidating ? undefined : handleUploadClick}
                  onDrop={imageUpload.isValidating ? undefined : handleDrop}
                  onDragOver={imageUpload.isValidating ? undefined : handleDragOver}
                  onDragLeave={imageUpload.isValidating ? undefined : handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                    disabled={imageUpload.isValidating}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-background border-4 border-border flex items-center justify-center p-3">
                      {imageUpload.isValidating ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : (
                        <img src="/icons/cloud_upload.png" alt="Upload" className="w-8 h-8" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-primary">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-0.5">or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, or WebP</p>
                      <p className="text-xs text-muted-foreground">
                        Aspect ratio 16:9 • 1920x1080px
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {imageError && <p className="text-sm text-red-500 mt-2">{imageError}</p>}
            </div>
          </div>
          {imageUpload.fileToCrop && (
            <PhotoCropper
              file={imageUpload.fileToCrop}
              onClose={imageUpload.cancelCrop}
              onCrop={imageUpload.handleCropComplete}
              cropperProps={{
                aspect: IMAGE_UPLOAD_CONFIG.ASPECT_RATIO,
              }}
              resizerProps={{
                maxWidth: IMAGE_UPLOAD_CONFIG.MAX_WIDTH,
                maxHeight: IMAGE_UPLOAD_CONFIG.MAX_HEIGHT,
                compressFormat: 'JPEG',
                quality: IMAGE_UPLOAD_CONFIG.QUALITY,
              }}
            />
          )}
          {validationError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive rounded-md">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTier(null);
                resetForm();
              }}
              className="h-12 sm:h-10 text-base sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={editingTier ? handleUpdate : handleCreate}
              disabled={isUploading || createMutation.isPending || updateMutation.isPending}
              className="h-12 sm:h-10 text-base sm:text-sm"
            >
              {(isUploading || createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingTier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingTier !== null} onOpenChange={() => setDeletingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prize Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTier?.name}&quot;? This will deactivate
              the tier but preserve it in history for data integrity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTier) {
                  deleteMutation.mutate(deletingTier.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

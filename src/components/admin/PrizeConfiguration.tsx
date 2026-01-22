import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminPrizeTiers } from '@/hooks/usePrizeConfig';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { Loader2, Plus, Trash2, X, Edit, AlertCircle } from 'lucide-react';
import { PrizeConfiguration as PrizeTier, CreatePrizeTierRequest, UpdatePrizeTierRequest } from '@/types/prize';
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
    onError: (error) => setImageError(error),
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
    prizeTier: 1,
    amount: 500,
    name: '',
    description: '',
    imageUrl: '',
  });

  const resetForm = () => {
    setFormData({
      prizeTier: 1,
      amount: 500,
      name: '',
      description: '',
      imageUrl: '',
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
    if (existingTiers.some((t) => t.prizeTier === tierNumber)) {
      return { isValid: false, error: `Tier ${tierNumber} already exists` };
    }
    return { isValid: true };
  };

  // Validate amount uniqueness
  const isAmountUnique = (
    amount: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    if (existingTiers.some((t) => Number(t.amount) === amount)) {
      return {
        isValid: false,
        error: `A prize with ${amount.toLocaleString('en-US')} coins already exists`,
      };
    }
    return { isValid: true };
  };

  // Validate amount is greater than all lower tier amounts
  const isAmountGreaterThanLowerTiers = (
    tierNumber: number,
    amount: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    const lowerTiers = existingTiers.filter((t) => t.prizeTier < tierNumber);
    
    for (const tier of lowerTiers) {
      if (Number(tier.amount) >= amount) {
        return {
          isValid: false,
          error: `Tier ${tierNumber} amount (${amount.toLocaleString('en-US')}) must be greater than Tier ${tier.prizeTier} (${Number(tier.amount).toLocaleString('en-US')})`,
        };
      }
    }
    return { isValid: true };
  };

  // Validate amount is less than all higher tier amounts
  const isAmountLessThanHigherTiers = (
    tierNumber: number,
    amount: number,
    existingTiers: PrizeTier[]
  ): { isValid: boolean; error?: string } => {
    const higherTiers = existingTiers.filter((t) => t.prizeTier > tierNumber);
    
    for (const tier of higherTiers) {
      if (Number(tier.amount) <= amount) {
        return {
          isValid: false,
          error: `Tier ${tierNumber} amount (${amount.toLocaleString('en-US')}) must be less than Tier ${tier.prizeTier} (${Number(tier.amount).toLocaleString('en-US')})`,
        };
      }
    }
    return { isValid: true };
  };

  // Main orchestration function - runs all validations
  const validateTierOrder = (
    tierNumber: number,
    amount: number,
    existingTiers: PrizeTier[],
    editingTierId?: string
  ): { isValid: boolean; error?: string } => {
    // Filter out the tier being edited
    const otherTiers = existingTiers.filter((t) => t.id !== editingTierId);

    // Run validations in order, returning first failure
    const validations = [
      () => isTierNumberUnique(tierNumber, otherTiers),
      () => isAmountUnique(amount, otherTiers),
      () => isAmountGreaterThanLowerTiers(tierNumber, amount, otherTiers),
      () => isAmountLessThanHigherTiers(tierNumber, amount, otherTiers),
    ];

    for (const validate of validations) {
      const result = validate();
      if (!result.isValid) {
        return result;
      }
    }

    return { isValid: true };
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreatePrizeTierRequest) => api.prize.createPrizeTier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Prize tier created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => handleMutationError(error, 'Failed to create prize tier'),
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
        description: 'Prize tier updated successfully',
      });
      setEditingTier(null);
      resetForm();
    },
    onError: (error) => handleMutationError(error, 'Failed to update prize tier'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.prize.deletePrizeTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPrizeTiers'] });
      queryClient.invalidateQueries({ queryKey: ['prizeTiers'] });
      toast({
        title: 'Success!',
        description: 'Prize tier deleted successfully',
      });
      setDeletingTier(null);
    },
    onError: (error) => handleMutationError(error, 'Failed to delete prize tier'),
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setValidationError('Prize name is required');
      return;
    }

    // Validate tier ordering
    const validation = validateTierOrder(
      formData.prizeTier,
      formData.amount,
      tiers || []
    );

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
        description: getMessage(error) || 'Failed to upload prize image. Please try again.',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingTier) return;
    if (!formData.name.trim()) {
      setValidationError('Prize name is required');
      return;
    }

    // Validate tier ordering
    const validation = validateTierOrder(
      formData.prizeTier,
      formData.amount,
      tiers || [],
      editingTier.id
    );

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
        description: getMessage(error) || 'Failed to upload prize image. Please try again.',
      });
    }
  };

  const handleEdit = (tier: PrizeTier) => {
    setFormData({
      prizeTier: tier.prizeTier,
      amount: tier.amount,
      name: tier.name,
      description: tier.description || '',
      imageUrl: tier.imageUrl || '',
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
              <CardTitle>Prize Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage prize tiers that users can achieve
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tier
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTiers
                .sort((a, b) => a.prizeTier - b.prizeTier)
                .map((tier) => (
                  <Card key={tier.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex flex-col">
                        {/* Content section */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                              {tier.prizeTier}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{tier.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {tier.amount.toLocaleString('en-US')} coins
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(tier)}
                            >
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
                        {tier.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {tier.description}
                          </p>
                        )}
                        
                        {/* Image section */}
                        {tier.imageUrl && (
                          <div className="w-full aspect-[16/9] border-t pt-2 md:pt-4">
                            <img
                              src={getThumbnailUrl(tier.imageUrl)}
                              alt={tier.name}
                              className="w-full h-full rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || editingTier !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTier(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Prize Tier' : 'Create Prize Tier'}
            </DialogTitle>
            <DialogDescription>
              {editingTier
                ? 'Update the prize tier details. This will create a new version and deactivate the old one.'
                : 'Add a new prize tier for users to achieve.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prizeTier">
                Tier Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prizeTier"
                type="number"
                min="1"
                value={formData.prizeTier}
                onChange={(e) => {
                  setFormData({ ...formData, prizeTier: parseInt(e.target.value) || 1 });
                  setValidationError('');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                Coin Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: parseInt(e.target.value) || 0 });
                  setValidationError('');
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                Prize Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setValidationError('');
                }}
                placeholder="e.g., Collector"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Prize description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Prize Image</Label>
              {(imageUpload.previewUrl || (editingTier && formData.imageUrl && !imageUpload.selectedFile)) ? (
                <div className="relative">
                  <img
                    src={imageUpload.previewUrl || getThumbnailUrl(formData.imageUrl)}
                    alt="Preview"
                    className="w-full aspect-[16/9] rounded object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      imageUpload.clearImage();
                      setFormData({ ...formData, imageUrl: '' });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`w-full flex flex-col items-center justify-center bg-secondary rounded-xl py-4 px-2 cursor-pointer border border-border ${isDragging ? 'ring-2 ring-primary' : ''} ${imageError ? 'border-destructive' : ''}`}
                  style={{ minHeight: 120 }}
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
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center mb-1 relative">
                      <div
                        className="rounded-full bg-background border-4 border-border flex items-center justify-center"
                        style={{ width: 44, height: 44 }}
                      >
                        {imageUpload.isValidating ? (
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        ) : (
                          <img
                            src="/icons/cloud_upload.png"
                            alt="Upload"
                            style={{ width: 28, height: 19, objectFit: 'contain', display: 'block' }}
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-center text-muted-foreground" style={{ lineHeight: '1.7' }}>
                      <span className="text-primary font-medium">Click to upload</span> or drag and drop
                      <br />
                      <span className="text-muted-foreground text-[12px]">JPEG, PNG, or WebP</span>
                      <br />
                      <span className="text-muted-foreground text-[10px]">Recommended aspect ratio: 16:9</span>
                      <br />
                      <span className="text-muted-foreground text-[10px]">Resolution: 1920x1080px</span>
                    </span>
                  </div>
                </div>
              )}
              {imageError && (
                <p className="text-sm text-red-500">{imageError}</p>
              )}
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingTier(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTier ? handleUpdate : handleCreate}
              disabled={isUploading || createMutation.isPending || updateMutation.isPending}
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
              Are you sure you want to delete &quot;{deletingTier?.name}&quot;? This will
              deactivate the tier but preserve it in history for data integrity.
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
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

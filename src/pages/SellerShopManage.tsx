import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, ShoppingCart, DollarSign, Pencil, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useImageCropper } from '@/hooks/useImageCropper';
import PhotoCropper from '@/components/PhotoCropper';
import { PrizeBrand } from '@/types/prize';
import { CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface SellerOfferOrder {
  id: string;
  status: string;
  offerAmount?: number;
  counterOfferAmount?: number;
  offerNotes?: string;
  totalPrice: number;
  createdAt: string;
  user?: {
    username: string;
    email: string;
  };
  prizeConfig?: {
    name: string;
    category: string;
  };
}

export default function SellerShopManage() {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload hook
  const imageUpload = useImageCropper({
    checkNSFW: false,
    onError: error => setImageError(error),
  });

  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageLayout, setImageLayout] = useState<'single' | 'double'>('single');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SellerOfferOrder | null>(null);
  const [isCounterDialogOpen, setIsCounterDialogOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [shopName, setShopName] = useState('');
  const [isEditingShopName, setIsEditingShopName] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    amount: 0,
    stock: 1,
    purchaseOption: 'buy_only' as 'buy_only' | 'offers_only' | 'both',
    brand: 'other' as PrizeBrand,
    displayOrder: 0,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['seller-shop-items-manage'],
    queryFn: () => api.prize.getMyShopItems(),
    enabled: !!session?.isSeller,
  });

  const { data: offersResponse, isLoading: isOffersLoading } = useQuery<{
    data: SellerOfferOrder[];
    total: number;
  }>({
    queryKey: ['seller-shop-offers-manage'],
    queryFn: () => api.prize.getMyShopOffers({ status: 'all' }),
    enabled: !!session?.isSeller,
  });

  const offers = offersResponse?.data || [];

  // Sync shop name when session updates
  useEffect(() => {
    if (session?.user && !isEditingShopName) {
      setShopName(session.user.shopName || '');
    }
  }, [session?.user?.id, isEditingShopName]);

  const handleImageUpload = async (): Promise<string> => {
    if (!imageUpload.selectedFile) {
      return form.imageUrl; // Return existing URL if no new file
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
      throw error; // Re-throw to be caught by createItem mutation
    } finally {
      setIsUploading(false);
    }
  };

  const createItem = useMutation({
    mutationFn: async () => {
      const imageUrl = await handleImageUpload();
      const payload = {
        ...form,
        imageUrl,
        category: 'slab' as const, // All shop items are slabs
      };

      if (editingItemId) {
        // Update existing item
        return api.prize.updateMyShopItem(editingItemId, payload);
      } else {
        // Create new item
        return api.prize.createMyShopItem(payload);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: editingItemId ? 'Item updated successfully.' : 'Item added to your shop.',
      });
      setForm({
        name: '',
        description: '',
        imageUrl: '',
        amount: 0,
        stock: 1,
        purchaseOption: 'buy_only',
        brand: 'other',
        displayOrder: 0,
      });
      imageUpload.clearImage();
      setImageError(null);
      setImageLayout('single');
      setEditingItemId(null);
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-manage'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: editingItemId ? 'Failed to update item.' : 'Failed to add item to shop.',
        variant: 'destructive',
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.prize.deleteMyShopItem(id),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Item removed from your shop.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items-manage'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-items', session?.user?.username] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove item.',
        variant: 'destructive',
      });
    },
  });

  const counterOfferMutation = useMutation({
    mutationFn: (data: { orderId: string; counterOfferAmount: number; offerNotes?: string }) =>
      api.prize.counterMyShopOffer(data.orderId, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Counter offer sent successfully.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
      setIsCounterDialogOpen(false);
      setSelectedOffer(null);
      setCounterAmount('');
      setCounterNotes('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send counter offer.',
        variant: 'destructive',
      });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: (orderId: string) => api.prize.acceptMyShopOffer(orderId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Offer accepted. Checkout link sent to buyer.',
      });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to accept offer.',
        variant: 'destructive',
      });
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: (orderId: string) => api.prize.rejectMyShopOffer(orderId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Offer rejected.' });
      queryClient.invalidateQueries({ queryKey: ['seller-shop-offers-manage'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reject offer.',
        variant: 'destructive',
      });
    },
  });

  const updateShopNameMutation = useMutation({
    mutationFn: (newShopName: string) => api.user.updateProfile({ shopName: newShopName }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Shop name updated successfully.' });
      setIsEditingShopName(false);
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shops'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update shop name.',
        variant: 'destructive',
      });
    },
  });

  // Drag and drop handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      imageUpload.handleFileSelect(file);
      setForm(p => ({ ...p, imageUrl: '' })); // Clear URL when file is uploaded
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      imageUpload.handleFileSelect(file);
      setForm(p => ({ ...p, imageUrl: '' })); // Clear URL when file is dropped
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleEditItem = (item: any) => {
    setEditingItemId(item.id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      amount: item.amount || 0,
      stock: item.stock || 0,
      purchaseOption: item.purchaseOption || 'buy_only',
      brand: item.brand || 'other',
      displayOrder: item.displayOrder || 0,
    });
    imageUpload.clearImage();
    setImageError(null);
    // Scroll to top on mobile, form is already visible on desktop
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setForm({
      name: '',
      description: '',
      imageUrl: '',
      amount: 0,
      stock: 1,
      purchaseOption: 'buy_only',
      brand: 'other',
      displayOrder: 0,
    });
    imageUpload.clearImage();
    setImageError(null);
    setImageLayout('single');
  };

  const handleOpenCounterDialog = (order: SellerOfferOrder) => {
    setSelectedOffer(order);
    setCounterAmount(order.offerAmount?.toString() || '');
    setCounterNotes('');
    setIsCounterDialogOpen(true);
  };

  const handleSubmitCounter = () => {
    if (!selectedOffer) return;

    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid counter offer amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount === selectedOffer.offerAmount) {
      toast({
        title: 'Validation Error',
        description: "Counter offer amount must be different from the buyer's offer",
        variant: 'destructive',
      });
      return;
    }

    counterOfferMutation.mutate({
      orderId: selectedOffer.id,
      counterOfferAmount: amount,
      offerNotes: counterNotes || undefined,
    });
  };

  const getOfferStatusClass = (status: string) => {
    switch (status) {
      case 'offer_made':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'countered':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'offer_accepted':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'paid':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (!session?.isSeller) {
    return (
      <MainLayout>
        <Card>
          <CardHeader>
            <CardTitle>Seller shop access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account is not approved as a seller yet.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Shop Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Shop Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditingShopName ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shop Name</p>
                  <p className="text-lg font-semibold mt-1">
                    {shopName || session?.user?.shopName || (session?.user?.username ? `${session.user.username}'s Shop` : 'Your Shop')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingShopName(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Shop Name</Label>
                  <Input
                    placeholder={`${session?.user?.username}'s Shop`}
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use your username</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingShopName(false);
                      setShopName(session?.user?.shopName || '');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateShopNameMutation.mutate(shopName)}
                    disabled={updateShopNameMutation.isPending}
                  >
                    {updateShopNameMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile: Preview at top, Desktop: Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
          {/* Form Section */}
          <Card className="order-2 lg:order-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {editingItemId ? 'Edit Shop Item' : 'Manage Shop Inventory'}
                  </CardTitle>
                  {editingItemId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Update the details for your shop item
                    </p>
                  )}
                </div>
                {editingItemId && (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Charizard PSA 10"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Price (USD) *</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0 = unlimited"
                    value={form.stock}
                    onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Purchase Option *</Label>
                <Select
                  value={form.purchaseOption}
                  onValueChange={(value: 'buy_only' | 'offers_only' | 'both') =>
                    setForm(p => ({ ...p, purchaseOption: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy_only">Buy Only</SelectItem>
                    <SelectItem value="offers_only">Offers Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Brand *</Label>
                <Select
                  value={form.brand}
                  onValueChange={(value: PrizeBrand) => setForm(p => ({ ...p, brand: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pokemon">Pokémon</SelectItem>
                    <SelectItem value="one_piece">One Piece</SelectItem>
                    <SelectItem value="sports">Sports Cards</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Image Layout</Label>
                <Select
                  value={imageLayout}
                  onValueChange={(value: 'single' | 'double') => setImageLayout(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Slab (4" × 6.5")</SelectItem>
                    <SelectItem value="double">Double Slab (8" × 6.5")</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose single for one side, or double for front & back side-by-side
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Item description..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.displayOrder}
                  onChange={e =>
                    setForm(p => ({ ...p, displayOrder: Number(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers show first (e.g. 1 shows before 2).
                </p>
              </div>

              <div className="space-y-2.5">
                <Label className="text-base font-medium">Prize Image</Label>
                <div className="grid gap-3">
                  {/* Image Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleUploadClick}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1 text-primary">Click to upload</p>
                    <p className="text-xs text-muted-foreground mb-1">or drag and drop</p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP
                      <br />
                      Aspect ratio 8:13 • 1200×1950px
                    </p>
                  </div>

                  {/* Image Cropper */}
                  {imageUpload.fileToCrop && (
                    <PhotoCropper
                      file={imageUpload.fileToCrop}
                      onClose={imageUpload.cancelCrop}
                      onCrop={imageUpload.handleCropComplete}
                      cropperProps={{
                        aspect: imageLayout === 'double' ? 2 / 1 : 8 / 13,
                      }}
                      resizerProps={{
                        maxWidth: imageLayout === 'double' ? 1600 : 1200,
                        maxHeight: imageLayout === 'double' ? 800 : 1950,
                        compressFormat: 'JPEG',
                        quality: 90,
                      }}
                    />
                  )}

                  {/* Image Error */}
                  {imageError && (
                    <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                      <p className="text-sm text-destructive">{imageError}</p>
                    </div>
                  )}

                  {/* Image URL Input (Alternative) */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or use URL</span>
                    </div>
                  </div>

                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={e => {
                      const url = e.target.value;
                      setForm(p => ({ ...p, imageUrl: url }));
                      // Clear uploaded file when URL is entered
                      if (url && imageUpload.selectedFile) {
                        imageUpload.clearImage();
                      }
                    }}
                    disabled={!!imageUpload.selectedFile || !!imageUpload.previewUrl}
                  />
                </div>
              </div>

              <Button
                onClick={() => createItem.mutate()}
                disabled={createItem.isPending || !form.name || form.amount <= 0 || isUploading}
                className="w-full"
              >
                {createItem.isPending || isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isUploading ? 'Uploading...' : editingItemId ? 'Update Item' : 'Add Item'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Seller shop purchases are USD-only. CadeCoins are disabled for these items.
              </p>
            </CardContent>
          </Card>

          {/* Live Preview Section */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:h-fit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Preview</CardTitle>
                <p className="text-xs text-muted-foreground">
                  This is how your item will appear in the shop
                </p>
              </CardHeader>
              <CardContent>
                {/* Prize Card Preview */}
                <div className="max-w-[280px] mx-auto">
                  <Card
                    className={cn(
                      'flex flex-col overflow-hidden rounded-xl',
                      'relative bg-card-grid-bg border border-card-grid-border shadow-[0px_2px_8px_0px_rgba(0,0,0,0.5)]'
                    )}
                  >
                    <CardHeader className="p-0 relative">
                      {/* Prize Image */}
                      <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted flex items-center justify-center p-2">
                        {imageUpload.previewUrl || form.imageUrl ? (
                          <img
                            src={imageUpload.previewUrl || form.imageUrl}
                            alt="Prize preview"
                            className="w-full h-full object-contain"
                            onError={e => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="text-muted-foreground text-sm text-center">No image</div>
                        )}

                        {/* Stock Badge */}
                        {form.stock === 0 && (
                          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-semibold">
                            Out of Stock
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
                      {/* Prize Name */}
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                        {form.name || 'Prize Name'}
                      </h3>

                      {/* Description */}
                      {form.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {form.description}
                        </p>
                      )}

                      {/* Price */}
                      <div className="mt-auto pt-1">
                        {form.purchaseOption !== 'offers_only' ? (
                          <span className="text-xl font-bold text-primary">
                            ${form.amount ? form.amount.toFixed(2) : '0.00'}
                          </span>
                        ) : (
                          <div className="text-sm font-semibold text-muted-foreground">
                            Offers Only
                          </div>
                        )}
                      </div>

                      {/* Stock Count */}
                      {typeof form.stock === 'number' && (
                        <p className="text-[10px] text-muted-foreground">
                          Stock: {form.stock} {form.stock === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="p-3 pt-0 flex gap-2">
                      {(form.purchaseOption === 'buy_only' || form.purchaseOption === 'both') && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-primary text-black hover:bg-primary/90 h-8 text-xs pointer-events-none"
                          disabled
                        >
                          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                          Buy Now
                        </Button>
                      )}
                      {(form.purchaseOption === 'offers_only' ||
                        form.purchaseOption === 'both') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 bg-transparent border-[#D4FF00] text-[#D4FF00] h-8 text-xs pointer-events-none"
                          disabled
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Make Offer
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Shop Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading items...
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border rounded-md p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${item.amount} USD • Stock {item.stock}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      disabled={deleteItem.isPending}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItem.mutate(item.id)}
                      disabled={deleteItem.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offer Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review, counter, accept, or reject offers on your shop items.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isOffersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading offers...
              </div>
            ) : offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No offers yet.</p>
            ) : (
              offers.map(order => (
                <div key={order.id} className="border rounded-md p-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{order.prizeConfig?.name || 'Shop Item'}</div>
                      <div className="text-xs text-muted-foreground">
                        Buyer: {order.user?.username || 'Unknown'} • Offer: $
                        {order.offerAmount?.toFixed(2) || '0.00'}
                      </div>
                      {order.counterOfferAmount ? (
                        <div className="text-xs text-muted-foreground">
                          Countered at: ${order.counterOfferAmount.toFixed(2)}
                        </div>
                      ) : null}
                    </div>
                    <Badge className={cn('border', getOfferStatusClass(order.status))}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {order.offerNotes ? (
                    <p className="text-xs italic text-muted-foreground">"{order.offerNotes}"</p>
                  ) : null}

                  {order.status === 'offer_made' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptOfferMutation.mutate(order.id)}
                        disabled={acceptOfferMutation.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCounterDialog(order)}
                        disabled={counterOfferMutation.isPending}
                      >
                        Counter
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectOfferMutation.mutate(order.id)}
                        disabled={rejectOfferMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : order.status === 'countered' ? (
                    <div className="text-xs text-muted-foreground">
                      Waiting for buyer response to counter offer.
                    </div>
                  ) : order.status === 'offer_accepted' ? (
                    <div className="text-xs text-muted-foreground">
                      Accepted. Buyer has been emailed a checkout link.
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Dialog open={isCounterDialogOpen} onOpenChange={setIsCounterDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Counter Offer</DialogTitle>
              <DialogDescription>
                {selectedOffer ? (
                  <span>
                    Buyer offered ${selectedOffer.offerAmount?.toFixed(2) || '0.00'} for{' '}
                    {selectedOffer.prizeConfig?.name || 'this item'}.
                  </span>
                ) : (
                  'Make a counter offer for this item.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="counterAmount">Counter Amount (USD)</Label>
                <Input
                  id="counterAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={counterAmount}
                  onChange={e => setCounterAmount(e.target.value)}
                  placeholder="Enter counter amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterNotes">Notes (Optional)</Label>
                <Textarea
                  id="counterNotes"
                  value={counterNotes}
                  onChange={e => setCounterNotes(e.target.value)}
                  placeholder="Optional note for buyer"
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCounterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCounter} disabled={counterOfferMutation.isPending}>
                {counterOfferMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  'Send Counter Offer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

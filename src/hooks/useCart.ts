import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { CartSummary, CartCountResponse, AddToCartRequest, UpdateCartItemRequest, CartCheckoutRequest, BundleOfferRequest } from '@/types/cart';
import { useToast } from '@/hooks/use-toast';

export const CART_QUERY_KEY = ['cart'];
export const CART_COUNT_QUERY_KEY = ['cartCount'];

/**
 * Hook to fetch the full cart summary grouped by seller
 */
export const useCartSummary = (enabled = true) => {
  return useQuery<CartSummary>({
    queryKey: CART_QUERY_KEY,
    queryFn: () => api.cart.getCartSummary(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    enabled,
  });
};

/**
 * Hook to fetch cart item count (for nav badge)
 */
export const useCartCount = (enabled = true) => {
  return useQuery<CartCountResponse>({
    queryKey: CART_COUNT_QUERY_KEY,
    queryFn: () => api.cart.getCartCount(),
    staleTime: 30 * 1000,
    retry: 1,
    enabled,
  });
};

/**
 * Hook to add an item to cart
 */
export const useAddToCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: AddToCartRequest) => api.cart.addToCart(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
      toast({
        title: 'Added to cart',
        description: 'Item has been added to your cart.',
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to add item to cart';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to update cart item quantity
 */
export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      api.cart.updateCartItem(cartItemId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to update item';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to remove item from cart
 */
export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (cartItemId: string) => api.cart.removeCartItem(cartItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
      toast({
        title: 'Removed',
        description: 'Item removed from your cart.',
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to remove item';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to empty entire cart
 */
export const useClearCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.cart.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
      toast({
        title: 'Cart emptied',
        description: 'All items have been removed from your cart.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to empty cart',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to checkout cart
 */
export const useCartCheckout = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CartCheckoutRequest) => api.cart.checkout(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
      if (data.stripeSessionUrl) {
        window.location.href = data.stripeSessionUrl;
      } else {
        toast({
          title: 'Order placed!',
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Checkout failed';
      toast({
        title: 'Checkout Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook to submit a bundle offer
 */
export const useSubmitBundleOffer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BundleOfferRequest) => api.cart.submitBundleOffer(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CART_COUNT_QUERY_KEY });
      toast({
        title: 'Offer submitted!',
        description: data.message,
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to submit offer';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
};

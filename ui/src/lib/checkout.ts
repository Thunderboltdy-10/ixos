/**
 * Build a direct Lemon Squeezy checkout URL
 * Opens in the user's browser with pre-filled user info
 */
export function buildCheckoutUrl(variantId: string, userId?: string, email?: string): string {
  const base = `https://ixos.lemonsqueezy.com/checkout/buy/${variantId}`;
  const params = new URLSearchParams();

  // Pass user ID so webhook can link purchase to account
  if (userId) {
    params.set('checkout[custom][clerk_user_id]', userId);
  }

  // Pre-fill email for convenience
  if (email) {
    params.set('checkout[email]', email);
  }

  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Get the variant ID from environment
 */
export function getVariantId(): string | undefined {
  return (import.meta as any).env?.VITE_LEMONSQUEEZY_PRO_VARIANT_ID;
}

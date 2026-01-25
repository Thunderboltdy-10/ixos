const LEMON_API_BASE = "https://api.lemonsqueezy.com/v1";

type LemonSubscriptionResponse = {
  data?: {
    id?: string | number;
    attributes?: {
      status?: string;
      ends_at?: string | null;
      renews_at?: string | null;
      trial_ends_at?: string | null;
      urls?: {
        customer_portal?: string | null;
        update_payment_method?: string | null;
        customer_portal_update_subscription?: string | null;
      };
    };
  };
};

function getLemonApiKey() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error("LEMONSQUEEZY_API_KEY is not set");
  }
  return apiKey;
}

export async function fetchLemonSubscription(subscriptionId: string) {
  const apiKey = getLemonApiKey();
  const res = await fetch(`${LEMON_API_BASE}/subscriptions/${subscriptionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Lemon subscription (${res.status}): ${text}`);
  }

  const json = (await res.json()) as LemonSubscriptionResponse;
  return json;
}

export async function getLemonCustomerPortalUrl(subscriptionId: string) {
  const response = await fetchLemonSubscription(subscriptionId);
  return response.data?.attributes?.urls?.customer_portal ?? null;
}


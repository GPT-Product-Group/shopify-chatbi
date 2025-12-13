import { prisma } from "./db";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";
const DEFAULT_SCOPES =
  "read_orders,read_products,read_customers,read_inventory";

export function getRequiredScopes() {
  const scopes = process.env.SHOPIFY_SCOPES ?? DEFAULT_SCOPES;
  return scopes
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

type GraphqlParams = {
  shop: string;
  accessToken: string;
  query: string;
  variables?: Record<string, unknown>;
};

export async function runShopifyQuery<T = unknown>({
  shop,
  accessToken,
  query,
  variables,
}: GraphqlParams): Promise<T> {
  const endpoint = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Shopify API error (${res.status} ${res.statusText}): ${text}`,
    );
  }

  const data = (await res.json()) as { data?: T; errors?: unknown };
  if (data.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return (data.data ?? (data as unknown as T)) as T;
}

export async function getShopAccessToken(shopDomain: string) {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { accessToken: true },
  });
  return shop?.accessToken ?? null;
}

export async function getMissingScopes(
  shop: string,
  accessToken: string,
  requiredScopes = getRequiredScopes(),
) {
  const res = await fetch(
    `https://${shop}/admin/oauth/access_scopes.json`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `获取 Shopify 授权 scope 失败 (${res.status} ${res.statusText}): ${text}`,
    );
  }

  const data = (await res.json()) as { access_scopes: { handle: string }[] };
  const granted = new Set(
    data.access_scopes.map((scope) => scope.handle.trim()).filter(Boolean),
  );

  return requiredScopes.filter((scope) => !granted.has(scope));
}

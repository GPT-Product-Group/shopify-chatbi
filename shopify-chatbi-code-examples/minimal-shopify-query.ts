/**
 * Minimal Shopify GraphQL runner extracted from shopify-chatbi.
 *
 * Inputs (environment variables):
 * - SHOP_DOMAIN: your shop domain, e.g. `your-store.myshopify.com`
 * - SHOP_ACCESS_TOKEN: Admin API access token (same one used by the app)
 * - SHOPIFY_GRAPHQL: GraphQL query string to execute (single-line or multi-line)
 *
 * Usage:
 *   pnpm ts-node examples/minimal-shopify-query.ts
 *
 * The script will:
 * 1) Validate required inputs
 * 2) Check Shopify scopes using getMissingScopes
 * 3) Run runShopifyQuery and print raw JSON to stdout
 */
import {
  getMissingScopes,
  getRequiredScopes,
  runShopifyQuery,
} from "../src/lib/shopify";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

async function main() {
  try {
    const shopDomain = requireEnv("SHOP_DOMAIN");
    const accessToken = requireEnv("SHOP_ACCESS_TOKEN");
    const query = requireEnv("SHOPIFY_GRAPHQL");

    console.error("[info] 正在校验 Shopify 授权 scope...");
    const requiredScopes = getRequiredScopes();
    const missingScopes = await getMissingScopes(
      shopDomain,
      accessToken,
      requiredScopes,
    );

    if (missingScopes.length > 0) {
      console.error(
        `[error] Shopify 应用缺少以下授权：${missingScopes.join(", ")}。请重新安装应用以授予这些 scope。`,
      );
      process.exit(1);
    }

    console.error("[info] 授权通过，正在调用 Shopify...");
    const data = await runShopifyQuery({
      shop: shopDomain,
      accessToken,
      query,
    });

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(
      `[error] ${(err instanceof Error ? err.message : "未知错误") as string}`,
    );
    process.exit(1);
  }
}

void main();

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop") ?? "";
  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "请提供合法的 shop 域名（如 mystore.myshopify.com）" },
      { status: 400 },
    );
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const scopes =
    process.env.SHOPIFY_SCOPES ??
    "read_orders,read_products,read_customers,read_inventory";

  if (!clientId) {
    return NextResponse.json(
      { error: "缺少 SHOPIFY_API_KEY 环境变量" },
      { status: 500 },
    );
  }

  const redirectUri = new URL(
    "/api/auth/shopify/callback",
    req.nextUrl.origin,
  ).toString();
  const state = randomUUID();

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("shopify_oauth_state", JSON.stringify({ state, shop }), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 10 * 60, // 10 min
  });
  return res;
}

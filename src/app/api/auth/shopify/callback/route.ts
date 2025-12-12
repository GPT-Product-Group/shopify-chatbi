import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function verifyHmac(search: URLSearchParams, secret: string) {
  const hmac = search.get("hmac") ?? "";
  const pairs: string[] = [];
  search.forEach((value, key) => {
    if (key === "hmac" || key === "signature") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const data = pairs.join("&");
  const hash = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const shop = search.get("shop") ?? "";
  const code = search.get("code");
  const state = search.get("state");

  if (!shop || !shop.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "shop 参数无效" },
      { status: 400 },
    );
  }

  const stateCookie = req.cookies.get("shopify_oauth_state")?.value;
  if (!stateCookie) {
    return NextResponse.json({ error: "缺少 state" }, { status: 400 });
  }

  let parsedState: { state: string; shop: string } | null = null;
  try {
    parsedState = JSON.parse(stateCookie);
  } catch {
    return NextResponse.json({ error: "state 无效" }, { status: 400 });
  }

  if (!state || state !== parsedState?.state || shop !== parsedState?.shop) {
    return NextResponse.json({ error: "state 不匹配" }, { status: 400 });
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "缺少 SHOPIFY_API_SECRET 环境变量" },
      { status: 500 },
    );
  }

  if (!verifyHmac(search, secret)) {
    return NextResponse.json({ error: "HMAC 校验失败" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "缺少 code" }, { status: 400 });
  }

  // 交换 token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json(
      { error: `获取 access_token 失败: ${text}` },
      { status: 400 },
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    scope?: string;
  };

  await prisma.shop.upsert({
    where: { domain: shop },
    update: { accessToken: tokenJson.access_token },
    create: { domain: shop, accessToken: tokenJson.access_token },
  });

  const redirectTo =
    req.nextUrl.searchParams.get("redirect") ??
    "/";

  const res = NextResponse.redirect(`${redirectTo}?installed=1&shop=${shop}`);
  res.cookies.set("shopify_oauth_state", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}

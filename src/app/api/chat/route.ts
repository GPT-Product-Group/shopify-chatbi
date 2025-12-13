import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getShopAccessToken, runShopifyQuery } from "@/lib/shopify";
import { callClaude } from "@/lib/claude";
import { buildQueryPrompt } from "@/lib/prompts/text-to-graphql";

type ChatRequest = {
  message: string;
  shopDomain: string;
  accessToken?: string;
  conversationId?: string;
};

function sanitizeGraphqlQuery(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/\s*```$/, "");

    return withoutFence.trim();
  }

  return trimmed;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest | null = null;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "请求体需为 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "缺少 message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.shopDomain?.trim()) {
    return new Response(JSON.stringify({ error: "缺少 shopDomain" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const accessTokenFromRequest = body.accessToken?.trim();
  const accessToken =
    accessTokenFromRequest ?? (await getShopAccessToken(body.shopDomain));
  if (!accessToken) {
    return new Response(
      JSON.stringify({
        error: "未找到店铺凭证，请先完成 Shopify 安装授权，或在请求中提供 accessToken。",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (payload: unknown) => {
    await writer.write(encoder.encode(JSON.stringify(payload) + "\n"));
  };

  (async () => {
    try {
      await send({ type: "status", message: "正在生成查询..." });

      const queryPrompt = buildQueryPrompt(body!.message);
      const rawGraphql = await callClaude(queryPrompt, { maxTokens: 500 });
      const graphql = sanitizeGraphqlQuery(rawGraphql);
      await send({ type: "query", query: graphql });

      await send({ type: "status", message: "正在调用 Shopify..." });
      const shopData = await runShopifyQuery({
        shop: body!.shopDomain,
        accessToken,
        query: graphql,
      });
      await send({ type: "data", data: shopData });

      await send({ type: "status", message: "正在生成解读..." });
      const explanation = await callClaude(
        [
          { role: "system", content: "你是一个数据分析助手，请用简洁中文解读结果。" },
          {
            role: "user",
            content: `用户问题：${body!.message}\nGraphQL 查询：${graphql}\n查询结果 JSON：${JSON.stringify(shopData)}`,
          },
        ],
        { maxTokens: 700 },
      );

      // 保存会话（先 upsert 店铺，再创建对话）
      const shop = await prisma.shop.upsert({
        where: { domain: body!.shopDomain },
        update: accessTokenFromRequest ? { accessToken } : {},
        create: { domain: body!.shopDomain, accessToken },
      });

      const conversationId =
        body!.conversationId ??
        (
          await prisma.conversation.create({
            data: {
              shopId: shop.id,
              messages: {
                create: [
                  { role: "user", content: body!.message },
                  {
                    role: "assistant",
                    content: explanation,
                    data: JSON.stringify(shopData),
                  },
                ],
              },
            },
            include: { messages: true },
          })
        ).id;

      await send({
        type: "answer",
        conversationId,
        query: graphql,
        data: shopData,
        answer: explanation,
      });
    } catch (err) {
      console.error(err);
      await send({
        type: "error",
        message: err instanceof Error ? err.message : "服务器错误",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

# shopify-chatbi-code-examples

最简 Shopify 查询示例，直接复用 `shopify-chatbi` 中的 TypeScript 逻辑。输入 GraphQL 查询与凭证，返回 Shopify 原始 JSON 输出，包含基础的 scope 校验和错误提示。

## 运行要求
- Node.js 18+
- 安装依赖：`pnpm install`
- 环境变量：
  - `SHOP_DOMAIN`：店铺域名，例如 `your-store.myshopify.com`
  - `SHOP_ACCESS_TOKEN`：Admin API Token（与主项目相同的令牌）
  - `SHOPIFY_GRAPHQL`：待执行的 GraphQL 查询字符串

> 提示：Scopes 默认为主项目的 `read_orders,read_products,read_customers,read_inventory`，可通过 `SHOPIFY_SCOPES` 覆盖。

## 快速开始
```bash
# 设置环境变量并执行
SHOP_DOMAIN=your-store.myshopify.com \
SHOP_ACCESS_TOKEN=shpat_xxx \
SHOPIFY_GRAPHQL='query { shop { name } }' \
pnpm ts-node shopify-chatbi-code-examples/minimal-shopify-query.ts
```

脚本会先校验缺失的 scopes（若缺少会提示重新安装应用），然后调用 Shopify Admin GraphQL API，并将原始 JSON 打印到标准输出。

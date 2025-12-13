## Shopify scope error：Access denied for orders

When the app starts, you might see an error like:

```
Shopify GraphQL errors: [{"message":"Access denied for orders field." ... "code":"ACCESS_DENIED"}]
```

This means the app was installed without the `read_orders` scope, so Shopify blocks queries to `orders`.

### How to fix

1. Ensure the `SHOPIFY_SCOPES` environment variable includes `read_orders`. The default in [`src/app/api/auth/shopify/install/route.ts`](src/app/api/auth/shopify/install/route.ts) already sets
   `"read_orders,read_products,read_customers,read_inventory"`, so most users only need to keep the default value.
2. Reinstall the Shopify app after updating scopes. OAuth scopes are captured during installation, so simply changing the environment variable is not enough—you must reinstall to grant the new scope.
3. Verify the app is connected to a store that allows reading orders (a development store or one where you have access to order data).

After reinstalling with the correct scopes, restart the dev server (default port `3300`) and the error should disappear.

const { ApiVersion, shopifyApi } = require("@shopify/shopify-api");
require("@shopify/shopify-api/adapters/node");
const ShopifyNode = require("shopify-api-node");
const { SHOPIFY_STORE_URL } = require("./constants.js");

const shopifyAccessToken = "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";

const getShopifyInstance = () => {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
    scopes: process.env.SHOPIFY_API_SCOPES.split(","),
    hostName: `${process.env.HOST}:${process.env.PORT}`,
    hostScheme: process.env.SHOPIFY_PROTOCOL,
    apiVersion: ApiVersion.October23,
    isEmbeddedApp: false,
  });
  return shopify;
};

const getShopifyNodeInstance = () =>
  new ShopifyNode({
    accessToken: shopifyAccessToken,
    shopName: SHOPIFY_STORE_URL,
    maxRetries: 5,
    timeout: 10000,
    apiVersion: process.env.SHOPIFY_API_VERSION,
  });

module.exports = { getShopifyInstance, getShopifyNodeInstance };

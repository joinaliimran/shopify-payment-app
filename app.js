const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const {
  getShopifyInstance,
  getShopifyNodeInstance,
} = require("./utils/helpers");
const {
  validateCreateCheckout,
  validationMiddleware,
} = require("./middleware/validation-middleware");
const { SHOPIFY_STORE_URL } = require("./utils/constants");

const app = express();
const shopifyInstance = getShopifyInstance();
const shopifyNodeInstance = getShopifyNodeInstance();

app.use(cors());
app.use(
  bodyParser.json({
    limit: "50mb",
    verify(req, res, buf) {
      if (req.headers["x-shopify-hmac-sha256"]) {
        req.rawBody = buf.toString();
      }
    },
  })
);

app.get("/auth", async (req, res) => {
  try {
    return await shopifyInstance.auth.begin({
      shop: SHOPIFY_STORE_URL,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (err) {
    `${process.env.SHOPIFY_TO_FRONTEND_URL}/connect-shopify?error=Error occured while connecting with shopify`;
  }
});

app.get("/auth/callback", async (req, res) => {
  const shopifyAuthData = await shopifyInstance.auth.callback({
    rawRequest: req,
    rawResponse: res,
  });

  if (!shopifyAuthData?.session?.accessToken || !shopifyAuthData?.session?.shop)
    res.redirect(
      `${process.env.SHOPIFY_TO_FRONTEND_URL}/connect-shopify?error=Couldn't retrieve session or access token from redirect`
    );

  // res.redirect(
  //   `${process.env.SHOPIFY_TO_FRONTEND_URL}?store=${shopifyAuthData.session.shop}`
  // );

  // we can add this access token to the database so we can use it for shopify api calls or we can add this it into .env as we may not need to generate a new one in future.

  console.log("Shopify Access Token= ", shopifyAuthData.session.accessToken);
  res.send(`Shopify Access Token= ${shopifyAuthData.session.accessToken}`);
});

app.get(
  "/create-checkout",
  // validateCreateCheckout,
  // validationMiddleware,
  async (req, res, next) => {
    try {
      // const { shipping_address, billing_address, email, gift_card_price } =
      //   req.body;

      const createCheckout = await shopifyNodeInstance.checkout.create({
        shipping_address: {
          address1: "Chestnut Street 92",
          // address2: "Suite 300",
          city: "Louisville",
          // company: null,
          country: "US",
          first_name: "ali",
          last_name: "imran",
          phone: "555-625-1199",
          province: "KY",
          zip: "40202",
          // province_code: null,
          // country_code: null,
        },
        billing_address: {
          address1: "Chestnut Street 92",
          // address2: "Suite 300",
          city: "Louisville",
          // company: null,
          country: "US",
          first_name: "ali",
          last_name: "imran",
          phone: "555-625-1199",
          province: "KY",
          zip: "40202",
          // province_code: null,
          // country_code: null,
        },
        email: "ali.imran@codedistrict.com",
        line_items: [
          {
            variant_id: process.env.SHOPIFY_DOLLAR_ONE_PRODUCT_VARIANT_ID,
            quantity: 10,
          },
        ],
        // to call api from backend
        // billing_address: {
        //   address1: billing_address.address,
        //   // address2: "Suite 300", // optional
        //   city: billing_address.city,
        //   // company: null,
        //   country: billing_address.country,
        //   first_name: billing_address.first_name,
        //   last_name: billing_address.last_name,
        //   phone: billing_address.phone,
        //   province: billing_address.province,
        //   zip: billing_address.zip,
        //   // province_code: null,
        //   // country_code: null,
        // },
        // shipping_address: {
        //   address1: shipping_address.address,
        //   // address2: "Suite 300", // optional
        //   city: shipping_address.city,
        //   // company: null,
        //   country: shipping_address.country,
        //   first_name: shipping_address.first_name,
        //   last_name: shipping_address.last_name,
        //   phone: shipping_address.phone,
        //   province: shipping_address.province,
        //   zip: shipping_address.zip,
        //   // province_code: null,
        //   // country_code: null,
        // },
        // email: email,
        // line_items: [
        //   {
        //     variant_id: process.env.SHOPIFY_DOLLAR_ONE_PRODUCT_VARIANT_ID,
        //     quantity: gift_card_price,
        //   },
        // ],
      });

      console.log("createCheckout= ", createCheckout);
      console.log("checkoutToken= ", createCheckout.token);

      // get the checkout token and add it to the database so we can verify the payment information later that it is paid or not when the webhook is called.

      res.redirect(createCheckout.web_url);
    } catch (error) {
      next(error);
    }
  }
);

app.post("/create-webhook", async (req, res, next) => {
  try {
    const topic = req.body.topic;
    const webhookResponse = await shopifyNodeInstance.webhook.create({
      address: `${process.env.SERVER_URL}/${topic}`,
      topic: topic,
      type: "json",
    });

    res.status(201).json({
      success: true,
      message: "Webhook created successfully.",
      data: webhookResponse,
    });
  } catch (error) {
    next(error);
  }
});

app.put("/update-webhook", async (req, res, next) => {
  try {
    const topic = req.body.topic;
    const webhookFound = (await shopifyNodeInstance.webhook.list()).find(
      (webhook) => webhook.topic === topic
    );

    const webhookResponse = await shopifyNodeInstance.webhook.update(
      webhookFound.id,
      {
        address: `${process.env.SERVER_URL}/${topic}`,
        topic: topic,
      }
    );

    res.status(201).json({
      success: true,
      message: "Webhook updated successfully.",
      data: webhookResponse,
    });
  } catch (error) {
    next(error);
  }
});

const verifyWebhook = (rawBody, hmacHeader) => {
  // const shop = req.headers["x-shopify-shop-domain"];
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const generatedHmac = crypto
    .createHmac("sha256", clientSecret)
    .update(rawBody)
    .digest("base64");

  return generatedHmac === hmacHeader;
};

app.post("/orders/paid", async (req, res, next) => {
  try {
    const data = req.rawBody;
    const hmacHeader = req.get("X-Shopify-Hmac-SHA256");
    const verified = verifyWebhook(data, hmacHeader);

    if (!verified) {
      res.status(401).json({ message: "HMAC verification failed" });
    }

    console.log("verifyCheckoutToken= ", req.body.checkout_token);
    // here we can compare shoppify token with token we have saved in database and set the isPaid option to true
    res.status(200).json({ message: "Order payment verified successfully" });
  } catch (error) {
    next(error);
  }
});

app.get("/", (req, res) => {
  res.send("Server running successfully!");
});

app.use((error, req, res, next) => {
  console.log("error= ", error);
  const status = error?.statusCode || 500;
  const message = error?.message || "";
  const data = error?.data || {};
  res.status(status).json({ message: message, data: data });
});

app.listen(process.env.PORT, () =>
  console.log(`Listening at http://localhost:${process.env.PORT}`)
);

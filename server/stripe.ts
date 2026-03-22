import Stripe from "stripe";

// Optional: Fallback to a dummy key if env missing during early dev
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16" as any,
});

// Plan configs (paid plans only – free is an internal state for unsubscribed/trial-expired stores)
export const PLANS = {
  pro: {
    name: "Pro",
    price: 3990, // cents
    priceId: process.env.STRIPE_PRICE_ID_PRO || "price_pro_dummy",
    maxCarousels: 2,
    maxVideos: 50,
    maxViews: 10000,
  },
  ultra: {
    name: "Ultra",
    price: 9990,
    priceId: process.env.STRIPE_PRICE_ID_ULTRA || "price_ultra_dummy",
    maxCarousels: Infinity,
    maxVideos: Infinity,
    maxViews: 50000,
  },
  gold: {
    name: "Gold",
    price: 29990,
    priceId: process.env.STRIPE_PRICE_ID_GOLD || "price_gold_dummy",
    maxCarousels: Infinity,
    maxVideos: Infinity,
    maxViews: Infinity,
  }
};

export type PlanId = keyof typeof PLANS;

// Limits for stores in free trial (matches Pro limits)
export const TRIAL_LIMITS = {
  name: "Trial",
  maxCarousels: 2,
  maxVideos: 50,
  maxViews: 10000,
};

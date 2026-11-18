import type { NavGroup } from "@/features/navigation/types";

/**
 * Mock sidebar. Sections follow the Nova sections named in the build plan.
 * Only "Orders" has a real screen; every other link opens the placeholder page.
 */
export const mockNavigation: NavGroup[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
      { id: "orders", label: "Orders", href: "/", icon: "orders", badge: 12, keywords: ["checkouts", "sales"] },
      { id: "my-tasks", label: "My tasks", href: "/tasks", icon: "tasks", badge: 4, keywords: ["queue", "assigned"] },
      {
        id: "shipping",
        label: "Shipping",
        icon: "shipping",
        children: [
          { id: "shipments", label: "Shipments", href: "/shipping/shipments", keywords: ["labels", "tracking"] },
          { id: "carrier-events", label: "Carrier events", href: "/shipping/carrier-events", keywords: ["webhooks"] },
          { id: "packaging-proofs", label: "Packaging proofs", href: "/shipping/packaging-proofs" },
        ],
      },
      {
        id: "money",
        label: "Payouts & refunds",
        icon: "money",
        children: [
          { id: "payouts", label: "Payouts", href: "/money/payouts", badge: 3 },
          { id: "refunds", label: "Refunds", href: "/money/refunds" },
          { id: "payout-blocks", label: "Payout blocks", href: "/money/payout-blocks" },
          { id: "invoices", label: "Invoices", href: "/money/invoices" },
        ],
      },
      { id: "complaints", label: "Complaints", href: "/complaints", icon: "complaints", badge: 7, keywords: ["disputes", "returns"] },
    ],
  },
  {
    id: "listings",
    label: "Listings",
    items: [
      {
        id: "ads",
        label: "Ads",
        icon: "ads",
        children: [
          { id: "bike-ads", label: "Bike ads", href: "/listings/bike-ads" },
          { id: "component-ads", label: "Component ads", href: "/listings/component-ads" },
          { id: "clothing-ads", label: "Clothing ads", href: "/listings/clothing-ads" },
        ],
      },
      { id: "offers", label: "Offers", href: "/listings/offers", icon: "offers", keywords: ["price requests"] },
      { id: "imports", label: "Listing imports", href: "/listings/imports", icon: "imports", keywords: ["batches", "csv"] },
      { id: "shopping-feeds", label: "Shopping feeds", href: "/listings/shopping-feeds", icon: "feeds", keywords: ["google", "rules"] },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "users", label: "Users", href: "/users", icon: "users", keywords: ["accounts", "customers"] },
      { id: "business-accounts", label: "Business accounts", href: "/business-accounts", icon: "business", keywords: ["shops", "dealers"] },
      { id: "reviews", label: "Reviews", href: "/reviews", icon: "reviews" },
    ],
  },
  {
    id: "trust",
    label: "Trust & safety",
    items: [
      { id: "moderation", label: "Moderation", href: "/moderation", icon: "moderation", badge: 21, keywords: ["flagged", "reports"] },
      { id: "message-threads", label: "Message threads", href: "/message-threads", icon: "messages", keywords: ["chat"] },
      { id: "security-events", label: "Security events", href: "/security-events", icon: "security", keywords: ["logins", "castle"] },
    ],
  },
  {
    id: "content",
    label: "Content & SEO",
    items: [
      {
        id: "blog",
        label: "Blog",
        icon: "blog",
        children: [
          { id: "blog-entries", label: "Entries", href: "/blog/entries", keywords: ["posts", "articles"] },
          { id: "blog-categories", label: "Categories", href: "/blog/categories" },
          { id: "blog-authors", label: "Authors", href: "/blog/authors" },
        ],
      },
      { id: "collections", label: "Collections", href: "/collections", icon: "collections" },
      { id: "contents", label: "Page contents", href: "/contents", icon: "contents", keywords: ["cms", "texts"] },
      { id: "campaigns", label: "Campaigns", href: "/campaigns", icon: "campaigns", keywords: ["banners"] },
      { id: "notification-templates", label: "Notification templates", href: "/notification-templates", icon: "notifications", keywords: ["emails", "push"] },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { id: "bikes-database", label: "Bikes database", href: "/catalog/bikes", icon: "catalog", keywords: ["models", "drafts"] },
      { id: "brands", label: "Brands", href: "/catalog/brands", icon: "brands" },
      { id: "disciplines", label: "Disciplines", href: "/catalog/disciplines", icon: "disciplines" },
      { id: "colors", label: "Colors", href: "/catalog/colors", icon: "colors" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "access",
        label: "Access",
        icon: "access",
        children: [
          { id: "admins", label: "Admins", href: "/system/admins" },
          { id: "roles", label: "Roles", href: "/system/roles" },
          { id: "permissions", label: "Permissions", href: "/system/permissions" },
        ],
      },
      { id: "audit", label: "Audit trail", href: "/system/audit", icon: "audit", keywords: ["logs", "history"] },
      { id: "feature-flags", label: "Feature flags", href: "/system/feature-flags", icon: "flags" },
      { id: "jobs", label: "Queued jobs", href: "/system/jobs", icon: "jobs", keywords: ["exports", "background"] },
    ],
  },
];

import type {
  ActivityEntry,
  MoneyValue,
  PersonValue,
  ResourceContract,
  ResourceRecord,
} from "@/features/resources/types";

/** Mock contract for the "orders" resource. Field names and options are invented for the demo. */
export const ordersContract: ResourceContract = {
  key: "orders",
  label: "Orders",
  labelSingular: "Order",
  description: "Every checkout on the marketplace, from payment to payout.",
  titleField: "item",
  statusField: "status",
  fields: [
    { key: "reference", label: "Order", type: "id", sortable: true },
    {
      key: "status",
      label: "Status",
      type: "status",
      sortable: true,
      options: [
        { value: "awaiting_payment", label: "Awaiting payment", tone: "neutral" },
        { value: "paid", label: "Paid", tone: "info" },
        { value: "in_transit", label: "In transit", tone: "info" },
        { value: "delivered", label: "Delivered", tone: "success" },
        { value: "completed", label: "Completed", tone: "success" },
        { value: "disputed", label: "Disputed", tone: "warning" },
        { value: "refunded", label: "Refunded", tone: "danger" },
        { value: "cancelled", label: "Cancelled", tone: "neutral" },
      ],
    },
    { key: "item", label: "Item", type: "text", sortable: true },
    { key: "category", label: "Category", type: "text", sortable: true },
    { key: "buyer", label: "Buyer", type: "person", sortable: true },
    { key: "buyer_email", label: "Buyer email", type: "text", masked: true },
    { key: "seller", label: "Seller", type: "person", sortable: true },
    { key: "total", label: "Total", type: "money", sortable: true },
    { key: "fee", label: "BikeFlip fee", type: "money", sortable: true },
    {
      key: "payout_status",
      label: "Payout",
      type: "status",
      sortable: true,
      options: [
        { value: "not_due", label: "Not due", tone: "neutral" },
        { value: "scheduled", label: "Scheduled", tone: "info" },
        { value: "paid_out", label: "Paid out", tone: "success" },
        { value: "blocked", label: "Blocked", tone: "danger" },
      ],
    },
    { key: "payment_method", label: "Payment method", type: "text" },
    { key: "carrier", label: "Carrier", type: "text", sortable: true },
    { key: "tracking_number", label: "Tracking number", type: "id" },
    { key: "ship_to", label: "Ships to", type: "country", sortable: true },
    { key: "assignee", label: "Assigned to", type: "person" },
    { key: "created_at", label: "Created", type: "datetime", sortable: true },
    { key: "updated_at", label: "Last update", type: "datetime", sortable: true },
  ],
  list: {
    columns: [
      "reference",
      "status",
      "item",
      "buyer",
      "seller",
      "total",
      "payout_status",
      "carrier",
      "ship_to",
      "assignee",
      "created_at",
      "updated_at",
    ],
    hiddenByDefault: ["assignee", "updated_at"],
    defaultSort: { field: "created_at", direction: "desc" },
    searchPlaceholder: "Search order, item, buyer or seller",
    tabs: [
      { key: "all", label: "All" },
      { key: "attention", label: "Needs attention" },
      { key: "open", label: "Open" },
      { key: "completed", label: "Completed" },
      { key: "closed", label: "Refunded & cancelled" },
    ],
  },
  detail: {
    highlights: ["total", "fee", "payout_status"],
    sections: [
      { key: "order", label: "Order", fields: ["reference", "status", "item", "category", "payment_method"] },
      { key: "people", label: "People", fields: ["buyer", "buyer_email", "seller", "assignee"] },
      { key: "shipping", label: "Shipping", fields: ["carrier", "tracking_number", "ship_to"] },
      { key: "dates", label: "Dates", fields: ["created_at", "updated_at"] },
    ],
  },
  actions: [
    { key: "add_note", label: "Add note", icon: "note" },
    { key: "resend_label", label: "Resend shipping label", icon: "send" },
    { key: "refund", label: "Refund buyer", icon: "refund", tone: "danger", requiresReason: true },
    { key: "cancel", label: "Cancel order", icon: "cancel", tone: "danger", requiresReason: true },
  ],
};

/** Tab key -> statuses it contains. `all` is absent on purpose: it does not filter. */
export const ordersTabStatuses: Record<string, string[]> = {
  attention: ["disputed", "awaiting_payment"],
  open: ["paid", "in_transit", "delivered"],
  completed: ["completed"],
  closed: ["refunded", "cancelled"],
};

/* ---- deterministic generator: the same rows on every load, on server and client ---- */

const FIRST_NAMES = ["Lena", "Marco", "Sofie", "Jonas", "Chiara", "Pablo", "Anouk", "Tobias", "Elise", "Matteo", "Ines", "Felix", "Giulia", "Hugo", "Marta", "Niklas"];
const LAST_NAMES = ["Keller", "Rossi", "Dubois", "Novak", "Garcia", "Lindner", "Moretti", "Fischer", "Laurent", "Brandt", "Ferrer", "Conti", "Weiss", "Marchand", "Vogel", "Serra"];
const SHOPS = ["Alpine Cycles", "Velo Werkstatt", "Ruota Libera", "Gravel Depot", "Pedal & Co", "Bici Nord"];
const ITEMS: Array<[string, string, number]> = [
  ["Canyon Grizl CF SL 7 (2023)", "Bike", 219900],
  ["Specialized Tarmac SL7 Expert", "Bike", 389000],
  ["Cube Stereo 150 C:62 Race", "Bike", 274900],
  ["Trek Domane AL 4 Disc", "Bike", 119900],
  ["Orbea Rise M20 (2022)", "Bike", 429000],
  ["Scott Spark 940", "Bike", 198000],
  ["Brompton C Line Explore", "Bike", 124500],
  ["Shimano Ultegra R8170 Di2 groupset", "Component", 98000],
  ["DT Swiss ERC 1400 wheelset", "Component", 139000],
  ["Fox 36 Factory GRIP2 fork", "Component", 79900],
  ["SRAM GX Eagle AXS upgrade kit", "Component", 42000],
  ["Garmin Rally RK200 power pedals", "Component", 61000],
  ["Assos Mille GT bib shorts", "Clothing", 9800],
  ["Rapha Pro Team jersey", "Clothing", 7400],
  ["Giro Aether Spherical helmet", "Clothing", 16500],
  ["Fizik Vento Ferox shoes", "Clothing", 18900],
];
const CARRIERS = ["DHL", "DPD", "GLS", "UPS", "BRT"];
const COUNTRIES = ["DE", "IT", "FR", "ES", "AT", "NL", "BE"];
const PAYMENT_METHODS = ["Card", "PayPal", "Klarna", "SEPA transfer"];
const ADMINS = ["Demo Admin", "Ops Agent 1", "Ops Agent 2"];
const STATUSES = ["awaiting_payment", "paid", "paid", "in_transit", "in_transit", "delivered", "completed", "completed", "completed", "disputed", "refunded", "cancelled"];

/** Fixed "now" so generated dates never differ between server and client renders. */
const BASE_TIME = Date.UTC(2026, 10, 18, 9, 0, 0);
const HOUR = 3_600_000;

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function maskEmail(name: string) {
  return `${name[0].toLowerCase()}•••••@•••••.com`;
}

function payoutFor(status: string, roll: number) {
  if (status === "completed") return "paid_out";
  if (status === "delivered") return roll < 0.8 ? "scheduled" : "blocked";
  if (status === "disputed") return "blocked";
  return "not_due";
}

function buildOrders(count: number): ResourceRecord[] {
  const random = createRandom(77);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];

  return Array.from({ length: count }, (_, index) => {
    const [item, category, basePrice] = pick(ITEMS);
    const status = pick(STATUSES);
    const buyerName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const isShop = random() < 0.35;
    const sellerName = isShop ? pick(SHOPS) : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const amount = Math.round((basePrice * (0.82 + random() * 0.3)) / 100) * 100;
    const shipped = ["in_transit", "delivered", "completed", "disputed", "refunded"].includes(status);
    const createdAt = BASE_TIME - Math.floor(random() * 45 * 24) * HOUR - index * HOUR;
    const updatedAt = Math.min(BASE_TIME, createdAt + Math.floor(random() * 96) * HOUR);
    const assigned = status === "disputed" || random() < 0.25;

    const buyer: PersonValue = { name: buyerName, detail: "Private" };
    const seller: PersonValue = { name: sellerName, detail: isShop ? "Business" : "Private" };
    const total: MoneyValue = { amount, currency: "EUR" };
    const fee: MoneyValue = { amount: Math.round(amount * 0.06), currency: "EUR" };

    return {
      id: String(10480 + count - index),
      reference: `BF-${10480 + count - index}`,
      status,
      item,
      category,
      buyer,
      buyer_email: maskEmail(buyerName),
      seller,
      total,
      fee,
      payout_status: payoutFor(status, random()),
      payment_method: pick(PAYMENT_METHODS),
      carrier: shipped ? pick(CARRIERS) : null,
      tracking_number: shipped ? `JD${Math.floor(1e11 + random() * 9e11)}` : null,
      ship_to: pick(COUNTRIES),
      assignee: assigned ? ({ name: pick(ADMINS) } satisfies PersonValue) : null,
      created_at: new Date(createdAt).toISOString(),
      updated_at: new Date(updatedAt).toISOString(),
    } satisfies ResourceRecord;
  });
}

export const mockOrders: ResourceRecord[] = buildOrders(86);

export function buildOrderActivity(order: ResourceRecord): ActivityEntry[] {
  const created = Date.parse(String(order.created_at));
  const updated = Date.parse(String(order.updated_at));
  const buyer = (order.buyer as PersonValue).name;
  const seller = (order.seller as PersonValue).name;
  const status = String(order.status);

  const entries: ActivityEntry[] = [
    { id: "created", at: new Date(created).toISOString(), actor: buyer, summary: "Placed the order" },
  ];
  if (status !== "awaiting_payment" && status !== "cancelled") {
    entries.push({ id: "paid", at: new Date(created + 0.2 * HOUR).toISOString(), actor: "System", summary: `Payment captured (${String(order.payment_method)})` });
  }
  if (order.carrier) {
    entries.push({ id: "label", at: new Date(created + 5 * HOUR).toISOString(), actor: seller, summary: `Created a ${String(order.carrier)} shipping label` });
  }
  if (order.assignee) {
    entries.push({ id: "assigned", at: new Date(created + 8 * HOUR).toISOString(), actor: "System", summary: `Assigned to ${(order.assignee as PersonValue).name}` });
  }
  const status_label = ordersContract.fields.find((field) => field.key === "status")?.options?.find((option) => option.value === status)?.label ?? status;
  entries.push({ id: "status", at: new Date(updated).toISOString(), actor: "System", summary: `Status changed to "${status_label}"` });

  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

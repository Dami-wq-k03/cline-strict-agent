import { createTool } from "@cline/shared";
import { z } from "zod";

/** A pure in-process function tool. It does not access the OS or network. */
export const calculateDiscount = createTool({
  name: "calculate_discount",
  description:
    "Calculate a discounted price. Use this for arithmetic involving a price and discount percentage.",
  inputSchema: z.object({
    price: z.number().finite().min(0).describe("Original price, in currency units"),
    discountPercent: z
      .number()
      .finite()
      .min(0)
      .max(100)
      .describe("Discount percentage from 0 to 100"),
  }),
  async execute(input) {
    const originalCents = Math.round(input.price * 100);
    const discountCents = Math.round(
      (originalCents * input.discountPercent) / 100,
    );

    return {
      ok: true,
      originalPrice: originalCents / 100,
      discountPercent: input.discountPercent,
      discountAmount: discountCents / 100,
      finalPrice: (originalCents - discountCents) / 100,
    };
  },
});

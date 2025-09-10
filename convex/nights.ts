import { query } from "./_generated/server";
import { v } from "convex/values";

// Fetch a single night by its Convex document id.
export const getById = query({
  args: { id: v.id("nights") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Fetch a single night by its shortId (URL parameter).
export const getByShortId = query({
  args: { shortId: v.string() },
  handler: async (ctx, { shortId }) => {
    return await ctx.db
      .query("nights")
      .withIndex("by_shortId", (q) => q.eq("shortId", shortId))
      .first();
  },
});

// List all nights (optionally filter by isActive=true if present)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const results = await ctx.db.query("nights").collect();
    // If isActive exists, sort active first then by shortId
    return results.sort((a, b) => {
      const aActive = (a as any).isActive ?? true;
      const bActive = (b as any).isActive ?? true;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return String(a.shortId).localeCompare(String(b.shortId));
    });
  },
});



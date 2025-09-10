import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new booking with conflict detection against reserved seats.
// If any requested seat is already reserved for the same night, the mutation
// throws an error listing the conflicting seat ids.
export const createBooking = mutation({
  args: {
    nightId: v.id("nights"),
    customerName: v.string(),
    customerPhone: v.string(),
    seats: v.array(
      v.object({
        seatId: v.string(),
        tableId: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { nightId, customerName, customerPhone, seats, notes } = args;

    // Fast fail on duplicate seat ids within the same request.
    const uniqueSeatIds = new Set(seats.map((s) => s.seatId));
    if (uniqueSeatIds.size !== seats.length) {
      throw new Error("Duplicate seat ids provided in the same booking request");
    }

    // Conflict detection: ensure none of the requested seats are already reserved for this night.
    const conflictingSeatIds: string[] = [];
    for (const seat of seats) {
      const existing = await ctx.db
        .query("reservedSeats")
        .withIndex("by_night_seat", (q) =>
          q.eq("nightId", nightId).eq("seatId", seat.seatId)
        )
        .first();
      if (existing) {
        conflictingSeatIds.push(seat.seatId);
      }
    }

    if (conflictingSeatIds.length > 0) {
      throw new Error(
        `One or more seats are already reserved: ${conflictingSeatIds.join(", ")}`
      );
    }

    const now = Date.now();
    const bookingId = await ctx.db.insert("bookings", {
      nightId,
      customerName,
      customerPhone,
      seatIds: seats.map((s) => s.seatId),
      tableIds: seats.map((s) => s.tableId),
      status: "confirmed",
      notes,
      createdAt: now,
    });

    // Insert reserved seat records for each seat in the booking.
    await Promise.all(
      seats.map((s) =>
        ctx.db.insert("reservedSeats", {
          nightId,
          bookingId,
          tableId: s.tableId,
          seatId: s.seatId,
          createdAt: now,
        })
      )
    );

    return bookingId;
  },
});

// List bookings for a given night, newest first.
export const listBookingsByNight = query({
  args: { nightId: v.id("nights") },
  handler: async (ctx, { nightId }) => {
    const results = await ctx.db
      .query("bookings")
      .withIndex("by_night", (q) => q.eq("nightId", nightId))
      .order("desc")
      .collect();
    return results;
  },
});

// List reserved seats for a given night.
export const listReservedSeatsByNight = query({
  args: { nightId: v.id("nights") },
  handler: async (ctx, { nightId }) => {
    const results = await ctx.db
      .query("reservedSeats")
      .withIndex("by_night", (q) => q.eq("nightId", nightId))
      .collect();
    // Hydrate booking info (customerName) for popovers
    const bookings = new Map(
      (
        await ctx.db
          .query("bookings")
          .withIndex("by_night", (q) => q.eq("nightId", nightId))
          .collect()
      ).map((b) => [b._id, b])
    );
    return results.map((r) => ({
      ...r,
      bookingCustomerName: bookings.get(r.bookingId)?.customerName ?? null,
    }));
  },
});

// Fetch a single booking by id (optional helper).
export const getBooking = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    return await ctx.db.get(bookingId);
  },
});



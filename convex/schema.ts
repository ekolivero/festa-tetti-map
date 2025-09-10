import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Events/nights you’re selling seats for (e.g., Night 1, Night 2)
  nights: defineTable({
    shortId: v.string(), // URL id like "1", "2"
    title: v.string(),
    date: v.string(), // e.g., "Sabato 15 Marzo 2025"
    time: v.string(), // e.g., "20:00"
    color: v.string(), // tailwind class or hex
    hoverColor: v.string(), // optional UI hover class if desired
    // Optional metadata
    isActive: v.optional(v.boolean()),
  })
    .index("by_active", ["isActive"])
    .index("by_shortId", ["shortId"]),

  // A booking (reservation) made by a customer that may include multiple seats.
  bookings: defineTable({
    nightId: v.id("nights"),
    customerName: v.string(),
    customerPhone: v.string(),
    // Seat identifiers are globally unique across the venue in your UI
    // (computed from table id + position). Store them as strings.
    seatIds: v.array(v.string()),
    // Optional: store table ids for convenience ("T31", etc.)
    tableIds: v.array(v.string()),
    status: v.union(v.literal("confirmed"), v.literal("cancelled")),
    notes: v.optional(v.string()),
    createdAt: v.number(), // Date.now()
  })
    .index("by_night", ["nightId"])
    .index("by_night_status", ["nightId", "status"]),

  // One document per booked seat to enable fast lookups and conflict checks.
  // This denormalizes some data from `bookings` to allow efficient UI queries.
  reservedSeats: defineTable({
    nightId: v.id("nights"),
    bookingId: v.id("bookings"),
    tableId: v.string(), // e.g., "T31"
    seatId: v.string(), // globally unique seat number string (e.g., "373")
    createdAt: v.number(),
  })
    .index("by_night", ["nightId"])
    .index("by_booking", ["bookingId"])
    .index("by_night_seat", ["nightId", "seatId"]) // for conflict detection
});

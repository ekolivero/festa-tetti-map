"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

export default function Home() {
  const nights = useQuery(api.nights.listAll) ?? [];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sistema Prenotazioni</h1>
          <p className="text-gray-600">Festa dei Tetti</p>
        </header>

        <div className="flex flex-col gap-6">
          {nights.map((night: Doc<"nights">) => (
            <Link key={night._id} href={`/night/${night.shortId}`}>
              <div className={`${night.color} ${night.hoverColor} text-white p-6 rounded-lg shadow-lg transition-colors`}>
                <h3 className="text-xl font-bold mb-2">{night.title}</h3>
                <div className="text-sm opacity-90">
                  <p>{night.date}</p>
                  <p>{night.time}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

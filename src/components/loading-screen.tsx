"use client";

import { Star } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="flex h-full flex-col items-center justify-center px-6 py-8">
        <div className="mb-4 text-center">
          <div className="relative mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-700 shadow-2xl">
              <Star className="h-8 w-8" fill="currentColor" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-wider">AniStars</h1>
        </div>
      </div>
    </div>
  );
}

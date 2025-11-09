"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Calculator from "@/components/Calculator";

// This page just wraps the calculator inside Suspense,
// which fixes the "useSearchParams()" prerendering error.
export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
            Loading Personal Loan EMI Calculator...
          </div>
        }
      >
        <Calculator />
      </Suspense>
    </main>
  );
}

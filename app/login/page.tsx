"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Laptop, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-900 p-8 rounded-3xl border shadow-xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30">
              <Laptop className="h-7 w-7" />
            </div>
          </Link>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Welcome Back to CV Deck
          </h2>
          <p className="text-xs text-gray-500">
            Sign in to access Computer Village marketplace & dashboards
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Email Address</Label>
            <Input
              type="email"
              placeholder="e.g. user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Password</Label>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/20 gap-2"
          >
            {loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border text-center text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Demo Accounts (Password123!):</p>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-blue-600 font-medium">
            <span>Customer: customer@gmail.com</span>
            <span>Vendor: vendor@peppletech.ng</span>
            <span>Recruiter: recruiter@techhub.ng</span>
            <span>Admin: admin@cvdeck.ng</span>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold text-blue-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

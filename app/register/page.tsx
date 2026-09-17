"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Laptop, ArrowRight, Store, User, Briefcase } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"CUSTOMER" | "VENDOR" | "RECRUITER">("CUSTOMER");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    businessName: "",
    officeAddress: "",
    companyName: "",
    industry: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        router.push("/login?registered=true");
      }
    } catch (err) {
      setError("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 bg-white dark:bg-gray-900 p-8 rounded-3xl border shadow-xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30">
              <Laptop className="h-7 w-7" />
            </div>
          </Link>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Create Your Account
          </h2>
          <p className="text-xs text-gray-500">
            Join Computer Village Marketplace as a Customer, Vendor, or Recruiter
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole("CUSTOMER")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === "CUSTOMER"
                ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <User className="h-4 w-4" /> Customer
          </button>
          <button
            type="button"
            onClick={() => setRole("VENDOR")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === "VENDOR"
                ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Store className="h-4 w-4" /> Vendor
          </button>
          <button
            type="button"
            onClick={() => setRole("RECRUITER")}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === "RECRUITER"
                ? "bg-white dark:bg-gray-900 text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Briefcase className="h-4 w-4" /> Recruiter
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Full Name</Label>
              <Input
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Phone Number</Label>
              <Input
                name="phone"
                placeholder="+234 801 234 5678"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Email Address</Label>
            <Input
              type="email"
              name="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Password</Label>
            <Input
              type="password"
              name="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Conditional Role Fields */}
          {role === "VENDOR" && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Vendor Details</h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Business Name</Label>
                <Input
                  name="businessName"
                  placeholder="e.g. Pepple Tech Hub"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Shop / Office Address in Computer Village</Label>
                <Input
                  name="officeAddress"
                  placeholder="Suite 12, Pepple Street, Ikeja, Lagos"
                  value={formData.officeAddress}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {role === "RECRUITER" && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Recruiter & Enterprise Details</h4>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Company Name</Label>
                <Input
                  name="companyName"
                  placeholder="e.g. Nexus Solutions Ltd"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Industry / Procurement Focus</Label>
                <Input
                  name="industry"
                  placeholder="e.g. IT Equipment Procurement"
                  value={formData.industry}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/20 gap-2 mt-4"
          >
            {loading ? "Creating Account..." : `Register as ${role.toLowerCase()}`} <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="text-center text-xs text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-blue-600 hover:underline">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
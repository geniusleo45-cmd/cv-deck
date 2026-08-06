"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [message, setMessage] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      setMessage("Account created successfully!");
    } else {
      setMessage(result.error);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg">
      <h1 className="text-3xl font-bold mb-6">
        Create CV Deck Account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="fullName"
          placeholder="Full Name"
          className="w-full border p-3 rounded"
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email Address"
          className="w-full border p-3 rounded"
          required
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-black text-white p-3 rounded"
        >
          Create Account
        </button>
      </form>

      {message && (
        <p className="mt-4">
          {message}
        </p>
      )}
    </div>
  );
}
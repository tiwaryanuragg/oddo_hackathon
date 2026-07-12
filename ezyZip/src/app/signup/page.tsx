"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
      } else {
        router.push("/login?registered=true");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="glass-elevated w-full max-w-md p-8 rounded-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <ShieldAlert size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-[var(--text-secondary)] mb-8 text-center">
          Join AssetFlow as an Employee
        </p>

        {error && (
          <div className="w-full p-3 mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-4 py-2.5 text-base"
            style={{ backgroundColor: 'var(--accent-success)' }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="w-full flex items-center my-6">
          <div className="flex-1 border-t border-[var(--border)]"></div>
          <span className="px-3 text-sm text-[var(--text-secondary)]">Already have an account?</span>
          <div className="flex-1 border-t border-[var(--border)]"></div>
        </div>

        <Link
          href="/login"
          className="btn w-full bg-[var(--elevated)] border border-[var(--border)] text-white hover:bg-[var(--card)]"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

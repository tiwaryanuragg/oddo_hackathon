"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="glass-elevated w-full max-w-md p-8 rounded-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30">
          <Shield size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-[var(--text-secondary)] mb-8 text-center">
          Sign in to access your AssetFlow dashboard
        </p>

        {error && (
          <div className="w-full p-3 mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-4 py-2.5 text-base"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="w-full flex items-center my-6">
          <div className="flex-1 border-t border-[var(--border)]"></div>
          <span className="px-3 text-sm text-[var(--text-secondary)]">New here?</span>
          <div className="flex-1 border-t border-[var(--border)]"></div>
        </div>

        <div className="text-center text-sm text-[var(--text-secondary)] mb-4">
          Sign up creates an employee account. Admin roles are assigned later.
        </div>

        <Link
          href="/signup"
          className="btn w-full bg-[var(--elevated)] border border-[var(--border)] text-white hover:bg-[var(--card)]"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

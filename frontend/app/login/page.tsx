"use client";

import { ArrowRight, Bot, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { setMockUser } from "@/lib/auth";

type Tab = "login" | "register";
type ApiStatus = "checking" | "online" | "offline";

const demoFeatures = [
  "AI inbox · lead capture · bookings",
  "RAG knowledge base with PDF upload",
  "Workflows · analytics · escalation",
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [apiStatus] = useState<ApiStatus>("online");

  /* ── Shared field state ─────────────────────────────────────────── */
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  /* ── Switch tab and clear errors ────────────────────────────────── */
  function switchTab(next: Tab) {
    setTab(next);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setName("");
  }

  /* ── Sign-in handler ────────────────────────────────────────────── */
  function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    // Retrieve name saved during registration, fall back to capitalized email prefix
    const rawFallback = email.split("@")[0];
    const fallback = rawFallback.charAt(0).toUpperCase() + rawFallback.slice(1);
    const savedName = localStorage.getItem(`omniflow_name_${email.trim().toLowerCase()}`) ?? fallback;
    setMockUser({ name: savedName, email, role: "Admin" });
    router.push("/dashboard");
  }

  /* ── Register handler ───────────────────────────────────────────── */
  function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Save name so login can retrieve it
    localStorage.setItem(`omniflow_name_${email.trim().toLowerCase()}`, name.trim());
    /* Account created — switch to sign-in tab so user logs in manually */
    setTab("login");
    setSuccess("Account created! Please sign in.");
    setEmail(email);
    setPassword("");
    setConfirm("");
    setName("");
  }

  return (
    <main className="min-h-screen bg-[#101313] text-neutral-50">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1fr_440px] lg:px-12">

        {/* ── Left: branding ────────────────────────────────────────── */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-200">
            <Bot className="h-4 w-4" />
            OmniFlow AI
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-normal sm:text-5xl">
            Your business automation command center.
          </h1>
          <p className="mt-5 text-base leading-7 text-neutral-300">
            Unified inbox, AI auto-replies, lead capture, and workflow
            automation — all in one place.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {demoFeatures.map((feature) => (
              <div
                key={feature}
                className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm text-neutral-200"
              >
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: auth card ──────────────────────────────────────── */}
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">

          {/* Header row */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-xl font-semibold">
                {tab === "login" ? "Sign in" : "Create account"}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {tab === "login" ? "Welcome back" : "Get started for free"}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-black/30 px-3 py-2 text-xs text-neutral-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  apiStatus === "online"
                    ? "bg-emerald-400"
                    : apiStatus === "offline"
                      ? "bg-red-400"
                      : "bg-amber-300"
                }`}
              />
              API {apiStatus}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="mt-5 flex rounded-md bg-black/30 p-1">
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={`flex-1 rounded py-2 text-sm font-medium transition ${
                tab === "login"
                  ? "bg-cyan-300 text-neutral-950"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`flex-1 rounded py-2 text-sm font-medium transition ${
                tab === "register"
                  ? "bg-cyan-300 text-neutral-950"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          {/* Success banner */}
          {success && (
            <p className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
              {success}
            </p>
          )}

          {/* Error banner */}
          {error && (
            <p className="mt-4 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          {/* ── SIGN IN FORM ──────────────────────────────────────── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-neutral-200">
                Email
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <Mail className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-neutral-200">
                Password
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-neutral-500 transition hover:text-neutral-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-center text-sm text-neutral-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className="font-medium text-cyan-300 hover:underline"
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ─────────────────────────────────────── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-neutral-200">
                Full name
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <User className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-neutral-200">
                Email
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <Mail className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="block text-sm font-medium text-neutral-200">
                Password
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-neutral-500 transition hover:text-neutral-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <label className="block text-sm font-medium text-neutral-200">
                Confirm password
                <span className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-3 text-neutral-300 focus-within:border-cyan-400/50 transition">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-neutral-500" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="shrink-0 text-neutral-500 transition hover:text-neutral-300"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-center text-sm text-neutral-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className="font-medium text-cyan-300 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

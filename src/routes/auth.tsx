import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { ShoppingBasket } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Trolly" },
      { name: "description", content: "Sign in to sync your shopping list across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stay, setStay] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    if (mode === "signin") {
      const { error } = await signIn(email.trim(), password, stay);
      if (error) toast.error(error);
      else navigate({ to: "/" });
    } else {
      if (!name.trim()) {
        toast.error("Please enter your name");
        setBusy(false);
        return;
      }
      const { error } = await signUp(name.trim(), email.trim(), password);
      if (error) toast.error(error);
      else {
        toast.success("Account created");
        navigate({ to: "/" });
      }
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background px-6 pt-20 text-foreground">
      <Toaster position="top-center" richColors={false} toastOptions={{ className: "rounded-2xl" }} />
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShoppingBasket className="h-5 w-5" />
        </div>
        <p className="text-lg font-semibold tracking-tight">Trolly</p>
      </div>

      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to pick up where you left off."
          : "A clean, shared shopping list across every device."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        {mode === "signup" && (
          <FieldInput label="Name" value={name} onChange={setName} placeholder="Sarah" autoComplete="name" />
        )}
        <FieldInput
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <FieldInput
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        {mode === "signin" && (
          <label className="flex items-center gap-3 px-1 pt-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={stay}
              onChange={(e) => setStay(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            Stay logged in
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-primary"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <p className="mt-auto py-8 text-center text-xs text-muted-foreground">
        <Link to="/">Back home</Link>
      </p>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-2xl bg-secondary px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

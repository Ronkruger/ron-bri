import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, LockKeyhole, LogIn, Sparkles } from "lucide-react";
import { authApi } from "@ronbri/api-client";
import type { PublicAccount } from "@ronbri/types";
import { useAuth } from "../contexts/AuthContext";
import { Avatar, Button, Card, CardContent, TextField } from "../components/ui";
import { notification } from "../components/AppToaster";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selected, setSelected] = useState<PublicAccount | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    authApi.accounts()
      .then((data) => {
        if (active) setAccounts(data);
      })
      .catch((caughtError) => {
        if (active) {
          notification.fromError(caughtError, "Unable to load accounts. Please try again.");
        }
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = (account: PublicAccount) => {
    setSelected(account);
    setPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    try {
      await login(selected.username, password);
      notification.success(`Welcome back, ${selected.displayName}.`);
      navigate("/");
    } catch (caughtError) {
      notification.fromError(caughtError, "That password was not accepted. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-light)] blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-slate-300/40 blur-3xl dark:bg-slate-700/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--line)] px-7 py-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-light)] text-[var(--color-accent)]">
                <Heart size={20} fill="currentColor" />
              </div>
              <Sparkles size={18} className="text-[var(--color-accent)]" aria-hidden="true" />
            </div>
            <p className="ui-eyebrow">Private space</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">Choose your account to continue to RonBri.</p>
          </div>

          <CardContent className="px-7 py-7">
            <AnimatePresence mode="wait">
              {!selected ? (
                <motion.div
                  key="accounts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {accountsLoading ? (
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] px-4 py-8 text-center text-sm font-semibold text-gray-500">
                      Loading accounts…
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm font-semibold text-gray-500">
                      No accounts are available.
                    </div>
                  ) : (
                    accounts.map((account) => {
                      const isBoy = account.role === "BOY";
                      return (
                        <Button
                          key={account.id}
                          variant="outline"
                          fullWidth
                          onClick={() => handleSelect(account)}
                          leftIcon={<Avatar src={account.avatar} name={account.displayName} size="sm" />}
                          className="justify-start gap-3 px-3 py-3 text-left"
                          style={{
                            borderColor: isBoy ? "#b9d1ff" : "#f0d77b",
                            backgroundColor: isBoy ? "rgba(233, 241, 255, .52)" : "rgba(255, 247, 214, .58)",
                          }}
                        >
                          <span className="flex flex-col items-start">
                            <span className="font-extrabold">{account.displayName}</span>
                            <span className="text-xs font-medium text-gray-500">Continue as {account.username}</span>
                          </span>
                        </Button>
                      );
                    })
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key="password"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
                    <Avatar src={selected.avatar} name={selected.displayName} size="md" />
                    <div>
                      <div className="font-extrabold">{selected.displayName}</div>
                      <div className="text-xs text-gray-500">{selected.username}</div>
                    </div>
                  </div>
                  <label className="block text-sm font-bold" htmlFor="password">Password</label>
                  <div className="relative">
                    <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <TextField
                      id="password"
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="password-field"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    loadingText="Signing in…"
                    disabled={!password}
                    rightIcon={<LogIn size={17} />}
                  >
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => setSelected(null)}
                    leftIcon={<ArrowLeft size={16} />}
                  >
                    Choose another account
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs font-medium text-gray-400">Your shared space is private to you both.</p>
      </motion.div>
    </main>
  );
};

export default LoginPage;

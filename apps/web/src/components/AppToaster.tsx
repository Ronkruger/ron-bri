import React from "react";
import toast, { Toaster, type Toast } from "react-hot-toast";
import { AlertCircle, CheckCircle2, Info, LoaderCircle, X } from "lucide-react";

type NoticeKind = "success" | "error" | "info" | "loading";

const noticeIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: LoaderCircle,
};

const NoticeCard: React.FC<{ toastItem: Toast; kind: NoticeKind; message: string }> = ({ toastItem, kind, message }) => {
  const Icon = noticeIcon[kind];
  return (
    <div className={`app-toast app-toast-${kind} ${toastItem.visible ? "app-toast-visible" : ""}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={19} className={kind === "loading" ? "animate-spin" : ""} aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        onClick={() => toast.dismiss(toastItem.id)}
        aria-label="Close notification"
        title="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const show = (kind: NoticeKind, message: string, duration = Infinity) =>
  toast.custom((toastItem) => <NoticeCard toastItem={toastItem} kind={kind} message={message} />, { duration });

export const notification = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
  loading: (message: string) => show("loading", message, Infinity),
  dismiss: (id?: string) => toast.dismiss(id),
  fromError: (error: unknown, fallback = "Something went wrong. Please try again.") => {
    const responseMessage =
      typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
        : undefined;
    const message = typeof responseMessage === "string" && responseMessage.trim() ? responseMessage : fallback;
    return show("error", message);
  },
};

export const AppToaster: React.FC = () => (
  <Toaster
    position="top-right"
    gutter={10}
    containerStyle={{ top: 18, right: 18 }}
    toastOptions={{ ariaProps: { role: "status", "aria-live": "polite" } }}
  />
);

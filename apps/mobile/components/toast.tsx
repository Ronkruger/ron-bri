import React from "react";
import Toast, { BaseToast, ErrorToast, type ToastConfig } from "react-native-toast-message";

export const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} style={{ borderLeftColor: "#7a9d76", backgroundColor: "#fffdf9" }} contentContainerStyle={{ paddingHorizontal: 15 }} text1Style={{ fontSize: 14, fontWeight: "800", color: "#3c2b2a" }} text2Style={{ color: "#8f7771" }} />,
  error: (props) => <ErrorToast {...props} style={{ borderLeftColor: "#c46a62", backgroundColor: "#fffaf7" }} contentContainerStyle={{ paddingHorizontal: 15 }} text1Style={{ fontSize: 14, fontWeight: "800", color: "#3c2b2a" }} text2Style={{ color: "#8f7771" }} />,
  info: (props) => <BaseToast {...props} style={{ borderLeftColor: "#b98267", backgroundColor: "#fffdf9" }} contentContainerStyle={{ paddingHorizontal: 15 }} text1Style={{ fontSize: 14, fontWeight: "800", color: "#3c2b2a" }} text2Style={{ color: "#8f7771" }} />,
};

const errorMessage = (error: unknown, fallback: string) => {
  const message =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
      : undefined;
  return typeof message === "string" && message.trim() ? message : fallback;
};

export const mobileNotification = {
  success: (message: string) => Toast.show({ type: "success", text1: message }),
  error: (message: string) => Toast.show({ type: "error", text1: message }),
  info: (message: string) => Toast.show({ type: "info", text1: message }),
  fromError: (error: unknown, fallback = "Something went wrong. Please try again.") => Toast.show({ type: "error", text1: errorMessage(error, fallback) }),
};

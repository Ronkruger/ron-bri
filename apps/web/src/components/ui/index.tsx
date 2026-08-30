import React from "react";
import {
  Button as DarwinButton,
  Card as DarwinCard,
  CardContent as DarwinCardContent,
  CardDescription as DarwinCardDescription,
  CardFooter as DarwinCardFooter,
  CardHeader as DarwinCardHeader,
  CardTitle as DarwinCardTitle,
} from "@pikoloo/darwin-ui";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | "ghost" | "link" | "accent";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  iconOnly?: boolean;
  glass?: boolean;
};

const join = (...values: Array<string | undefined | false>) => values.filter(Boolean).join(" ");

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, ...props },
  ref
) {
  return <DarwinButton ref={ref} className={join("ui-button", className)} {...props} />;
});

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref
) {
  return <DarwinCard ref={ref} glass className={join("ui-card", className)} {...props} />;
});

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <DarwinCardHeader className={join("ui-card-header", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <DarwinCardTitle className={join("ui-card-title", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <DarwinCardDescription className={join("ui-card-description", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <DarwinCardContent className={join("ui-card-content", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <DarwinCardFooter className={join("ui-card-footer", className)} {...props} />
);

export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={join("ui-icon-button", className)}
        type="button"
        {...props}
      />
    );
  }
);

export const TextField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, ...props }, ref) {
    return <input ref={ref} className={join("ui-text-field", className)} {...props} />;
  }
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return <textarea ref={ref} className={join("ui-text-field ui-text-area", className)} {...props} />;
  }
);

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <header className="ui-page-header">
    <div>
      {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action}
  </header>
);

export const Avatar: React.FC<{
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}> = ({ src, name, size = "md" }) => (
  src ? (
    <img src={src} alt={name ?? ""} className={`ui-avatar ui-avatar-${size}`} />
  ) : (
    <div className={`ui-avatar ui-avatar-${size}`} aria-hidden="true">
      {name?.charAt(0) ?? "R"}
    </div>
  )
);

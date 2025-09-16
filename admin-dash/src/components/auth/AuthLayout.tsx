import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 glow">
            <div className="w-8 h-8 bg-background rounded-lg"></div>
          </div> */}
          <h1 className="text-3xl font-bold gradient-text mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* Form Container */}
        <div className="card-gradient p-8 rounded-2xl shadow-card animate-slide-up">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          Fortress Admin Dashboard v1.0
        </div>
      </div>
    </div>
  );
}
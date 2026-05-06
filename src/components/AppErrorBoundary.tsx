import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { error: Error | null };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5" dir="rtl">
        <div className="w-full max-w-sm gb-card p-6 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-bold mb-2">משהו השתבש בטעינת המערכת</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            במקום מסך לבן, שמרנו את השגיאה. נסו לרענן; אם זה חוזר, צלמו את המסך ופנו לתמיכה.
          </p>
          <p className="text-[11px] text-muted-foreground bg-muted rounded-xl p-2 mb-4 break-words" dir="ltr">
            {this.state.error.message}
          </p>
          <Button onClick={() => window.location.reload()} className="w-full rounded-xl">
            רענון המסך
          </Button>
        </div>
      </div>
    );
  }
}
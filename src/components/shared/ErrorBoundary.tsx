import { Component, type ReactNode, type ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="min-h-screen bg-zinc-950 flex items-center justify-center text-foreground"
          >
            <div className="text-center space-y-4 p-8 max-w-md">
              <h1 className="text-2xl font-bold text-red-400">Algo deu errado</h1>
              <p className="text-muted-foreground text-sm font-mono">
                {this.state.error?.message}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

import React from "react"
import ReactDOM from "react-dom/client"
import { Toaster } from "react-hot-toast"
import App from "./App"
import { ErrorBoundary } from "./components/shared/ErrorBoundary"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#fafafa",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
          },
          duration: 4000,
          success: {
            iconTheme: { primary: "#3b82f6", secondary: "#fafafa" },
          },
          error: {
            iconTheme: { primary: "#f87171", secondary: "#fafafa" },
          },
        }}
      />
    </ErrorBoundary>
  </React.StrictMode>
)

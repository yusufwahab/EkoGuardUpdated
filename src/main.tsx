import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { QueryProvider } from "./providers/QueryProvider.tsx";
import { ThemeProvider } from "./providers/ThemeProvider.tsx";
import { ToastProvider } from "./providers/ToastProvider.tsx";
import { SocketProvider } from "./providers/SocketProvider.tsx";
import { CurrentDeviceProvider } from "./providers/CurrentDeviceProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <ToastProvider>
            <SocketProvider>
              <CurrentDeviceProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </CurrentDeviceProvider>
            </SocketProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>
);

import React from "react";

interface ErrorScreenProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full py-20">
    <div className="text-6xl mb-4">😕</div>
    <h2 className="text-2xl font-bold mb-2">Ocurrió un error</h2>
    <p className="text-muted-foreground mb-4">
      {message || "No se pudo completar la operación. Intenta nuevamente."}
    </p>
    {onRetry && (
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
        onClick={onRetry}
      >
        Reintentar
      </button>
    )}
  </div>
);

export default ErrorScreen;

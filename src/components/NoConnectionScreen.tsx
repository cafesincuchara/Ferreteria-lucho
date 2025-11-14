import React from "react";

const NoConnectionScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full py-20">
    <div className="text-6xl mb-4">📡</div>
    <h2 className="text-2xl font-bold mb-2">Sin conexión</h2>
    <p className="text-muted-foreground mb-4">
      No se pudo conectar con el servidor. Verifica tu conexión a internet o
      intenta más tarde.
    </p>
  </div>
);

export default NoConnectionScreen;

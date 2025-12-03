import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UploadDocuments = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Por favor, selecciona un archivo.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulación de subida de archivo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadStatus("Archivo subido exitosamente.");
      setSelectedFile(null);
    } catch (error) {
      setUploadStatus("Error al subir el archivo. Inténtalo nuevamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Digitalización de Boletas y Facturas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Input type="file" onChange={handleFileChange} />
          <Button onClick={handleUpload}>Subir Archivo</Button>
          {uploadStatus && <p>{uploadStatus}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadDocuments;

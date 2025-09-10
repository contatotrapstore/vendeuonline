// Upload simulado para modo demo
// Em produção, use src/lib/supabase.ts

export interface DemoUploadResult {
  publicUrl: string;
  error?: string;
}

export async function uploadDemo(file: File, bucket: string = "uploads"): Promise<DemoUploadResult> {
  // Simular delay de upload
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simular URL fictícia
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const publicUrl = `https://demo-storage.vendeuonline.com/${bucket}/${fileName}`;

  console.log(`📸 Upload simulado: ${file.name} → ${publicUrl}`);

  return { publicUrl };
}

export async function deleteDemo(url: string): Promise<{ error?: string }> {
  console.log(`🗑️ Exclusão simulada: ${url}`);
  return {};
}

// Para uso em produção, substitua pelas funções reais do Supabase
export const upload = uploadDemo;
export const deleteFile = deleteDemo;

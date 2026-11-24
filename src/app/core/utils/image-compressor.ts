/**
 * Utilidad de compresión y optimización de imágenes en el navegador.
 * Convierte cualquier imagen (incluso fotos pesadas de 5 MB de WhatsApp o cámara)
 * a una versión ligera (~80-150 KB) que se guarda directamente dentro de la nota,
 * evitando errores de CORS y sincronizando al instante en Cloud Firestore e IndexedDB.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escala proporcional manteniendo relación de aspecto
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Si es PNG transparente preservar PNG, de lo contrario JPEG optimizado
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Si no se puede renderizar en canvas, usar dataUrl directa
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

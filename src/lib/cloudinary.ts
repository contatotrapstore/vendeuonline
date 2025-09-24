import { v2 as cloudinary } from "cloudinary";
import { logger } from "@/lib/logger";


// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

export const uploadToCloudinary = async (
  file: Buffer,
  folder: string = "products"
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: "auto",
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }, { format: "webp" }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result as CloudinaryUploadResult);
          } else {
            reject(new Error("Upload failed"));
          }
        }
      )
      .end(file);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

export default cloudinary;

import { v2 as cloudinary } from "cloudinary";

function getCleanEnv(key: string): string {
  const val = process.env[key];
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

cloudinary.config({
  cloud_name: getCleanEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: getCleanEnv("CLOUDINARY_API_KEY"),
  api_secret: getCleanEnv("CLOUDINARY_API_SECRET"),
});

export async function destroyCloudinaryFile(url?: string | null): Promise<boolean> {
  if (!url || !url.includes("cloudinary.com")) return false;

  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return false;
    let path = parts[1];
    // Remove version tag e.g. v1782750504/
    path = path.replace(/^v\d+\//, "");
    // Remove extension e.g. .png, .mp4
    const lastDot = path.lastIndexOf(".");
    const publicId = lastDot !== -1 ? path.substring(0, lastDot) : path;

    let resourceType: "image" | "video" | "raw" = "image";
    if (url.includes("/video/upload/")) resourceType = "video";
    else if (url.includes("/raw/upload/")) resourceType = "raw";

    console.log(`[Cloudinary Destroy] Deleting asset publicId="${publicId}" (resource_type="${resourceType}")...`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary Destroy] Result for "${publicId}":`, result);
    return result?.result === "ok";
  } catch (error) {
    console.error("[Cloudinary Destroy] Error deleting asset:", error);
    return false;
  }
}

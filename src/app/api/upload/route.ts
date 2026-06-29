import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper to sanitize environment credentials from Vercel / dashboard copy-pasting
function getCleanEnv(key: string): string {
  const val = process.env[key];
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

const cloud_name = getCleanEnv("CLOUDINARY_CLOUD_NAME");
const api_key = getCleanEnv("CLOUDINARY_API_KEY");
const api_secret = getCleanEnv("CLOUDINARY_API_SECRET");

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
});

export async function POST(req: NextRequest) {
  const reqId = `req_${Math.random().toString(36).substring(2, 10)}`;
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user) {
      console.warn(`[Upload API] [${reqId}] Failed: 401 Unauthorized`);
      return NextResponse.json({ error: "Unauthorized access to upload API" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    console.log(`[Upload API] [${reqId}] Started upload request by user ${userId}`);

    if (!cloud_name || !api_key || !api_secret) {
      console.error(`[Upload API] [${reqId}] Failed: 500 Cloudinary server configuration missing`);
      return NextResponse.json({ error: "Server upload configuration missing" }, { status: 500 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      console.error(`[Upload API] [${reqId}] Failed to parse multipart form data:`, err);
      return NextResponse.json({ error: "Invalid multipart/form-data payload" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      console.warn(`[Upload API] [${reqId}] Failed: 400 Empty or missing file`);
      return NextResponse.json({ error: "No valid file provided for upload" }, { status: 400 });
    }

    // Enforce 10MB limit (413 Payload Too Large)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      console.warn(`[Upload API] [${reqId}] Failed: 413 File size ${file.size} exceeds 10MB limit`);
      return NextResponse.json({ error: "File size exceeds maximum allowed 10MB limit" }, { status: 413 });
    }

    const mimeType = file.type || "application/octet-stream";
    console.log(`[Upload API] [${reqId}] Validating file "${file.name}" (${mimeType}, ${file.size} bytes)`);

    // MIME validation (Allow images, videos, audio/voice notes, documents, and mobile octet-stream blobs)
    const isImage = mimeType.startsWith("image/");
    const isVideoOrAudio = mimeType.startsWith("video/") || mimeType.startsWith("audio/");
    const isDocument = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/octet-stream",
    ].includes(mimeType);

    if (!isImage && !isVideoOrAudio && !isDocument) {
      console.warn(`[Upload API] [${reqId}] Failed: 415 Unsupported MIME type ${mimeType}`);
      return NextResponse.json({ error: `Unsupported media format: ${mimeType}` }, { status: 415 });
    }

    // Determine precise Cloudinary resource_type
    let resourceType: "auto" | "image" | "video" | "raw" = "auto";
    if (isImage) resourceType = "image";
    else if (isVideoOrAudio) resourceType = "video"; // Cloudinary handles all audio notes under video

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadOptions: Record<string, unknown> = {
      folder: "pingme_media",
      resource_type: resourceType,
      cloud_name,
      api_key,
      api_secret,
    };

    if (resourceType === "image") {
      uploadOptions.quality = "auto";
      uploadOptions.fetch_format = "auto";
    }

    console.log(`[Upload API] [${reqId}] Streaming buffer (${buffer.length} bytes) to Cloudinary [resource_type=${resourceType}]...`);

    const uploadResponse = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary returned an empty response object"));
        } else {
          resolve(result);
        }
      });
      stream.end(buffer);
    });

    const duration = Date.now() - startTime;
    console.log(`[Upload API] [${reqId}] Success in ${duration}ms! Public ID: ${uploadResponse.public_id}, URL: ${uploadResponse.secure_url}`);

    return NextResponse.json({
      url: uploadResponse.secure_url,
      fileName: file.name,
      fileSize: file.size,
      format: uploadResponse.format,
      width: uploadResponse.width,
      height: uploadResponse.height,
    }, { status: 200 });

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const msg = err?.message || err?.error?.message || (typeof error === "string" ? error : "Failed to stream upload to Cloudinary");
    const httpStatus = err?.http_code || 500;

    console.error(`[Upload API] [${reqId}] Failed after ${duration}ms with HTTP ${httpStatus}:`, {
      message: msg,
      name: err?.name,
      http_code: err?.http_code,
      error: err?.error,
    });

    return NextResponse.json(
      { error: msg, code: httpStatus, reqId },
      { status: httpStatus }
    );
  }
}

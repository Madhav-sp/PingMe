import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("Cloudinary credentials missing in server environment");
      return NextResponse.json({ error: "Server upload configuration missing" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 10MB limit enforcement
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${base64Data}`;

    // Use auto resource type so Cloudinary handles images, videos, audio, and documents (raw) reliably
    const uploadOptions: Record<string, unknown> = {
      folder: "pingme_media",
      resource_type: "auto",
    };

    if (file.type.startsWith("image/")) {
      uploadOptions.quality = "auto";
      uploadOptions.fetch_format = "auto";
    }

    const uploadResponse = await cloudinary.uploader.upload(dataUri, uploadOptions);

    return NextResponse.json({
      url: uploadResponse.secure_url,
      fileName: file.name,
      fileSize: file.size,
      format: uploadResponse.format,
      width: uploadResponse.width,
      height: uploadResponse.height,
    });
  } catch (error: unknown) {
    console.error("Cloudinary upload error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const msg = err?.message || err?.error?.message || (typeof error === "string" ? error : "Failed to upload media to Cloudinary");
    const status = err?.http_code || 500;
    return NextResponse.json(
      { error: msg },
      { status }
    );
  }
}

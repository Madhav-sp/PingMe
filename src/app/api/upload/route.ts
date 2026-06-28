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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${file.type || "application/octet-stream"};base64,${base64Data}`;

    // Determine resource type based on mime type
    let resourceType: "auto" | "image" | "video" | "raw" = "auto";
    if (file.type.startsWith("image/")) resourceType = "image";
    else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) resourceType = "video";
    else if (file.type === "application/pdf") resourceType = "image"; // Cloudinary treats PDF pages as images or raw

    const uploadOptions: Record<string, unknown> = {
      folder: "pingme_media",
      resource_type: resourceType,
    };

    if (resourceType === "image") {
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
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload media to Cloudinary" },
      { status: 500 }
    );
  }
}

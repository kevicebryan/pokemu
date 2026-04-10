import { NextRequest } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    const { imageUrl, size = 32 } = await request.json();

    if (!imageUrl) {
        return Response.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
        return Response.json({ error: `Failed to fetch image: ${imgRes.status}` }, { status: 400 });
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    // Shrink to mosaic resolution — CSS image-rendering: pixelated handles the upscale
    const mosaic = await sharp(imgBuffer)
        .resize(size, size, { fit: "inside", kernel: "nearest" })
        .png()
        .toBuffer();

    const base64 = mosaic.toString("base64");
    return Response.json({ base64 });
}

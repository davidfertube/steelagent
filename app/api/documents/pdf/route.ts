import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * PDF Proxy API - Serves PDFs from Supabase storage
 *
 * This endpoint proxies PDF requests to avoid CORS and authentication issues
 * when embedding PDFs in iframes.
 *
 * Usage: /api/documents/pdf?path=documents/xxx.pdf
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get("path");

    if (!storagePath) {
      return NextResponse.json(
        { error: "Missing path parameter" },
        { status: 400 }
      );
    }

    // Download the PDF from Supabase storage
    const { data, error } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (error || !data) {
      console.error("[PDF Proxy] Download error:", error);
      return NextResponse.json(
        { error: "Failed to fetch PDF" },
        { status: 404 }
      );
    }

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();

    // Return the PDF with proper headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("[PDF Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

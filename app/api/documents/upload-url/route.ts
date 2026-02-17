import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { MAX_PDF_SIZE } from "@/lib/validation";
import { handleApiError, createValidationError, getErrorStatusCode } from "@/lib/errors";
import { serverAuth, createServiceAuthClient } from "@/lib/auth";
import { trackAnonymousDocument, getAnonymousDocCount, ANONYMOUS_DOC_LIMIT } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

/**
 * Document Upload URL Generation API Route
 *
 * This endpoint generates pre-signed upload URLs for client-side uploads.
 * This bypasses Vercel's 4.5MB serverless function body size limit.
 *
 * Supports both authenticated and anonymous users:
 * - Authenticated: uses workspace context, enforces document quota
 * - Anonymous: limited to 1 document, tracked via session cookie
 *
 * Flow:
 * 1. Client requests signed URL with file metadata
 * 2. Server validates metadata and creates database record
 * 3. Server generates signed URL from Supabase Storage
 * 4. Client uploads directly to Supabase using signed URL
 * 5. Client calls /api/documents/upload to confirm completion
 *
 * Security:
 * - Signed URLs expire after 5 minutes
 * - File size validation before URL generation
 * - Filename sanitization prevents path traversal
 * - Database record created with 'uploading' status for audit trail
 */

interface UploadUrlRequest {
  filename: string;
  fileSize: number;
  contentType: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Upload URL API] Request received");

    // ========================================
    // Step 0: Check auth (optional for anonymous)
    // ========================================
    const user = await serverAuth.getCurrentUser();
    console.log("[Upload URL API] Auth check done, user:", user ? user.id : "anonymous");
    let anonymousSessionId: string | null = null;

    if (!user) {
      // Anonymous upload — check/create session cookie
      anonymousSessionId = request.cookies.get('anon_session')?.value || randomUUID();
      console.log("[Upload URL API] Anonymous session:", anonymousSessionId?.substring(0, 8) + "...");

      // Limit anonymous uploads to 1 document
      const docCount = await getAnonymousDocCount(anonymousSessionId);
      if (docCount >= ANONYMOUS_DOC_LIMIT) {
        return NextResponse.json(
          {
            error: "Anonymous users can upload 1 document. Sign up for more.",
            code: "ANONYMOUS_DOC_LIMIT",
            signupUrl: "/auth/signup",
          },
          { status: 429 }
        );
      }
    }

    // ========================================
    // Step 1: Parse and Validate Request Body
    // ========================================
    let body: UploadUrlRequest;

    try {
      body = await request.json();
    } catch {
      const error = createValidationError("Invalid request body. Expected JSON.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    const { filename, fileSize, contentType } = body;

    // Validate required fields
    if (!filename || typeof filename !== "string") {
      const error = createValidationError("Missing or invalid filename.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      const error = createValidationError("Missing or invalid file size.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    if (!contentType || contentType !== "application/pdf") {
      const error = createValidationError("Only PDF files are allowed.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 2: Validate File Size
    // ========================================
    if (fileSize > MAX_PDF_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
      const maxMB = (MAX_PDF_SIZE / (1024 * 1024)).toFixed(0);
      const error = createValidationError(
        `File too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`
      );
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 3: Generate Safe Filename
    // ========================================
    // Use timestamp + sanitized filename to prevent collisions and path traversal
    const timestamp = Date.now();
    // Sanitize filename: keep only alphanumeric, dots, and hyphens
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${timestamp}-${sanitizedName}`;

    // ========================================
    // Step 4: Create Database Record
    // ========================================
    // Use service client for anonymous uploads (bypasses RLS)
    console.log("[Upload URL API] Creating DB client, anonymous:", !!anonymousSessionId, "serviceKey present:", !!process.env.SUPABASE_SERVICE_KEY);
    let db;
    try {
      db = anonymousSessionId ? createServiceAuthClient() : supabase;
    } catch (error) {
      console.error("[Upload URL API] Service client creation failed:", error);
      return NextResponse.json(
        { error: "Upload service is not configured. Please contact support.", code: "SERVICE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const insertData: Record<string, unknown> = {
      filename: filename,
      storage_path: storagePath,
      file_size: fileSize,
      status: "uploading",
    };

    if (anonymousSessionId) {
      insertData.anonymous_session_id = anonymousSessionId;
    }

    const { data: docData, error: docError } = await db
      .from("documents")
      .insert(insertData)
      .select("id")
      .single();

    if (docError) {
      console.error("[Upload URL API] Database insert error:", docError);
      const { response, status } = handleApiError(docError, "Upload URL Generation - Database");
      return NextResponse.json(response, { status });
    }

    // Track anonymous document ownership
    if (anonymousSessionId) {
      await trackAnonymousDocument(anonymousSessionId, docData.id);
    }

    // ========================================
    // Step 5: Generate Signed Upload URL
    // ========================================
    // Use service client for storage too (anonymous has no auth context)
    const storageClient = db;
    const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
      .from("documents")
      .createSignedUploadUrl(storagePath);

    if (signedUrlError) {
      console.error("[Upload URL API] Signed URL generation error:", signedUrlError);

      // Clean up the database record since we couldn't generate URL
      try {
        await db.from("documents").delete().eq("id", docData.id);
      } catch (cleanupError) {
        console.error("[Upload URL API] Failed to clean up database record:", cleanupError);
      }

      const { response, status } = handleApiError(
        signedUrlError,
        "Upload URL Generation - Signed URL"
      );
      return NextResponse.json(response, { status });
    }

    // ========================================
    // Step 6: Return Success Response
    // ========================================
    const jsonResponse = NextResponse.json({
      success: true,
      documentId: docData.id,
      uploadUrl: signedUrlData.signedUrl,
      path: storagePath,
      token: signedUrlData.token,
    });

    // Set anonymous session cookie if new
    if (anonymousSessionId && !request.cookies.get('anon_session')) {
      jsonResponse.cookies.set('anon_session', anonymousSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return jsonResponse;

  } catch (error) {
    // Use safe error handler - never leaks internal details
    const { response, status } = handleApiError(error, "Upload URL Generation");
    return NextResponse.json(response, { status });
  }
}

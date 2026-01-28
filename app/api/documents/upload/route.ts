import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validatePdfMagicBytes, MAX_PDF_SIZE } from "@/lib/validation";
import { handleApiError, createValidationError, getErrorStatusCode } from "@/lib/errors";

/**
 * Document Upload API Route
 *
 * This endpoint handles PDF uploads with comprehensive validation:
 * 1. File presence check
 * 2. MIME type validation
 * 3. File size validation
 * 4. PDF magic byte validation (security - prevents file type spoofing)
 * 5. Uploads to Supabase Storage
 * 6. Creates database record for tracking
 *
 * Security features:
 * - PDF magic byte validation (prevents non-PDFs disguised as PDFs)
 * - File size limits (50MB)
 * - Filename sanitization (prevents path traversal)
 * - Safe error handling (no internal details leaked)
 */

export async function POST(request: NextRequest) {
  try {
    // ========================================
    // Step 1: Extract File from FormData
    // ========================================
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      const error = createValidationError("No file provided. Please select a PDF to upload.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 2: Basic MIME Type Check
    // ========================================
    // This is a quick check but NOT security - MIME type is client-controlled
    if (file.type !== "application/pdf") {
      const error = createValidationError("Only PDF files are allowed. Please upload a .pdf file.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 3: File Size Validation
    // ========================================
    if (file.size === 0) {
      const error = createValidationError("File is empty. Please upload a valid PDF document.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    if (file.size > MAX_PDF_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (MAX_PDF_SIZE / (1024 * 1024)).toFixed(0);
      const error = createValidationError(
        `File too large (${sizeMB}MB). Maximum allowed size is ${maxMB}MB.`
      );
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 4: PDF Magic Byte Validation (Security)
    // ========================================
    // This checks the actual file content, not just the MIME type
    // Prevents attackers from uploading malicious files with a fake .pdf extension
    const pdfValidation = await validatePdfMagicBytes(file);
    if (!pdfValidation.isValid) {
      const error = createValidationError(pdfValidation.error || "Invalid PDF file.");
      return NextResponse.json(error, { status: getErrorStatusCode("VALIDATION_ERROR") });
    }

    // ========================================
    // Step 5: Generate Safe Filename
    // ========================================
    // Use timestamp + sanitized filename to prevent collisions and path traversal
    const timestamp = Date.now();
    // Sanitize filename: keep only alphanumeric, dots, and hyphens
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${sanitizedName}`;

    // ========================================
    // Step 6: Upload to Supabase Storage
    // ========================================
    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error("[Upload API] Supabase storage error:", uploadError);
      // Use safe error response - don't leak storage details
      const { response, status } = handleApiError(uploadError, "Document Upload - Storage");
      return NextResponse.json(response, { status });
    }

    // ========================================
    // Step 7: Get Public URL
    // ========================================
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);

    // ========================================
    // Step 8: Create Database Record
    // ========================================
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert({
        filename: file.name, // Store original filename for display
        storage_path: data.path,
        file_size: file.size,
        status: "pending", // Will be updated to "indexed" after processing
      })
      .select("id")
      .single();

    if (docError) {
      console.error("[Upload API] Database insert error:", docError);
      // Try to clean up the uploaded file since we couldn't create the record
      try {
        await supabase.storage.from("documents").remove([fileName]);
      } catch (cleanupError) {
        console.error("[Upload API] Failed to clean up orphaned file:", cleanupError);
      }
      const { response, status } = handleApiError(docError, "Document Upload - Database");
      return NextResponse.json(response, { status });
    }

    // ========================================
    // Step 9: Return Success Response
    // ========================================
    return NextResponse.json({
      success: true,
      documentId: docData.id,
      path: data.path,
      url: urlData.publicUrl,
    });

  } catch (error) {
    // Use safe error handler - never leaks internal details
    const { response, status } = handleApiError(error, "Document Upload");
    return NextResponse.json(response, { status });
  }
}

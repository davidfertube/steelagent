#!/usr/bin/env tsx
/**
 * Batch Upload Missing Documents
 * Uploads PDFs directly to Supabase and triggers processing
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const MISSING_DOCS = [
  'ASTM A790 Seamless & Welded Duplex Pipe 2014.pdf',
  'ASTM A1049 Duplex Stainless Steel Forgings For Pressure Vessels R 2015.pdf',
  'API Spec 5CT Purchasing Guidelines 9th Edition 2012-04.pdf',
  'API Spec 16C Choke & Kill Systems 1993.pdf',
  // Skip API 6A for now - 466 pages is very large
  // 'API Spec 6A Wellhead & Xmas Tree Equipment 20th Edition Errata At 2016.pdf',
];

const PDF_DIR = 'tests/stress/real-pdfs';

async function uploadDocument(filename: string): Promise<number | null> {
  const filePath = path.join(PDF_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const storagePath = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  console.log(`\n📤 Uploading: ${filename} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

  // 1. Create document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      filename,
      storage_path: storagePath,
      file_size: fileSize,
      status: 'uploading',
    })
    .select('id')
    .single();

  if (docError || !doc) {
    console.log(`❌ Failed to create document record:`, docError?.message);
    return null;
  }

  // 2. Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.log(`❌ Failed to upload to storage:`, uploadError.message);
    // Clean up document record
    await supabase.from('documents').delete().eq('id', doc.id);
    return null;
  }

  // 3. Update status to pending
  await supabase
    .from('documents')
    .update({ status: 'pending' })
    .eq('id', doc.id);

  console.log(`✅ Uploaded: ${filename} (ID: ${doc.id})`);
  return doc.id;
}

async function processDocument(documentId: number): Promise<boolean> {
  console.log(`⚙️  Processing document ID: ${documentId}...`);

  try {
    const response = await fetch('http://localhost:3000/api/documents/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Processing failed:`, error.slice(0, 200));
      return false;
    }

    const result = await response.json();
    console.log(`✅ Processed: ${result.chunks || 0} chunks created`);
    return true;
  } catch (error: unknown) {
    console.log(`❌ Processing error:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.log('=== BATCH UPLOAD MISSING DOCUMENTS ===\n');
  console.log(`Documents to upload: ${MISSING_DOCS.length}`);

  const uploadedIds: number[] = [];

  // Upload all documents first
  for (const filename of MISSING_DOCS) {
    const docId = await uploadDocument(filename);
    if (docId) {
      uploadedIds.push(docId);
    }
  }

  console.log(`\n📊 Uploaded ${uploadedIds.length}/${MISSING_DOCS.length} documents`);

  // Process each document
  console.log('\n=== PROCESSING DOCUMENTS ===\n');

  let processed = 0;
  for (const docId of uploadedIds) {
    const success = await processDocument(docId);
    if (success) processed++;
    // Small delay between processing
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ COMPLETE: ${processed}/${uploadedIds.length} documents processed`);
}

main().catch(console.error);

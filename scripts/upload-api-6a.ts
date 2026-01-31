#!/usr/bin/env tsx
/**
 * Upload API Spec 6A (466 pages) - Large Document
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

const filename = 'API Spec 6A Wellhead & Xmas Tree Equipment 20th Edition Errata At 2016.pdf';
const PDF_DIR = 'tests/stress/real-pdfs';

async function main() {
  const filePath = path.join(PDF_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const storagePath = `${Date.now()}-API_Spec_6A.pdf`;

  console.log(`📤 Uploading: ${filename}`);
  console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   This is a large document (466 pages) - processing will take several minutes...`);

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
    return;
  }

  console.log(`   Document ID: ${doc.id}`);

  // 2. Upload to storage
  console.log(`⬆️  Uploading to storage...`);
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.log(`❌ Failed to upload to storage:`, uploadError.message);
    await supabase.from('documents').delete().eq('id', doc.id);
    return;
  }

  // 3. Update status to pending
  await supabase
    .from('documents')
    .update({ status: 'pending' })
    .eq('id', doc.id);

  console.log(`✅ Uploaded to storage`);

  // 4. Process document (extract text and generate embeddings)
  console.log(`⚙️  Processing document (this will take several minutes for 466 pages)...`);
  console.log(`   Extracting text, chunking, generating embeddings...`);

  try {
    const response = await fetch('http://localhost:3000/api/documents/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Processing failed:`, error.slice(0, 500));
      return;
    }

    const result = await response.json();
    console.log(`\n✅ COMPLETE!`);
    console.log(`   Chunks created: ${result.chunks || 0}`);
    console.log(`   Document is now ready for queries`);
  } catch (error: unknown) {
    console.log(`❌ Processing error:`, error instanceof Error ? error.message : String(error));
  }
}

main().catch(console.error);

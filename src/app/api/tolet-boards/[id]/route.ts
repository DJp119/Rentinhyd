// src/app/api/tolet-boards/[id]/route.ts
// GET /api/tolet-boards/:id - Get detail view of an approved To-Let board

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: board, error } = await supabase
      .from('tolet_boards')
      .select('id, locality, image_path, phone_encrypted, status, expires_at')
      .eq('id', id)
      .single();

    if (error || !board) {
      return NextResponse.json({ error: 'To-Let board not found' }, { status: 404 });
    }

    // Must be approved and not expired
    if (board.status !== 'approved' || new Date(board.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'To-Let board not found or expired' }, { status: 404 });
    }

    // Generate 1-hour signed image URL
    let imageUrl = '';
    const { data: signedData } = await supabase.storage
      .from('tolet-boards')
      .createSignedUrl(board.image_path, 3600);

    if (signedData?.signedUrl) {
      imageUrl = signedData.signedUrl;
    }

    // Decrypt phone number
    let phone = '';
    if (board.phone_encrypted) {
      const parts = board.phone_encrypted.split(':');
      if (parts.length === 3) {
        try {
          phone = await decrypt(parts[0], parts[1], parts[2]);
        } catch {
          phone = 'Protected';
        }
      }
    }

    return NextResponse.json({
      id: board.id,
      locality: board.locality,
      phone,
      imageUrl,
      expiresAt: board.expires_at,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

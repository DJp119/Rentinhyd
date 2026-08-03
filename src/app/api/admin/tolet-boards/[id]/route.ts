// src/app/api/admin/tolet-boards/[id]/route.ts
// PATCH /api/admin/tolet-boards/:id - Admin moderation actions on To-Let boards

import { NextRequest, NextResponse } from 'next/server';
import { approveToLetBoard, quarantineToLetBoard, deleteContent } from '@/lib/moderation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    // Verify admin header / secret
    const adminHeader = request.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_KEY || 'admin-secret';

    if (adminHeader !== expectedKey && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = 'admin-user';

    if (action === 'approve') {
      const result = await approveToLetBoard(id, adminId, reason);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ message: 'To-Let board approved' });
    }

    if (action === 'quarantine') {
      const result = await quarantineToLetBoard(id, adminId, reason || 'Quarantined by admin');
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ message: 'To-Let board quarantined' });
    }

    if (action === 'delete') {
      const result = await deleteContent('tolet_board', id, adminId, reason || 'Deleted by admin');
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ message: 'To-Let board deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

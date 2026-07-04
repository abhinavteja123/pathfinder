import { NextRequest, NextResponse } from 'next/server';

/**
 * Read-only view into the host portal's own application/hackathon activity.
 * Pathfinder never writes to the host portal's tables (see design doc §5/§9
 * risk: state-sync drift). Placeholder until the real host portal's
 * applications API is known -- real implementation proxies to it.
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  return NextResponse.json({
    applications: [],
    hackathonsJoined: [],
    internshipsApplied: [],
  });
}

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const isVerified = global.verifiedUsers?.has(String(userId)) || false;
  return NextResponse.json({ verified: isVerified });
}

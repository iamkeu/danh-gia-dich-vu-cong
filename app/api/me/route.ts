import { NextResponse } from 'next/server';
import { publicServiceAuthError, requirePublicServiceAccount } from '@/lib/public-service/auth';

export async function GET() {
  try {
    const { account } = await requirePublicServiceAccount();
    return NextResponse.json({ data: account });
  } catch (error) {
    return publicServiceAuthError(error);
  }
}

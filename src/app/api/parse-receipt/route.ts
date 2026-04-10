import { NextRequest, NextResponse } from 'next/server';
import { extractReceiptDetails } from '@/lib/receiptExtractionAdapter';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const details = await extractReceiptDetails(buffer, image.type);

    return NextResponse.json(details);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to parse receipt';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

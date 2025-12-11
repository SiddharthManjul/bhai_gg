import { NextRequest, NextResponse } from 'next/server'

// GET /api/nft/metadata/[id] - Return NFT metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Decode the metadata from base64url
    const metadataJson = Buffer.from(id, 'base64url').toString('utf-8')
    const metadata = JSON.parse(metadataJson)

    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json(
      { error: 'Invalid metadata ID' },
      { status: 400 }
    )
  }
}

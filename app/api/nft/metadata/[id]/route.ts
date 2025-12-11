import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/nft/metadata/[id] - Return NFT metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // First try to fetch from database (new format)
    const dbMetadata = await db.nftMetadata.findUnique({
      where: { id },
    })

    if (dbMetadata) {
      const metadata = {
        name: dbMetadata.name,
        description: dbMetadata.description,
        image: dbMetadata.image,
        attributes: dbMetadata.attributes,
      }

      return NextResponse.json(metadata, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Fallback: try to decode from base64url (legacy format)
    try {
      const metadataJson = Buffer.from(id, 'base64url').toString('utf-8')
      const metadata = JSON.parse(metadataJson)

      return NextResponse.json(metadata, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'Metadata not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json(
      { error: 'Invalid metadata ID' },
      { status: 400 }
    )
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import { createCanvas, loadImage, registerFont } from 'canvas'
import path from 'path'
import fs from 'fs'

export async function generateEventBadgeImage(eventName: string): Promise<string> {
  try {
    // Register Noto Sans font for proper text rendering
    const fontPath = path.join(
      process.cwd(),
      'node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf'
    )
    registerFont(fontPath, { family: 'Noto Sans' })

    // Load background image
    const bgPath = path.join(process.cwd(), 'public', 'bhai_bg.jpeg')
    const background = await loadImage(bgPath)

    // Create canvas with same dimensions as background
    const canvas = createCanvas(background.width, background.height)
    const ctx = canvas.getContext('2d')

    // Draw background
    ctx.drawImage(background, 0, 0)

    // Set text properties for event name (center)
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Calculate font size based on canvas width (responsive)
    const baseFontSize = Math.floor(canvas.width / 15)
    ctx.font = `bold ${baseFontSize}px "Noto Sans"`

    // Add semi-transparent background for better text readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Wrap text if too long
    const maxWidth = canvas.width * 0.8
    const words = eventName.split(' ')
    let line = ''
    const lines: string[] = []

    for (const word of words) {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line.trim())
        line = word + ' '
      } else {
        line = testLine
      }
    }
    lines.push(line.trim())

    // Draw event name in center (with multiple lines if needed)
    const centerY = canvas.height / 2
    const lineHeight = baseFontSize * 1.2
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2

    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight))
    })

    // Reset shadow for "Bhai Cabal" text
    ctx.shadowBlur = 10

    // Set text properties for "Bhai Cabal" (bottom left)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const bottomTextSize = Math.floor(canvas.width / 25)
    ctx.font = `${bottomTextSize}px "Noto Sans"`

    // Draw "Bhai Cabal" in bottom left corner with padding
    const padding = 40
    ctx.fillText('Bhai Cabal', padding, canvas.height - padding)

    // Convert canvas to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.9)

    return base64Image
  } catch (error) {
    console.error('Error generating NFT badge image:', error)
    throw error
  }
}

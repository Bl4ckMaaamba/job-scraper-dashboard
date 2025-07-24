import { NextResponse } from 'next/server'
import { clearAllResults } from '../../../lib/storage'

export async function POST() {
  try {
    const clearedCount = clearAllResults()
    
    console.log(`🧹 API clear-results: ${clearedCount} jobs cleared`)
    
    return NextResponse.json({
      success: true,
      message: `${clearedCount} results cleared`,
      clearedCount
    })
  } catch (error) {
    console.error('Error clearing results:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error clearing results' 
      },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getResults } from '../../../lib/storage'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 })
  }

  try {
    const storedResults = getResults(jobId)
    
    if (storedResults) {
      return NextResponse.json({
        success: true,
        results: storedResults,
        count: storedResults.length,
        source: 'Job Scraper Dashboard',
        summary: {
          totalCompanies: 1,
          totalJobs: storedResults.length
        }
      })
    }

    return NextResponse.json({
      success: true,
      results: [],
      count: 0,
      source: 'Job Scraper Dashboard',
      summary: {
        totalCompanies: 0,
        totalJobs: 0
      }
    })

  } catch (error) {
    console.error('Error retrieving results:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error retrieving results' 
    }, { status: 500 })
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { storeResults } from '../../../lib/storage'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { sites, csvData, interval } = await request.json()

    if (!sites || !csvData) {
      return NextResponse.json(
        { error: 'Sites and CSV data required' },
        { status: 400 }
      )
    }

    const jobId = `job_${Date.now()}`
    const allResults = []
    let totalJobs = 0

    console.log(`Processing sites: ${sites.join(', ')}`)

    // Process all selected sites
    for (const site of sites) {
      console.log(`Processing site: ${site}`)
      
      if (site === 'proprietary') {
        try {
          console.log('🧠 Starting adaptive scraping...')
          
          // Create temporary CSV file
          const tempCsvPath = path.join(process.cwd(), `temp_companies_${jobId}.csv`)
          fs.writeFileSync(tempCsvPath, csvData)

          // Execute adaptive scraper
          const { stdout, stderr } = await execAsync(`node "${path.join(process.cwd(), 'scraper_adaptatif.js')}" "${tempCsvPath}"`)
          
          // Clean up temporary file
          fs.unlinkSync(tempCsvPath)

          if (stderr) {
            console.log('Adaptive scraper stderr:', stderr)
          }

          // Read generated results file
          const resultFiles = fs.readdirSync(process.cwd()).filter(f => f.startsWith('scraping-adaptatif-'))
          const latestResultFile = resultFiles.sort().pop()
          
          if (latestResultFile) {
            const adaptiveResults = JSON.parse(fs.readFileSync(latestResultFile, 'utf8'))
            
            // Transform results for the interface
            const formattedResults = []
            for (const companyResult of adaptiveResults) {
              if (companyResult.jobs && companyResult.jobs.length > 0) {
                for (const job of companyResult.jobs) {
                  formattedResults.push({
                    id: `adaptatif_${Math.random()}`,
                    title: job.title || '',
                    company: job.company || companyResult.company,
                    location: job.location || '',
                    date: job.scraped_at ? job.scraped_at.split('T')[0] : new Date().toISOString().split('T')[0],
                    description: '',
                    url: job.link || companyResult.jobsUrl || '',
                    site: `Official Website${companyResult.pageType ? ' (' + companyResult.pageType + ')' : ''}`,
                    status: 'NEW',
                    scraped_at: new Date().toISOString(),
                    websiteUrl: companyResult.website,
                    jobsPageUrl: companyResult.jobsUrl,
                    extractionType: companyResult.pageType,
                    scrapingStatus: companyResult.status
                  })
                }
              }
            }
            
            allResults.push(...formattedResults)
            totalJobs += formattedResults.filter(r => r.status === 'NEW').length
            
            // Clean up results file
            fs.unlinkSync(latestResultFile)
            
            const successfulJobs = formattedResults.filter(r => r.status === 'NEW').length
            console.log(`🎯 Adaptive Scraper: ${successfulJobs} jobs found`)
          } else {
            console.log('No results file found for adaptive scraping')
          }

        } catch (error) {
          console.log('Error in adaptive scraping:', error)
        }
      } else if (site === 'linkedin') {
        try {
          console.log('=== STARTING LINKEDIN SCRAPING ===')
          
          // Create integrated LinkedIn scraper
          const linkedinScraperCode = `
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function parseCsvCompanies(csvContent) {
    const companies = [];
    const lines = csvContent.trim().split('\\n');
    
    if (!lines.length) return companies;
    
    const csvLines = lines.slice(1);
    
    csvLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 0) {
            const company = parts[0].trim().replace(/"/g, '');
            if (company && company.length > 0 && !companies.includes(company)) {
                companies.push(company);
            }
        }
    });
    
    return companies;
}

async function getJobsFromLinkedin(browser, company, location = 'France') {
    const page = await browser.newPage();
    
    try {
        await page.setExtraHTTPHeaders({'accept-language': 'fr-FR,fr;q=0.9'});
        
        const searchUrl = \`https://linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords="\${encodeURIComponent(company)}"&start=0&location=\${encodeURIComponent(location)}\`;
        
        console.log(\`LinkedIn - Query: \${company}, url: \${searchUrl}\`);
        
        await page.goto(searchUrl, {waitUntil: 'networkidle2'});
        
        try {
            await page.waitForSelector('.job-search-card', {timeout: 10000});
        } catch (timeoutError) {
            const selectors = ['.job-search-card', '.job-card-container', '.job-card', '[data-job-id]'];
            
            let foundSelector = null;
            for (const selector of selectors) {
                try {
                    await page.waitForSelector(selector, {timeout: 2000});
                    foundSelector = selector;
                    break;
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            if (!foundSelector) {
                throw new Error('No job cards found on page');
            }
        }
        
        const jobs = await page.evaluate(() => {
            const selectors = ['.job-search-card', '.job-card-container', '.job-card', '[data-job-id]'];
            
            let jobCards = [];
            for (const selector of selectors) {
                jobCards = document.querySelectorAll(selector);
                if (jobCards.length > 0) break;
            }
            
            return Array.from(jobCards).map(card => {
                const titleElement = card.querySelector('h3 a, .job-title a, [data-job-title], h4 a');
                const companyElement = card.querySelector('.job-search-card__subtitle-primary-grouping a, .company-name, [data-job-company-name]');
                const locationElement = card.querySelector('.job-search-card__location, .job-location, [data-job-location]');
                const linkElement = card.querySelector('h3 a, .job-title a, a[data-job-id]');
                const dateElement = card.querySelector('.job-search-card__listdate, .job-posted-date, [data-job-posted-date]');
                
                return {
                    title: titleElement ? titleElement.textContent.trim() : '',
                    company: companyElement ? companyElement.textContent.trim() : '',
                    location: locationElement ? locationElement.textContent.trim() : '',
                    url: linkElement ? linkElement.href : '',
                    date: dateElement ? dateElement.textContent.trim() : ''
                };
            }).filter(job => job.title && job.title.length > 0);
        });
        
        await page.close();
        return jobs;
        
    } catch (error) {
        console.error(\`Error scraping \${company}: \${error.message}\`);
        await page.close();
        return [];
    }
}

async function main() {
    const csvContent = process.argv[2];
    const outputDir = process.argv[3];
    
    if (!csvContent || !outputDir) {
        console.error('Usage: node script.js <csvContent> <outputDir>');
        process.exit(1);
    }
    
    const companies = parseCsvCompanies(csvContent);
    console.log(\`Processing \${companies.length} companies: \${companies}\`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu']
    });
    
    let totalJobs = 0;
    const allJobs = [];
    
    for (const company of companies) {
        try {
            console.log(\`[LinkedIn] Processing \${company}...\`);
            
            const jobs = await getJobsFromLinkedin(browser, company);
            
            console.log(\`LinkedIn - \${company}: \${jobs.length} jobs found\`);
            
            const processedJobs = jobs.map(job => ({
                nom_entreprise: company,
                intitule_poste: job.title,
                lieu: job.location,
                lien: job.url,
                date_publication: job.date,
                description: '',
                plateforme: 'LinkedIn'
            }));
            
            allJobs.push(...processedJobs);
            totalJobs += jobs.length;
            
            // Delay between companies
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error(\`Failed to process \${company}: \${error.message}\`);
        }
    }
    
    await browser.close();
    
    const outputPath = path.join(outputDir, 'linkedin_results.jsonl');
    fs.writeFileSync(outputPath, JSON.stringify({
        success: true,
        jobs: allJobs,
        total_jobs: totalJobs,
        outputFile: outputPath
    }));
    
    console.log(\`LinkedIn scraping completed! \${totalJobs} jobs found total\`);
    console.log(JSON.stringify({success: true, jobs: allJobs, count: totalJobs, outputFile: outputPath}));
}

if (require.main === module) {
    main().catch(console.error);
}
`;

          // Create temp LinkedIn scraper file
          const tempLinkedinPath = path.join(process.cwd(), `temp_linkedin_${jobId}.js`)
          fs.writeFileSync(tempLinkedinPath, linkedinScraperCode)

          // Create output directory
          const outputDir = path.join(process.cwd(), `linkedin_results_${jobId}`)
          fs.mkdirSync(outputDir, { recursive: true })

          // Execute LinkedIn scraper
          const { stdout, stderr } = await execAsync(`node "${tempLinkedinPath}" '${csvData}' "${outputDir}"`)
          
          // Clean up temp file
          fs.unlinkSync(tempLinkedinPath)

          if (stderr) {
            console.log('LinkedIn stderr:', stderr)
          }

          // Parse LinkedIn results
          const linkedinOutputFile = path.join(outputDir, 'linkedin_results.jsonl')
          if (fs.existsSync(linkedinOutputFile)) {
            const linkedinResults = JSON.parse(fs.readFileSync(linkedinOutputFile, 'utf8'))
            
            if (linkedinResults.success && linkedinResults.jobs) {
              const formattedResults = linkedinResults.jobs.map((job: any) => ({
                id: `linkedin_${Math.random()}`,
                title: job.intitule_poste,
                company: job.nom_entreprise,
                location: job.lieu,
                date: job.date_publication,
                description: job.description || '',
                url: job.lien,
                site: 'LinkedIn',
                status: 'NEW',
                scraped_at: new Date().toISOString()
              }))
              
              allResults.push(...formattedResults)
              totalJobs += formattedResults.length
              
              console.log(`LinkedIn: ${formattedResults.length} jobs found`)
            }
            
            // Clean up
            fs.rmSync(outputDir, { recursive: true, force: true })
          }

        } catch (error) {
          console.log('Error in LinkedIn scraping:', error)
        }
      } else if (site === 'indeed') {
        try {
          console.log('=== STARTING INDEED SCRAPING ===')
          console.log('Executing Indeed script...')
          
          const indeedScraperCode = `
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function parseCsvCompanies(csvContent) {
    const companies = [];
    const lines = csvContent.trim().split('\\n');
    
    if (!lines.length) return companies;
    
    const csvLines = lines.slice(1);
    
    csvLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length > 0) {
            const company = parts[0].trim().replace(/"/g, '');
            if (company && company.length > 0 && !companies.includes(company)) {
                companies.push(company);
            }
        }
    });
    
    return companies;
}

async function main() {
    const csvContent = process.argv[2];
    const outputDir = process.argv[3];
    
    if (!csvContent || !outputDir) {
        console.error('Usage: node script.js <csvContent> <outputDir>');
        process.exit(1);
    }
    
    const companies = parseCsvCompanies(csvContent);
    console.log(\`\${companies.length} companies found: \${companies.join(', ')}\`);
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const allJobs = [];
    
    for (const company of companies) {
        try {
            console.log(\`[\${companies.indexOf(company) + 1}/\${companies.length}] Processing \${company}...\`);
            
            const page = await browser.newPage();
            const searchUrl = \`https://fr.indeed.com/jobs?q=\${encodeURIComponent(company)}\`;
            
            console.log(\`Indeed - Query: \${company}, url: \${searchUrl}\`);
            
            await page.goto(searchUrl, {waitUntil: 'networkidle2'});
            console.log(\`Indeed page loaded, status: \${await page.evaluate(() => document.readyState)}\`);
            
            // Look for mosaic-data script
            console.log('Looking for mosaic-data script...');
            const jobData = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    if (script.textContent && script.textContent.includes('mosaic-data')) {
                        console.log('mosaic-data script found');
                        const match = script.textContent.match(/window\\.mosaic\\.providerData\\["mosaic-provider-jobcards"\\]\\s*=\\s*(\\{.*?\\});/s);
                        if (match) {
                            console.log('Regex match found, parsing JSON...');
                            try {
                                return JSON.parse(match[1]);
                            } catch (e) {
                                console.log('JSON parsing failed:', e.message);
                                return null;
                            }
                        }
                    }
                }
                return null;
            });
            
            await page.close();
            
            if (jobData && jobData.metaData && jobData.metaData.mosaicProviderJobCardsModel && jobData.metaData.mosaicProviderJobCardsModel.results) {
                const jobs = jobData.metaData.mosaicProviderJobCardsModel.results;
                console.log(\`\${jobs.length} jobs found in JSON\`);
                
                const processedJobs = [];
                
                jobs.forEach((job, index) => {
                    const title = job.title || '';
                    const companyName = job.company || '';
                    const location = job.formattedLocation || '';
                    const link = job.link ? \`https://fr.indeed.com\${job.link}\` : '';
                    const date = job.formattedRelativeTime || '';
                    const description = job.snippet || '';
                    
                    console.log(\`Job \${index + 1}: \${title} - \${companyName} - \${location}\`);
                    
                    if (companyName.toLowerCase().includes(company.toLowerCase())) {
                        processedJobs.push({
                            nom_entreprise: company,
                            intitule_poste: title,
                            lieu: location,
                            lien: link,
                            date_publication: date,
                            description: description,
                            plateforme: 'Indeed'
                        });
                        console.log(\`Accepted offer: \${title} - \${companyName}\`);
                    } else {
                        console.log(\`Ignored offer (wrong company): \${title} - \${companyName} (searched: \${company})\`);
                    }
                });
                
                console.log(\`Indeed - \${company}: \${processedJobs.length} unique offers after deduplication\`);
                allJobs.push(...processedJobs);
                
            } else {
                console.log('No job data found in mosaic-data script');
            }
            
        } catch (error) {
            console.error(\`Error processing \${company}: \${error.message}\`);
        }
    }
    
    await browser.close();
    
    console.log(\`Total Indeed: \${allJobs.length} jobs found\`);
    
    const outputPath = path.join(outputDir, 'indeed_results.jsonl');
    fs.writeFileSync(outputPath, JSON.stringify({
        success: true,
        jobs: allJobs,
        count: allJobs.length,
        outputFile: outputPath
    }));
    
    console.log(\`Results saved to: \${outputPath}\`);
    console.log(JSON.stringify({success: true, jobs: allJobs, count: allJobs.length, outputFile: outputPath}));
}

if (require.main === module) {
    main().catch(console.error);
}
`;

          // Create temp Indeed scraper file
          const tempIndeedPath = path.join(process.cwd(), `temp_indeed_${jobId}.js`)
          fs.writeFileSync(tempIndeedPath, indeedScraperCode)

          // Create output directory
          const outputDir = path.join(process.cwd(), `indeed_results_${jobId}`)
          fs.mkdirSync(outputDir, { recursive: true })

          // Execute Indeed scraper
          const { stdout, stderr } = await execAsync(`node "${tempIndeedPath}" '${csvData}' "${outputDir}"`)
          
          // Clean up temp file
          fs.unlinkSync(tempIndeedPath)

          if (stderr) {
            console.log('Indeed stderr:', stderr)
          }

          // Parse Indeed results
          const indeedOutputFile = path.join(outputDir, 'indeed_results.jsonl')
          if (fs.existsSync(indeedOutputFile)) {
            const indeedResults = JSON.parse(fs.readFileSync(indeedOutputFile, 'utf8'))
            
            if (indeedResults.success && indeedResults.jobs) {
              const formattedResults = indeedResults.jobs.map((job: any) => ({
                id: `indeed_${Math.random()}`,
                title: job.intitule_poste,
                company: job.nom_entreprise,
                location: job.lieu,
                date: job.date_publication,
                description: job.description || '',
                url: job.lien,
                site: 'Indeed',
                status: 'NEW',
                scraped_at: new Date().toISOString()
              }))
              
              allResults.push(...formattedResults)
              totalJobs += formattedResults.length
              
              console.log(`Indeed: ${formattedResults.length} jobs found`)
            }
            
            // Clean up
            fs.rmSync(outputDir, { recursive: true, force: true })
          }

        } catch (error) {
          console.log('Error in Indeed scraping:', error)
        }
      }
    }

    console.log(`Processing completed. Total results: ${allResults.length}`)

    // Store all results in memory
    storeResults(jobId, allResults)

  return NextResponse.json({
    success: true,
    job: {
      id: jobId,
        sites,
        status: 'completed',
        progress: 100,
        startTime: new Date().toISOString(),
        companyCount: allResults.length > 0 ? 1 : 0
      },
      message: `Scraping completed: ${totalJobs} jobs found on ${sites.length} site(s)`,
      results: allResults
    })

  } catch (error) {
    console.error('Error during scraping:', error)
    return NextResponse.json(
      { error: 'Error during scraping' },
      { status: 500 }
    )
  }
} 
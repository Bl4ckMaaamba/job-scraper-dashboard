const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class AdaptiveScraper {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async makeRequest(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: 30000,
          maxRedirects: 5,
        });
        return response;
      } catch (error) {
        console.log(`Request failed for ${url}, attempt ${i + 1}/${retries}: ${error.message}`);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }

  async findOfficialWebsite(companyName) {
    try {
      const searchQuery = `"${companyName}" site officiel`;
      const bingSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await this.makeRequest(bingSearchUrl);
      const $ = cheerio.load(response.data);
      
      const results = [];
      $('.b_algo h2 a').each((i, element) => {
        const href = $(element).attr('href');
        if (href && this.isValidDomain(href) && !this.isExcludedDomain(href)) {
          results.push(href);
        }
      });
      
      for (const url of results.slice(0, 5)) {
        if (await this.isOfficialSite(url, companyName)) {
          const domain = new URL(url).hostname.replace('www.', '');
          console.log(`✅ Official site found: ${domain}`);
          return domain;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding official website for ${companyName}: ${error.message}`);
      return null;
    }
  }

  isValidDomain(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return domain.includes('.') && !domain.startsWith('localhost');
    } catch {
      return false;
    }
  }

  isExcludedDomain(url) {
    const excludedDomains = [
      'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'youtube.com', 'google.com', 'bing.com', 'wikipedia.org',
      'indeed.com', 'glassdoor.com', 'monster.com', 'jobteaser.com'
    ];
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return excludedDomains.some(excluded => domain.includes(excluded));
    } catch {
      return true;
    }
  }

  async isOfficialSite(url, companyName) {
    try {
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);
      
      const content = $('title, h1, h2, .about, .company, [class*="about"]').text().toLowerCase();
      const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const hasCompanyName = content.replace(/[^a-z0-9]/g, '').includes(normalizedCompany);
      const hasOfficialIndicators = /contact|about|société|entreprise|company/.test(content);
      
      return hasCompanyName && hasOfficialIndicators;
    } catch {
      return false;
    }
  }

  async findJobsPage(websiteUrl) {
    const jobsUrls = [
      '/carriere', '/carrieres', '/carriere-emplois', '/carriere-emploi',
      '/emplois', '/emploi', '/recrutement', '/jobs', '/careers', '/career',
      '/join-us', '/work-with-us', '/offres-emploi', '/nos-offres'
    ];
    
    for (const jobsPath of jobsUrls) {
      for (const protocol of ['https', 'http']) {
        try {
          const testUrl = `${protocol}://${websiteUrl}${jobsPath}`;
          const response = await this.makeRequest(testUrl);
          
          if (response.status === 200 && await this.hasRealJobs(response.data)) {
            console.log(`✅ Jobs page found: ${testUrl}`);
            return testUrl;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    return null;
  }

  async hasRealJobs(html) {
    const $ = cheerio.load(html);
    const content = $.text().toLowerCase();
    
    const jobKeywords = ['postuler', 'candidature', 'h/f', 'cdi', 'cdd', 'stage', 'alternance'];
    const hasJobKeywords = jobKeywords.some(keyword => content.includes(keyword));
    
    const hasJobElements = $('.job, .position, .offer, .poste, [class*="job"], [class*="career"], form[action*="apply"]').length > 0;
    
    return hasJobKeywords && hasJobElements;
  }

  async scrapeJobOffers(jobsPageUrl) {
    try {
      const response = await this.makeRequest(jobsPageUrl);
      const $ = cheerio.load(response.data);
      
      // Check for Drupal AJAX views
      const scriptContent = $('script').text();
      const ajaxMatch = scriptContent.match(/views\/ajax.*?"view_name":"([^"]+)".*?"view_display_id":"([^"]+)"/);
      
      if (ajaxMatch) {
        const [, viewName, viewDisplayId] = ajaxMatch;
        return await this.handleDrupalAjax(jobsPageUrl, viewName, viewDisplayId);
      }
      
      return this.extractJobsFromContent($, jobsPageUrl);
    } catch (error) {
      console.error(`Error scraping jobs from ${jobsPageUrl}: ${error.message}`);
      return [];
    }
  }

  async handleDrupalAjax(baseUrl, viewName, viewDisplayId) {
    try {
      const ajaxUrl = new URL('/views/ajax', baseUrl).href;
      const formData = new URLSearchParams({
        'view_name': viewName,
        'view_display_id': viewDisplayId,
        'view_args': '',
        'view_path': new URL(baseUrl).pathname,
        'view_base_path': '',
        'view_dom_id': '1',
        'pager_element': '0',
      });

      const response = await axios.post(ajaxUrl, formData, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 30000,
      });

      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.method === 'replaceWith' && item.data) {
            const $ = cheerio.load(item.data);
            return this.extractJobsFromContent($, baseUrl);
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error(`AJAX request failed: ${error.message}`);
      return [];
    }
  }

  extractJobsFromContent($, baseUrl) {
    const jobs = [];
    const seenTitles = new Set();
    
    const selectors = [
      '.job', '.position', '.offer', '.poste', '.employment', '.roles', '.careers-list',
      '.field-name-title', '.views-field-title', '[class*="job"]', '[class*="position"]',
      'a[href*="emploi"]', 'a[href*="job"]', 'a[href*="career"]', 'a[href*="poste"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, element) => {
        const job = this.extractJobFromElement($, element, baseUrl);
        if (job && job.title && this.isValidJobTitle(job.title) && !seenTitles.has(job.title)) {
          jobs.push(job);
          seenTitles.add(job.title);
        }
      });
    });
    
    return jobs;
  }

  extractJobFromElement($, element, baseUrl) {
    const $el = $(element);
    let title = '';
    let link = '';
    
    // Extract title
    title = $el.find('h1, h2, h3, h4, .title, .job-title, .position-title').first().text().trim();
    if (!title) {
      title = $el.text().trim();
    }
    if (!title && $el.is('a')) {
      title = $el.attr('title') || '';
    }
    
    // Extract link
    link = $el.find('a').first().attr('href') || $el.attr('href') || '';
    if (link && !link.startsWith('http')) {
      link = new URL(link, baseUrl).href;
    }
    
    // Extract title from URL if needed
    if ((!title || title.length < 3) && link) {
      const urlParts = link.split('/').filter(part => part && part !== 'emploi' && part !== 'job');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.length > 3) {
        title = lastPart.replace(/[-_]/g, ' ').replace(/\/$/, '');
      }
    }
    
    if (!title || title.length < 3) return null;
    
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      company: '',
      location: '',
      link: link || baseUrl,
      scraped_at: new Date().toISOString()
    };
  }

  isValidJobTitle(title) {
    if (!title || title.length < 3 || title.length > 100) return false;
    
    const lowerTitle = title.toLowerCase();
    
    // Exclude marketing content
    const excludeKeywords = [
      'recevoir', 'newsletter', 'nos engagements', 'rgpd', 'cookies',
      'gestionnaire spécialisé dans l\'immobilier', 'responsable de traitement',
      'mentions légales', 'politique', 'confidentialité', 'contact'
    ];
    
    if (excludeKeywords.some(keyword => lowerTitle.includes(keyword))) {
      return false;
    }
    
    // Must contain job-related words
    const jobWords = [
      'responsable', 'manager', 'directeur', 'chef', 'assistant', 'conseiller',
      'développeur', 'ingénieur', 'technicien', 'commercial', 'vendeur',
      'comptable', 'juriste', 'administrateur', 'coordinateur', 'chargé'
    ];
    
    return jobWords.some(word => lowerTitle.includes(word));
  }

  async scrapeCompany(companyName) {
    console.log(`🚀 Processing ${companyName}`);
    
    const website = await this.findOfficialWebsite(companyName);
    if (!website) {
      return {
        company: companyName,
        status: 'error',
        error: 'Official website not found',
        jobs: [],
        jobCount: 0
      };
    }
    
    const jobsPageUrl = await this.findJobsPage(website);
    if (!jobsPageUrl) {
      return {
        company: companyName,
        status: 'success',
        website: website,
        jobsUrl: null,
        pageType: 'none',
        jobs: [],
        jobCount: 0
      };
    }
    
    const jobs = await this.scrapeJobOffers(jobsPageUrl);
    
    return {
      company: companyName,
      status: 'success',
      website: website,
      jobsUrl: jobsPageUrl,
      pageType: 'ajax',
      jobs: jobs.map(job => ({ ...job, company: companyName })),
      jobCount: jobs.length
    };
  }
}

// Parse CSV companies
function parseCsvCompanies(csvContent) {
  const companies = [];
  const lines = csvContent.trim().split('\n');
  
  if (!lines.length) return companies;
  
  const csvLines = lines.slice(1); // Skip header
  
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

// Main execution
async function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: node scraper_adaptatif.js <csv_file_path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const companies = parseCsvCompanies(csvContent);
  
  console.log(`🧠 ADAPTIVE SCRAPER - INTELLIGENT SYSTEM`);
  console.log(`==========================================`);
  console.log(`📋 ${companies.length} companies to process: ${JSON.stringify(companies)}`);
  
  const scraper = new AdaptiveScraper();
  const results = [];
  
  for (const company of companies) {
    try {
      const result = await scraper.scrapeCompany(company);
      results.push(result);
      
      // Delay between companies
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to process ${company}: ${error.message}`);
      results.push({
        company: company,
        status: 'error',
        error: error.message,
        jobs: [],
        jobCount: 0
      });
    }
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = `scraping-adaptatif-${timestamp}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  
  console.log(`💾 Results saved: ${outputFile}`);
  console.log(`📊 ======== ADAPTIVE SUMMARY ========`);
  console.log(`✅ Successfully processed companies: ${results.filter(r => r.status === 'success').length}/${results.length}`);
  console.log(`📋 Total jobs found: ${results.reduce((sum, r) => sum + r.jobCount, 0)}`);
  
  results.forEach(result => {
    console.log(`🏢 ${result.company}:`);
    console.log(`   📊 Status: ${result.status}`);
    if (result.website) console.log(`   🌐 Site: ${result.website}`);
    if (result.jobsUrl) console.log(`   🔗 Jobs page: ${result.jobsUrl}`);
    if (result.pageType) console.log(`   🔧 Type: ${result.pageType}`);
    console.log(`   📝 Jobs: ${result.jobCount}`);
  });
  
  console.log(`🎉 Adaptive scraping completed!`);
}

if (require.main === module) {
  main().catch(console.error);
} 
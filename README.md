# 🚀 Job Scraper Dashboard

A professional multi-platform job scraping dashboard built with Next.js, designed for efficient job data collection from Indeed, LinkedIn, and custom websites.

## ✨ Features

- **Multi-Platform Scraping**: Indeed, LinkedIn, and adaptive website scraping
- **Real-time Dashboard**: Live progress tracking and results visualization
- **Automated Scheduling**: Set custom intervals for automatic scraping
- **Professional Interface**: Clean, responsive UI built with Tailwind CSS
- **Cloud-Ready**: Optimized for Heroku, Railway, and other cloud platforms
- **CSV Import/Export**: Easy company list management and results download

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Scraping**: Puppeteer, Axios, Cheerio
- **Storage**: In-memory with persistent global storage
- **Deployment**: Docker-ready for cloud platforms

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd job-scraper-dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

#### Railway / Heroku

```bash
# Build the application
npm run build

# Start production server
npm start
```

#### Docker

```bash
# Build Docker image
docker build -t job-scraper-dashboard .

# Run container
docker run -p 3000:3000 job-scraper-dashboard
```

## 📋 Usage

1. **Upload Company CSV**: Import your list of companies to scrape
2. **Select Platforms**: Choose Indeed, LinkedIn, and/or Adaptive Scraper
3. **Configure Automation**: Set scraping intervals (5min - 24h)
4. **Monitor Progress**: Track real-time scraping progress
5. **Download Results**: Export collected job data as JSON

## 🔧 Environment Variables

Create a `.env.local` file for configuration:

```env
# Optional: Custom settings
NEXT_PUBLIC_APP_NAME="Job Scraper Dashboard"
NEXT_PUBLIC_VERSION="1.0.0"
```

## 📝 CSV Format

Your company CSV should follow this format:

```csv
Nom de l'entreprise
COMPANY_NAME_1
COMPANY_NAME_2
COMPANY_NAME_3
```

## 🏗️ Architecture

- **Frontend**: Next.js App Router with React Server Components
- **API Routes**: RESTful endpoints for scraping operations
- **Storage**: Global in-memory storage with Next.js recompilation persistence
- **Scrapers**: Modular scraping engines for each platform

## 📊 Monitoring

The dashboard provides real-time insights:

- **Job Collection Stats**: Total jobs found per platform
- **Company Progress**: Individual company scraping status
- **Error Handling**: Comprehensive error reporting and recovery
- **Performance Metrics**: Scraping speed and success rates

## 🔒 Security

- **Rate Limiting**: Built-in delays to respect website policies
- **User Agent Rotation**: Prevents blocking with varied headers
- **Error Recovery**: Automatic retries with exponential backoff
- **Data Validation**: Input sanitization and output verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an [Issue](https://github.com/your-repo/issues)
- Check the [Documentation](https://github.com/your-repo/wiki)
- Contact: [support@yourcompany.com](mailto:support@yourcompany.com)

---

**Built with ❤️ for efficient job market analysis** 
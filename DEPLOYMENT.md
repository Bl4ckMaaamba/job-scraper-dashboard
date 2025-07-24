# 🚀 Deployment Guide - Job Scraper Dashboard

## 📋 Pre-Deployment Checklist

- ✅ **Package.json** configured with production dependencies
- ✅ **Dockerfile** optimized for cloud deployment
- ✅ **Environment variables** configured (see `env.example`)
- ✅ **Build optimization** enabled in `next.config.mjs`
- ✅ **Security headers** configured

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## ☁️ Cloud Deployment

### 🚄 Railway Deployment

1. **Push to Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Railway**
   - Connect your GitHub repository
   - Railway will automatically detect the Dockerfile
   - Set environment variables if needed
   - Deploy automatically

3. **Configuration**
   - Railway automatically handles port binding
   - Uses `PORT` environment variable
   - Supports automatic scaling

### 🟣 Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   # Install Heroku CLI (if not already installed)
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

4. **Configuration**
   ```bash
   # Set environment variables (optional)
   heroku config:set NEXT_PUBLIC_APP_NAME="Job Scraper Dashboard"
   heroku config:set NODE_ENV=production
   ```

### 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t job-scraper-dashboard .

# Run container
docker run -p 3000:3000 job-scraper-dashboard

# Or with environment variables
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_APP_NAME="Job Scraper Dashboard" \
  job-scraper-dashboard
```

## 🔧 Environment Variables

Copy `env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_APP_NAME="Job Scraper Dashboard"
NEXT_PUBLIC_VERSION="1.0.0"
NODE_ENV="production"
PORT=3000
```

## 📊 Performance Optimizations

- **Next.js Standalone Output**: Enabled for minimal Docker image
- **SWC Minification**: Enabled for faster builds
- **Compression**: Enabled in production
- **Image Optimization**: Configured for external domains
- **Security Headers**: Implemented for production safety

## 🔒 Security Features

- **CORS Protection**: Configured for production domains
- **XSS Protection**: Security headers enabled
- **Content Security Policy**: Basic implementation
- **Frame Protection**: X-Frame-Options header set

## 📈 Monitoring

### Application Logs
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# Docker
docker logs <container-id>
```

### Health Check
- **URL**: `https://your-domain.com/`
- **Expected**: Dashboard loads successfully
- **API Check**: `POST /api/scraping` with valid data

## 🚨 Troubleshooting

### Common Issues

1. **Puppeteer Issues**
   - Solution: Docker includes Chromium dependencies
   - Environment variables configured for headless mode

2. **Port Binding**
   - Railway/Heroku: Automatic port detection
   - Manual: Set `PORT` environment variable

3. **Memory Issues**
   - Increase container memory limits
   - Monitor scraping load

4. **Timeout Issues**
   - Adjust scraping timeouts in code
   - Consider implementing queue system for large datasets

### Performance Monitoring

```bash
# Check memory usage
docker stats

# Monitor application performance
# Use your cloud provider's monitoring tools
```

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        uses: railwayapp/railway-action@v1
        with:
          api_key: ${{ secrets.RAILWAY_API_KEY }}
```

## 📱 Post-Deployment

1. **Test All Features**
   - Upload CSV file
   - Select platforms
   - Run scraping
   - Download results
   - Test auto mode

2. **Performance Testing**
   - Test with various company lists
   - Monitor memory usage
   - Check response times

3. **Security Verification**
   - Verify HTTPS is enabled
   - Check security headers
   - Test CORS configuration

## 🆘 Support

- **Documentation**: See README.md
- **Issues**: Create GitHub issues
- **Monitoring**: Use cloud provider dashboards

---

**🎉 Ready for Production!**

Your Job Scraper Dashboard is now ready for professional deployment on Railway, Heroku, or any Docker-compatible platform. 
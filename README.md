# 🚀 Pro Backlinks Analyzer

A powerful, local SEO backlink analysis tool that provides comprehensive domain metrics, backlink analysis, and historical tracking. Built for local usage with no external dependencies.

> **⚠️ Disclaimer:** This project is not officially supported and was built for personal use. Use at your own discretion.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.6+-blue.svg)
![Cost](https://img.shields.io/badge/cost-$0.0045%20per%20domain-green.svg)

## 💰 Pricing

Using this tool costs **$0.0045 per domain** for backlinks data via the DomDetailer API. Credits never expire, making it an affordable solution for backlink analysis.

## 📸 Screenshots

![Overview Dashboard](https://i.imgur.com/1Wq5cmA.png)

![Authority Metrics](https://i.imgur.com/gJjx7UG.png)

![Anchor Analysis](https://i.imgur.com/8h1Gayu.png)

![Referring Domains](https://i.imgur.com/n1qDX7L.png)

![Target Pages](https://i.imgur.com/3eLN46v.png)

![Historical Data](https://i.imgur.com/5ClZbC7.png)

## ✨ Features

- 📊 **Complete Backlink Analysis** - Analyze domain backlinks with detailed metrics
- 🎯 **Authority Metrics** - Moz Domain Authority, Page Authority, Majestic Citation/Trust Flow
- 🔗 **Anchor Text Analysis** - Detailed breakdown of anchor text distribution
- 🌍 **Referring Domains** - Analyze all referring domains with TLD breakdown
- 📄 **Target Pages** - See which pages get the most backlinks
- 📅 **Historical Tracking** - Save and compare analysis over time
- 📥 **CSV Export** - Export backlinks data for further analysis
- 🎨 **Beautiful UI** - Modern, responsive interface with charts and visualizations

## 📋 Prerequisites

- **Python 3.6 or higher** - [Download Python](https://www.python.org/downloads/)
- **DomDetailer API Key** - [Get Your API Key](https://domdetailer.com/)

## 🚀 Quick Start

### Step 1: Get Your API Key

1. Visit [https://domdetailer.com/](https://domdetailer.com/)
2. Sign up or log in to your account
3. Copy your API key from the dashboard

### Step 2: Setup

1. Clone or download this repository
2. Create a file named `api.txt` in the root directory
3. Paste your API key into `api.txt` (just the key, nothing else)

**Example `api.txt` file:**
```
GJT8X2J61RG5C
```

### Step 3: Run

**Windows:**
```bash
run.bat
```

The script will:
- ✅ Check if Python is installed
- ✅ Verify your API key exists
- ✅ Start the local server
- ✅ Automatically open your browser to http://localhost:8001

**Manual Start (All Platforms):**
```bash
python server.py
```

Then open your browser and navigate to:
```
http://localhost:8001/index.html
```

## 📖 How to Use

1. **Enter a Domain** - Type any domain name (e.g., `example.com`)
2. **Optional: One Per Domain** - Check this to show only one backlink per referring domain
3. **Click Analyze** - Wait 15-20 seconds for results
4. **Explore Tabs:**
   - **Overview** - Key metrics and backlinks table
   - **Authority Metrics** - Domain authority scores and charts
   - **Anchors** - Anchor text analysis and distribution
   - **Domains** - Referring domains breakdown
   - **Pages** - Most linked target pages
   - **History** - Load previous analyses

## 📁 Project Structure

```
domdetailer/
├── index.html          # Main web interface
├── app.js             # Frontend JavaScript logic
├── server.py          # Python backend server
├── api.txt            # Your API key (YOU MUST CREATE THIS)
├── data/              # Historical analysis storage (auto-created)
├── run.bat            # Windows startup script
├── requirements.txt   # Python dependencies (none required)
└── README.md          # This file
```

## 🔧 Configuration

### Port Configuration

By default, the server runs on port **8001**. To change this:

Open `server.py` and modify:
```python
PORT = 8001  # Change to your preferred port
```

### Data Storage

All historical analyses are saved in the `data/` folder:
```
data/
├── domain1.com/
│   ├── 2025-10-28_20-02-51.json
│   └── index.json
└── domain2.com/
    ├── 2025-10-28_20-20-00.json
    └── index.json
```

## 🎯 API Endpoints

The server provides several API endpoints:

- `GET /api/backlinks?domain=example.com` - Get backlinks
- `GET /api/domain-metrics?domain=example.com` - Get domain authority metrics
- `GET /api/list-domains` - List all analyzed domains
- `GET /api/list-history?domain=example.com` - List analysis history for a domain
- `GET /api/history/{domain}/{filename}` - Load specific historical analysis

## 🛡️ Security Notes

- ⚠️ **Never commit `api.txt` to Git** (already in .gitignore)
- 🔒 This tool is designed for **local use only**
- 🌐 Do not expose the server to the public internet
- 🔑 Keep your API key secure

## 🐛 Troubleshooting

### "Python is not installed"
- Install Python from [python.org](https://www.python.org/downloads/)
- Make sure to check "Add Python to PATH" during installation

### "api.txt file not found"
- Create a file named `api.txt` in the root directory
- Paste your DomDetailer API key into it

### "Failed to fetch data"
- Check your internet connection
- Verify your API key is valid
- Check if the domain exists and is accessible

### Port Already in Use
- Another application is using port 8001
- Either close that application or change the port in `server.py`

## 📊 Understanding the Metrics

### Authority Scores
- **Domain Authority (DA)** - Moz's score predicting ranking ability (1-100)
- **Page Authority (PA)** - Moz's score for individual pages (1-100)
- **Citation Flow (CF)** - Majestic's measure of link quantity
- **Trust Flow (TF)** - Majestic's measure of link quality

### Link Types
- **Dofollow** - Links that pass SEO value (good for rankings)
- **Nofollow** - Links that don't pass SEO value (still valuable for traffic)

### Referring Domains
- **TLD** - Top-level domain (.com, .edu, .gov)
- **EDU/GOV Links** - High-quality backlinks from educational/government sites

## 🤝 Contributing

This project was built for personal use and is not officially supported. However, improvements are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📝 License

This project is licensed under the MIT License.

## 🙏 Credits

- **API Provider:** [DomDetailer](https://domdetailer.com)
- **Charts:** [Chart.js](https://www.chartjs.org/)

## 📞 Support

For API-related issues, contact DomDetailer support:
- Website: [https://domdetailer.com](https://domdetailer.com)

---

**Made with ❤️ for SEO professionals**

For best results, use with domains that have established backlink profiles. New domains may have limited data available.

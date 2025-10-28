// Global state
let allBacklinks = [];
let currentDomain = '';
let currentMetrics = {};
let currentDomainMetrics = {};
let charts = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadAvailableDomains();
    console.log('App initialized. Using index.html interface.');
});

function setupEventListeners() {
    document.getElementById('searchForm').addEventListener('submit', handleAnalyze);
    document.getElementById('linkTypeFilter').addEventListener('change', filterBacklinks);
    document.getElementById('searchFilter').addEventListener('input', filterBacklinks);
    document.getElementById('hideMultiplePerDomain').addEventListener('change', filterBacklinks);
    
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}

// Main analysis function
async function handleAnalyze(e) {
    e.preventDefault();
    
    const domainInput = document.getElementById('domainInput').value.trim();
    const onePerDomain = document.getElementById('onePerDomain').checked;
    
    if (!domainInput) return;
    
    currentDomain = cleanDomain(domainInput);
    
    showLoading();
    hideError();
    hideResults();
    
    try {
        // Fetch both APIs in parallel
        const backlinksParams = new URLSearchParams({
            domain: currentDomain,
            onePerDomain: onePerDomain ? '1' : '0'
        });
        
        const metricsParams = new URLSearchParams({
            domain: currentDomain
        });
        
        console.log('Fetching backlinks:', `/api/backlinks?${backlinksParams}`);
        console.log('Fetching metrics:', `/api/domain-metrics?${metricsParams}`);
        
        const [backlinksResponse, metricsResponse] = await Promise.all([
            fetch(`/api/backlinks?${backlinksParams}`),
            fetch(`/api/domain-metrics?${metricsParams}`)
        ]);
        
        console.log('Backlinks response status:', backlinksResponse.status);
        console.log('Metrics response status:', metricsResponse.status);
        
        if (!backlinksResponse.ok) {
            const errorData = await backlinksResponse.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `Backlinks API Error: ${backlinksResponse.status}`);
        }
        
        if (!metricsResponse.ok) {
            console.warn('Metrics API failed, continuing with backlinks only');
            // Don't fail completely if metrics fail
            const backlinksData = await backlinksResponse.json();
            allBacklinks = backlinksData.backlinks || [];
            currentMetrics = backlinksData.metrics || {};
            currentDomainMetrics = {};
            
            // Render all sections (metrics tab will show "no data")
            renderOverview();
            renderMetricsAnalysis();
            renderAnchorsAnalysis();
            renderDomainsAnalysis();
            renderPagesAnalysis();
            
            showResults();
            switchTab('overview');
            showError('Domain metrics unavailable, showing backlinks only');
            return;
        }
        
        const backlinksData = await backlinksResponse.json();
        const metricsData = await metricsResponse.json();
        
        console.log('Received backlinks:', backlinksData.backlinks?.length || 0);
        console.log('Received metrics:', metricsData);
        
        allBacklinks = backlinksData.backlinks || [];
        currentMetrics = backlinksData.metrics || {};
        currentDomainMetrics = metricsData;
        
        // Render all sections
        renderOverview();
        renderMetricsAnalysis();
        renderAnchorsAnalysis();
        renderDomainsAnalysis();
        renderPagesAnalysis();
        
        showResults();
        switchTab('overview');
    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Overview Tab
function renderOverview() {
    renderMetrics();
    displayBacklinksTable(allBacklinks);
}

// Metrics Tab
function renderMetricsAnalysis() {
    if (!currentDomainMetrics || Object.keys(currentDomainMetrics).length === 0) {
        document.getElementById('authorityMetricsGrid').innerHTML = '<p>No authority metrics available</p>';
        return;
    }
    
    renderAuthorityMetrics();
    renderAuthorityCharts();
    renderMetricsTable();
}

function renderMetrics() {
    const metricsGrid = document.getElementById('metricsGrid');
    
    const metricsData = [
        { label: 'Domain', value: currentDomain, subtext: 'Target domain', icon: '🌐' },
        { label: 'Total Backlinks', value: allBacklinks.length.toLocaleString(), subtext: 'Total links found', icon: '🔗' },
        { label: 'Total Pages', value: (currentMetrics.page_count || 0).toLocaleString(), subtext: 'Indexed pages', icon: '📄' },
        { label: 'Links In', value: (currentMetrics.links_in || 0).toLocaleString(), subtext: 'Incoming links', icon: '⬇️' },
        { label: 'Links Out', value: (currentMetrics.links_out || 0).toLocaleString(), subtext: 'Outgoing links', icon: '⬆️' },
        { label: 'Dofollow', value: (currentMetrics.backlinks_follow || 0).toLocaleString(), subtext: `${Math.round(100 - (currentMetrics.nofollow_ratio || 0))}% of backlinks`, icon: '✅' },
        { label: 'Nofollow', value: (currentMetrics.backlinks_nofollow || 0).toLocaleString(), subtext: `${Math.round(currentMetrics.nofollow_ratio || 0)}% of backlinks`, icon: '⛔' },
        { label: 'Referring Domains', value: (currentMetrics.ref_domains || 0).toLocaleString(), subtext: 'Unique domains', icon: '🌍' },
        { label: 'EDU Links', value: (currentMetrics.links_from_edu || 0).toLocaleString(), subtext: 'Education sites', icon: '🎓' },
        { label: 'GOV Links', value: (currentMetrics.links_from_gov || 0).toLocaleString(), subtext: 'Government sites', icon: '🏛️' }
    ];
    
    metricsGrid.innerHTML = metricsData.map(metric => `
        <div class="metric-card">
            <div class="metric-icon">${metric.icon}</div>
            <div class="metric-label">${metric.label}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-subtext">${metric.subtext}</div>
        </div>
    `).join('');
}

function displayBacklinksTable(backlinks) {
    const tbody = document.getElementById('backlinksTableBody');
    
    if (backlinks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div>No backlinks found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = backlinks.map(link => {
        const anchorText = link.anchor || link.title || 'No anchor text';
        const linkType = link.nf === 1 ? 'nofollow' : 'dofollow';
        const badgeClass = link.nf === 1 ? 'badge-warning' : 'badge-success';
        
        return `
            <tr>
                <td><strong>${escapeHtml(anchorText)}</strong></td>
                <td><span class="badge ${badgeClass}">${linkType}</span></td>
                <td class="link-cell">
                    <a href="${escapeHtml(link.source)}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(truncate(link.source, 60))}
                    </a>
                </td>
                <td class="link-cell">
                    <a href="${escapeHtml(link.target)}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(truncate(link.target, 60))}
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

// Anchor Analysis Tab
function renderAnchorsAnalysis() {
    const anchorStats = analyzeAnchors();
    renderAnchorCharts(anchorStats);
    renderAnchorTable(anchorStats);
}

function analyzeAnchors() {
    const anchorMap = new Map();
    
    allBacklinks.forEach(link => {
        const anchor = (link.anchor || link.title || 'No anchor text').trim();
        
        if (!anchorMap.has(anchor)) {
            anchorMap.set(anchor, {
                text: anchor,
                count: 0,
                dofollow: 0,
                nofollow: 0
            });
        }
        
        const stats = anchorMap.get(anchor);
        stats.count++;
        
        if (link.nf === 1) {
            stats.nofollow++;
        } else {
            stats.dofollow++;
        }
    });
    
    return Array.from(anchorMap.values())
        .sort((a, b) => b.count - a.count);
}

function renderAnchorCharts(anchorStats) {
    // Top 10 anchors chart
    const top10 = anchorStats.slice(0, 10);
    
    if (charts.anchorChart) charts.anchorChart.destroy();
    
    const ctx1 = document.getElementById('anchorChart').getContext('2d');
    charts.anchorChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: top10.map(a => truncate(a.text, 30)),
            datasets: [{
                label: 'Count',
                data: top10.map(a => a.count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Anchor Texts',
                    font: { size: 16, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
    
    // Anchor type distribution
    const branded = anchorStats.filter(a => 
        a.text.toLowerCase().includes(currentDomain.split('.')[0])
    ).length;
    const generic = anchorStats.filter(a => 
        ['click here', 'here', 'link', 'website', 'read more', 'more'].includes(a.text.toLowerCase())
    ).length;
    const exact = anchorStats.length - branded - generic;
    
    if (charts.anchorTypeChart) charts.anchorTypeChart.destroy();
    
    const ctx2 = document.getElementById('anchorTypeChart').getContext('2d');
    charts.anchorTypeChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Branded', 'Generic', 'Other'],
            datasets: [{
                data: [branded, generic, exact],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(102, 126, 234, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Anchor Type Distribution',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

let anchorSortColumn = 'count';
let anchorSortDirection = 'desc';

function renderAnchorTable(anchorStats) {
    const tbody = document.getElementById('anchorTableBody');
    const total = anchorStats.reduce((sum, a) => sum + a.count, 0);
    
    // Store for sorting
    window.currentAnchorStats = anchorStats;
    
    tbody.innerHTML = anchorStats.map(anchor => {
        const percentage = ((anchor.count / total) * 100).toFixed(1);
        
        return `
            <tr>
                <td><strong>${escapeHtml(anchor.text)}</strong></td>
                <td><strong>${anchor.count}</strong></td>
                <td>
                    <div>${percentage}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </td>
                <td><span class="badge badge-success">${anchor.dofollow}</span></td>
                <td><span class="badge badge-warning">${anchor.nofollow}</span></td>
            </tr>
        `;
    }).join('');
}

function sortAnchorsTable(column) {
    if (!window.currentAnchorStats) return;
    
    if (anchorSortColumn === column) {
        anchorSortDirection = anchorSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        anchorSortColumn = column;
        anchorSortDirection = 'desc';
    }
    
    const sorted = [...window.currentAnchorStats].sort((a, b) => {
        let aVal = column === 'text' ? a.text : a[column];
        let bVal = column === 'text' ? b.text : b[column];
        
        if (column === 'text') {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }
        
        if (anchorSortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    renderAnchorTable(sorted);
}

// Domains Analysis Tab
function renderDomainsAnalysis() {
    const domainStats = analyzeDomains();
    renderDomainCharts(domainStats);
    renderDomainTable(domainStats);
}

function analyzeDomains() {
    const domainMap = new Map();
    
    allBacklinks.forEach(link => {
        try {
            const url = new URL(link.source);
            const domain = url.hostname.replace('www.', '');
            
            if (!domainMap.has(domain)) {
                domainMap.set(domain, {
                    domain: domain,
                    count: 0,
                    dofollow: 0,
                    nofollow: 0,
                    tld: domain.split('.').pop()
                });
            }
            
            const stats = domainMap.get(domain);
            stats.count++;
            
            if (link.nf === 1) {
                stats.nofollow++;
            } else {
                stats.dofollow++;
            }
        } catch (e) {
            console.error('Error parsing URL:', link.source);
        }
    });
    
    return Array.from(domainMap.values())
        .sort((a, b) => b.count - a.count);
}

function renderDomainCharts(domainStats) {
    // Top 10 referring domains pie chart
    const top10Domains = domainStats.slice(0, 10);
    
    if (charts.tldChart) charts.tldChart.destroy();
    
    const ctx1 = document.getElementById('tldChart').getContext('2d');
    charts.tldChart = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: top10Domains.map(d => truncate(d.domain, 25)),
            datasets: [{
                data: top10Domains.map(d => d.count),
                backgroundColor: generateColors(top10Domains.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Referring Domains (by Link Count)',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // Top 10 referring domains bar chart
    if (charts.domainTypeChart) charts.domainTypeChart.destroy();
    
    const ctx2 = document.getElementById('domainTypeChart').getContext('2d');
    charts.domainTypeChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: top10Domains.map(d => truncate(d.domain, 30)),
            datasets: [{
                label: 'Links Count',
                data: top10Domains.map(d => d.count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Referring Domains',
                    font: { size: 16, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

let domainSortColumn = 'count';
let domainSortDirection = 'desc';

function renderDomainTable(domainStats) {
    const tbody = document.getElementById('domainsTableBody');
    
    // Store for sorting
    window.currentDomainStats = domainStats;
    
    tbody.innerHTML = domainStats.map(domain => {
        const tldClass = ['edu', 'gov'].includes(domain.tld) ? 'badge-info' : 'tld-badge';
        
        return `
            <tr>
                <td><a href="http://${escapeHtml(domain.domain)}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-weight: 600;">${escapeHtml(domain.domain)}</a></td>
                <td><strong>${domain.count}</strong></td>
                <td><span class="${tldClass}">.${domain.tld}</span></td>
                <td><span class="badge badge-success">${domain.dofollow}</span></td>
                <td><span class="badge badge-warning">${domain.nofollow}</span></td>
            </tr>
        `;
    }).join('');
}

function sortDomainsTable(column) {
    if (!window.currentDomainStats) return;
    
    if (domainSortColumn === column) {
        domainSortDirection = domainSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        domainSortColumn = column;
        domainSortDirection = 'desc';
    }
    
    const sorted = [...window.currentDomainStats].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (column === 'domain' || column === 'tld') {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }
        
        if (domainSortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    renderDomainTable(sorted);
    updateSortIndicators('domains');
}

function updateSortIndicators(table) {
    // Remove all sort indicators
    document.querySelectorAll(`#${table}TableBody`).forEach(tbody => {
        const headers = tbody.closest('table').querySelectorAll('th');
        headers.forEach(h => {
            h.style.cursor = 'pointer';
            const text = h.textContent.replace(' ▲', '').replace(' ▼', '');
            h.textContent = text;
        });
    });
}

// Pages Analysis Tab
function renderPagesAnalysis() {
    const pageStats = analyzePages();
    renderPagesChart(pageStats);
    renderPagesTable(pageStats);
}

function analyzePages() {
    const pageMap = new Map();
    
    allBacklinks.forEach(link => {
        const target = link.target;
        
        if (!pageMap.has(target)) {
            pageMap.set(target, {
                url: target,
                count: 0,
                dofollow: 0,
                nofollow: 0
            });
        }
        
        const stats = pageMap.get(target);
        stats.count++;
        
        if (link.nf === 1) {
            stats.nofollow++;
        } else {
            stats.dofollow++;
        }
    });
    
    return Array.from(pageMap.values())
        .sort((a, b) => b.count - a.count);
}

function renderPagesChart(pageStats) {
    const top15 = pageStats.slice(0, 15);
    
    if (charts.pagesChart) charts.pagesChart.destroy();
    
    const ctx = document.getElementById('pagesChart').getContext('2d');
    charts.pagesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top15.map(p => truncate(p.url, 40)),
            datasets: [{
                label: 'Backlinks',
                data: top15.map(p => p.count),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 15 Most Linked Pages',
                    font: { size: 16, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

let pageSortColumn = 'count';
let pageSortDirection = 'desc';

function renderPagesTable(pageStats) {
    const tbody = document.getElementById('pagesTableBody');
    const total = pageStats.reduce((sum, p) => sum + p.count, 0);
    
    // Store for sorting
    window.currentPageStats = pageStats;
    
    tbody.innerHTML = pageStats.map(page => {
        const percentage = ((page.count / total) * 100).toFixed(1);
        
        return `
            <tr>
                <td class="link-cell">
                    <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(truncate(page.url, 70))}
                    </a>
                </td>
                <td><strong>${page.count}</strong></td>
                <td>
                    <div>${percentage}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentage * 2, 100)}%"></div>
                    </div>
                </td>
                <td><span class="badge badge-success">${page.dofollow}</span></td>
                <td><span class="badge badge-warning">${page.nofollow}</span></td>
            </tr>
        `;
    }).join('');
}

function sortPagesTable(column) {
    if (!window.currentPageStats) return;
    
    if (pageSortColumn === column) {
        pageSortDirection = pageSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        pageSortColumn = column;
        pageSortDirection = 'desc';
    }
    
    const sorted = [...window.currentPageStats].sort((a, b) => {
        let aVal = column === 'url' ? a.url : a[column];
        let bVal = column === 'url' ? b.url : b[column];
        
        if (column === 'url') {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }
        
        if (pageSortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    renderPagesTable(sorted);
}

// History functionality
async function loadHistory() {
    if (!currentDomain) {
        showError('Please analyze a domain first');
        return;
    }
    
    try {
        const response = await fetch(`/api/list-history?domain=${currentDomain}`);
        const data = await response.json();
        
        const container = document.getElementById('historyContainer');
        
        if (!data.analyses || data.analyses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div>No historical data found</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.analyses.reverse().map(analysis => {
            const date = new Date(analysis.date);
            const formattedDate = date.toLocaleString();
            
            return `
                <div class="history-item" onclick="loadHistoricalData('${analysis.filename}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>📊 ${analysis.timestamp}</strong>
                            <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">
                                ${formattedDate}
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); loadHistoricalData('${analysis.filename}')">
                            Load
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        showError('Failed to load history: ' + error.message);
    }
}

async function loadHistoricalData(filename) {
    try {
        const response = await fetch(`/api/history/${currentDomain}/${filename}`);
        const data = await response.json();
        
        allBacklinks = data.backlinks || [];
        currentMetrics = data.metrics || {};
        
        renderOverview();
        renderAnchorsAnalysis();
        renderDomainsAnalysis();
        renderPagesAnalysis();
        
        switchTab('overview');
        
        showSuccess('Historical data loaded successfully');
    } catch (error) {
        showError('Failed to load historical data: ' + error.message);
    }
}

// Export functionality
function exportToCSV() {
    const csvRows = [];
    csvRows.push(['Anchor Text', 'Type', 'Source URL', 'Target URL']);
    
    allBacklinks.forEach(link => {
        const anchor = (link.anchor || link.title || 'No anchor text').replace(/"/g, '""');
        const type = link.nf === 1 ? 'nofollow' : 'dofollow';
        csvRows.push([
            `"${anchor}"`,
            type,
            `"${link.source}"`,
            `"${link.target}"`
        ]);
    });
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlinks_${currentDomain}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Filter functionality
function filterBacklinks() {
    const linkType = document.getElementById('linkTypeFilter').value;
    const searchText = document.getElementById('searchFilter').value.toLowerCase();
    const hideMultiple = document.getElementById('hideMultiplePerDomain').checked;
    
    let filtered = allBacklinks.filter(link => {
        const matchesType = linkType === 'all' ||
            (linkType === 'dofollow' && link.nf === 0) ||
            (linkType === 'nofollow' && link.nf === 1);
        
        const searchString = `${link.anchor} ${link.title} ${link.source} ${link.target}`.toLowerCase();
        const matchesSearch = searchString.includes(searchText);
        
        return matchesType && matchesSearch;
    });
    
    // Deduplicate by referring domain if checkbox is checked
    if (hideMultiple) {
        const seenDomains = new Set();
        filtered = filtered.filter(link => {
            try {
                const url = new URL(link.source);
                const domain = url.hostname.replace('www.', '');
                
                if (seenDomains.has(domain)) {
                    return false;
                }
                seenDomains.add(domain);
                return true;
            } catch (e) {
                return true; // Keep links with invalid URLs
            }
        });
    }
    
    displayBacklinksTable(filtered);
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    if (tabName === 'history') {
        loadHistory();
    }
    if (tabName === 'metrics' && currentDomainMetrics) {
        renderMetricsAnalysis();
    }
}

// History Loader Functions
let selectedDomainForLoad = null;

async function loadAvailableDomains() {
    try {
        const response = await fetch('/api/list-domains');
        const data = await response.json();
        
        const domainList = document.getElementById('domainList');
        
        if (!data.domains || data.domains.length === 0) {
            domainList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #999; grid-column: 1/-1;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">📭</div>
                    <div>No previous analyses found</div>
                    <div style="font-size: 0.9rem; margin-top: 5px;">Analyze a domain to see it here</div>
                </div>
            `;
            return;
        }
        
        domainList.innerHTML = data.domains.map(domain => {
            const lastDate = domain.last_analysis ? new Date(domain.last_analysis).toLocaleDateString() : 'N/A';
            return `
                <div class="domain-card" onclick="selectDomainForLoad('${domain.domain}')" id="domain-${domain.domain}">
                    <div class="domain-card-name">🌐 ${domain.domain}</div>
                    <div class="domain-card-info">
                        <span>${domain.analyses_count} snapshot${domain.analyses_count !== 1 ? 's' : ''}</span>
                        <span>${lastDate}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load domains:', error);
    }
}

async function selectDomainForLoad(domain) {
    // Remove previous selection
    document.querySelectorAll('.domain-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select this domain
    document.getElementById(`domain-${domain}`).classList.add('selected');
    selectedDomainForLoad = domain;
    
    // Load snapshots for this domain
    try {
        const response = await fetch(`/api/list-history?domain=${domain}`);
        const data = await response.json();
        
        const snapshotList = document.getElementById('snapshotList');
        
        if (!data.analyses || data.analyses.length === 0) {
            snapshotList.innerHTML = '<div style="text-align: center; color: #999;">No snapshots found</div>';
            snapshotList.classList.add('visible');
            return;
        }
        
        snapshotList.innerHTML = data.analyses.reverse().map(analysis => {
            const date = new Date(analysis.date);
            return `
                <div class="snapshot-item">
                    <div class="snapshot-info">
                        <div class="snapshot-date">📊 ${analysis.timestamp}</div>
                        <div class="snapshot-time">${date.toLocaleString()}</div>
                    </div>
                    <button class="snapshot-load-btn" onclick="loadSnapshot('${domain}', '${analysis.filename}')">
                        Load
                    </button>
                </div>
            `;
        }).join('');
        
        snapshotList.classList.add('visible');
    } catch (error) {
        showError('Failed to load snapshots: ' + error.message);
    }
}

async function loadSnapshot(domain, filename) {
    currentDomain = domain;
    document.getElementById('domainInput').value = domain;
    
    showLoading();
    hideError();
    
    try {
        const response = await fetch(`/api/history/${domain}/${filename}`);
        const data = await response.json();
        
        allBacklinks = data.backlinks || [];
        currentMetrics = data.metrics || {};
        
        renderOverview();
        renderAnchorsAnalysis();
        renderDomainsAnalysis();
        renderPagesAnalysis();
        
        showResults();
        switchTab('overview');
        
        // Close history loader
        toggleHistoryLoader();
        
        showSuccess(`Loaded analysis from ${filename.replace('.json', '')}`);
    } catch (error) {
        showError('Failed to load snapshot: ' + error.message);
    } finally {
        hideLoading();
    }
}

function toggleHistoryLoader() {
    const content = document.getElementById('historyContent');
    const icon = document.getElementById('historyToggleIcon');
    
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.classList.remove('expanded');
        icon.textContent = '▼';
    } else {
        content.classList.add('expanded');
        icon.classList.add('expanded');
        icon.textContent = '▲';
        loadAvailableDomains(); // Refresh domains when opened
    }
}

// UI Helper functions
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = '⚠️ ' + message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.style.background = 'var(--success)';
    errorEl.textContent = '✅ ' + message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
        errorEl.style.background = 'var(--danger)';
    }, 3000);
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showResults() {
    document.getElementById('resultsSection').style.display = 'block';
}

function hideResults() {
    document.getElementById('resultsSection').style.display = 'none';
}

// Utility functions
function cleanDomain(domain) {
    return domain
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .replace(/\/+$/, '')
        .split('/')[0];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// Authority Metrics Functions
function renderAuthorityMetrics() {
    const grid = document.getElementById('authorityMetricsGrid');
    const metrics = currentDomainMetrics;
    
    const authorityData = [
        {
            label: 'Moz Domain Authority',
            value: metrics.mozDA || 0,
            subtext: 'Domain authority (1-100)',
            icon: '📊',
            color: getAuthorityColor(metrics.mozDA || 0),
            status: getAuthorityStatus(metrics.mozDA || 0)
        },
        {
            label: 'Moz Page Authority',
            value: metrics.mozPA || 0,
            subtext: 'Page authority (1-100)',
            icon: '📈',
            color: getAuthorityColor(metrics.mozPA || 0),
            status: getAuthorityStatus(metrics.mozPA || 0)
        },
        {
            label: 'Majestic Citation Flow',
            value: metrics.majesticCF || 0,
            subtext: 'Link popularity metric',
            icon: '🔗',
            color: getAuthorityColor(metrics.majesticCF || 0),
            status: getAuthorityStatus(metrics.majesticCF || 0)
        },
        {
            label: 'Majestic Trust Flow',
            value: metrics.majesticTF || 0,
            subtext: 'Trustworthiness metric',
            icon: '🛡️',
            color: getAuthorityColor(metrics.majesticTF || 0),
            status: getAuthorityStatus(metrics.majesticTF || 0)
        },
        {
            label: 'Moz Links',
            value: (metrics.mozLinks || 0).toLocaleString(),
            subtext: 'Total backlinks from Moz',
            icon: '🌐',
            color: '#667eea',
            status: 'info'
        },
        {
            label: 'Majestic Ref Domains',
            value: (metrics.majesticRefDomains || 0).toLocaleString(),
            subtext: 'Unique referring domains',
            icon: '🏢',
            color: '#667eea',
            status: 'info'
        }
    ];
    
    grid.innerHTML = authorityData.map(metric => `
        <div class="metric-card" style="border-left: 4px solid ${metric.color}">
            <div class="metric-icon">${metric.icon}</div>
            <div class="metric-label">${metric.label}</div>
            <div class="metric-value">${metric.value}</div>
            <div class="metric-subtext">${metric.subtext} <span class="status-badge status-${metric.status}">${metric.status}</span></div>
        </div>
    `).join('');
}

function renderAuthorityCharts() {
    // Authority Score Comparison
    const ctx1 = document.getElementById('authorityComparisonChart').getContext('2d');
    if (charts.authorityComparison) charts.authorityComparison.destroy();
    
    charts.authorityComparison = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Domain Authority', 'Page Authority', 'Citation Flow', 'Trust Flow'],
            datasets: [{
                label: 'Authority Scores',
                data: [
                    currentDomainMetrics.mozDA || 0,
                    currentDomainMetrics.mozPA || 0,
                    currentDomainMetrics.majesticCF || 0,
                    currentDomainMetrics.majesticTF || 0
                ],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Authority Score Comparison',
                    font: { size: 16, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Link Sources Comparison
    const ctx2 = document.getElementById('linkSourcesChart').getContext('2d');
    if (charts.linkSources) charts.linkSources.destroy();
    
    charts.linkSources = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Moz Links', 'Majestic Links', 'Majestic Ref Domains'],
            datasets: [{
                label: 'Link Count',
                data: [
                    currentDomainMetrics.mozLinks || 0,
                    currentDomainMetrics.majesticLinks || 0,
                    currentDomainMetrics.majesticRefDomains || 0
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Link Sources Comparison',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Trust vs Flow Analysis
    const ctx3 = document.getElementById('trustFlowChart').getContext('2d');
    if (charts.trustFlow) charts.trustFlow.destroy();
    
    charts.trustFlow = new Chart(ctx3, {
        type: 'scatter',
        data: {
            datasets: [{
                label: currentDomain || 'Domain',
                data: [{
                    x: currentDomainMetrics.majesticCF || 0,
                    y: currentDomainMetrics.majesticTF || 0
                }],
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                pointRadius: 10,
                pointHoverRadius: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Trust vs Citation Flow Analysis',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Citation Flow (CF)'
                    },
                    beginAtZero: true,
                    max: 100
                },
                y: {
                    title: {
                        display: true,
                        text: 'Trust Flow (TF)'
                    },
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Quality Distribution
    const ctx4 = document.getElementById('qualityDistributionChart').getContext('2d');
    if (charts.qualityDistribution) charts.qualityDistribution.destroy();
    
    const eduGov = (currentDomainMetrics.majesticRefEDU || 0) + (currentDomainMetrics.majesticRefGov || 0);
    const mozTrust = currentDomainMetrics.mozTrust || 0;
    const mozSpam = currentDomainMetrics.mozSpam || 0;
    
    charts.qualityDistribution = new Chart(ctx4, {
        type: 'doughnut',
        data: {
            labels: ['EDU/GOV Refs', 'Moz Trust', 'Spam Score'],
            datasets: [{
                data: [eduGov, mozTrust, mozSpam],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(244, 67, 54, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Quality Indicators',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderMetricsTable() {
    const tbody = document.getElementById('metricsTableBody');
    const metrics = currentDomainMetrics;
    
    const tableData = [
        { source: 'Moz', metric: 'Domain Authority (DA)', value: metrics.mozDA || 0, status: getAuthorityStatus(metrics.mozDA || 0) },
        { source: 'Moz', metric: 'Page Authority (PA)', value: metrics.mozPA || 0, status: getAuthorityStatus(metrics.mozPA || 0) },
        { source: 'Moz', metric: 'MozRank', value: metrics.mozRank || 0, status: getAuthorityStatus(metrics.mozRank || 0) },
        { source: 'Moz', metric: 'MozTrust', value: metrics.mozTrust || 0, status: getAuthorityStatus(metrics.mozTrust || 0) },
        { source: 'Moz', metric: 'Spam Score', value: metrics.mozSpam || 0, status: getSpamStatus(metrics.mozSpam || 0) },
        { source: 'Moz', metric: 'Total Links', value: (metrics.mozLinks || 0).toLocaleString(), status: 'info' },
        { source: 'Majestic', metric: 'Citation Flow (CF)', value: metrics.majesticCF || 0, status: getAuthorityStatus(metrics.majesticCF || 0) },
        { source: 'Majestic', metric: 'Trust Flow (TF)', value: metrics.majesticTF || 0, status: getAuthorityStatus(metrics.majesticTF || 0) },
        { source: 'Majestic', metric: 'Total Links', value: (metrics.majesticLinks || 0).toLocaleString(), status: 'info' },
        { source: 'Majestic', metric: 'Referring Domains', value: (metrics.majesticRefDomains || 0).toLocaleString(), status: 'info' },
        { source: 'Majestic', metric: 'Referring IPs', value: (metrics.majesticIPs || 0).toLocaleString(), status: 'info' },
        { source: 'Majestic', metric: 'Referring Subnets', value: (metrics.majesticRefSubnets || 0).toLocaleString(), status: 'info' },
        { source: 'Majestic', metric: 'EDU Backlinks', value: metrics.majesticRefEDU || 0, status: metrics.majesticRefEDU > 0 ? 'excellent' : 'poor' },
        { source: 'Majestic', metric: 'GOV Backlinks', value: metrics.majesticRefGov || 0, status: metrics.majesticRefGov > 0 ? 'excellent' : 'poor' },
        { source: 'Majestic', metric: 'Top Topic', value: metrics.majesticTTF0Name || 'N/A', status: 'info' },
        { source: 'Majestic', metric: 'Top Topic Score', value: metrics.majesticTTF0Value || 0, status: 'info' }
    ];
    
    tbody.innerHTML = tableData.map(row => `
        <tr>
            <td>${row.source}</td>
            <td>${row.metric}</td>
            <td>${row.value}</td>
            <td><span class="status-badge status-${row.status}">${row.status.toUpperCase()}</span></td>
        </tr>
    `).join('');
}

function getAuthorityColor(score) {
    if (score >= 70) return '#4caf50';
    if (score >= 40) return '#ff9800';
    return '#f44336';
}

function getAuthorityStatus(score) {
    if (score >= 70) return 'excellent';
    if (score >= 40) return 'good';
    return 'poor';
}

function getSpamStatus(score) {
    if (score <= 5) return 'excellent';
    if (score <= 30) return 'good';
    return 'poor';
}

function generateColors(count) {
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(76, 175, 80, 0.8)',
        'rgba(255, 152, 0, 0.8)',
        'rgba(244, 67, 54, 0.8)',
        'rgba(33, 150, 243, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(0, 188, 212, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(121, 85, 72, 0.8)'
    ];
    return colors.slice(0, count);
}

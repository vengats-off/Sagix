// DOM elements
const searchInput = document.getElementById('companySearch');
const searchSuggestions = document.getElementById('searchSuggestions');
const resultsSection = document.getElementById('resultsSection');
const loadingState = document.getElementById('loadingState');
const noDataState = document.getElementById('noDataState');
const resultsContent = document.getElementById('resultsContent');
const newsSourcesList = document.getElementById('newsSourcesList');
const sentimentBadge = document.getElementById('sentimentBadge');
const companyNameElem = document.getElementById('companyName');
const overallReasoning = document.getElementById('overallReasoning');
const sourcesAnalyzed = document.getElementById('sourcesAnalyzed');
const articlesProcessed = document.getElementById('articlesProcessed');
const overallConfidence = document.getElementById('overallConfidence');
const refreshBtn = document.getElementById('refreshBtn');

// Modal elements
const newsModal = document.getElementById('newsDetailModal');
const modalHeadline = document.getElementById('modalHeadline');
const modalSource = document.getElementById('modalSource');
const modalTimestamp = document.getElementById('modalTimestamp');
const modalCredibility = document.getElementById('modalCredibility');
const modalSentimentTag = document.getElementById('modalSentimentTag');
const modalConfidence = document.getElementById('modalConfidence');
const modalReasoning = document.getElementById('modalReasoning');
const modalKeyPhrases = document.getElementById('modalKeyPhrases');
const modalFullText = document.getElementById('modalFullText');

// Variables to track current company and date range
let currentCompany = '';
let selectedDateRange = '1d'; // Default date range

// Show suggestions as user types
searchInput.addEventListener('input', () => {
    const inputVal = searchInput.value.toLowerCase();
    if (inputVal.length < 2) {
        searchSuggestions.classList.add('hidden');
        return;
    }
    const filtered = companies.filter(c => {
        const name = c.name ? c.name.toLowerCase() : '';
        const symbol = c.symbol ? c.symbol.toLowerCase() : '';
        return name.includes(inputVal) || symbol.includes(inputVal);
    });
    if (filtered.length === 0) {
        searchSuggestions.classList.add('hidden');
        return;
    }
    searchSuggestions.innerHTML = filtered.map(c =>
        `<div class='suggestion-item' data-symbol='${c.symbol}'>${c.name} (${c.symbol})</div>`
    ).join('');
    searchSuggestions.classList.remove('hidden');
});

// Handle suggestion click
searchSuggestions.addEventListener('click', e => {
    if (e.target.classList.contains('suggestion-item')) {
        const symbol = e.target.getAttribute('data-symbol');
        searchInput.value = e.target.innerText;
        searchSuggestions.classList.add('hidden');
        currentCompany = symbol;
        startSentimentAnalysis(symbol, selectedDateRange);
    }
});

// Handle enter key
searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        const symbolMatch = val.match(/\(([^)]+)\)$/);
        const symbol = symbolMatch ? symbolMatch[1] : val;
        currentCompany = symbol;
        startSentimentAnalysis(symbol, selectedDateRange);
        searchSuggestions.classList.add('hidden');
    }
});

// Date Range Buttons
document.querySelectorAll('.date-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDateRange = btn.getAttribute('data-range');
        if (currentCompany) {
            startSentimentAnalysis(currentCompany, selectedDateRange);
        }
    });
});

// Sentiment Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        document.querySelectorAll('.news-item').forEach(item => {
            if (filter === 'all' || item.classList.contains(filter)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
        
        // Add active class to clicked tab
        btn.classList.add('active');
        
        // Show corresponding pane
        const pane = document.getElementById(tabId + 'Tab');
        if (pane) {
            pane.classList.remove('hidden');
        }
    });
});

// Functions
function resetUI() {
    loadingState.classList.remove('hidden');
    noDataState.classList.add('hidden');
    resultsContent.classList.add('hidden');
}

function showNoData() {
    loadingState.classList.add('hidden');
    noDataState.classList.remove('hidden');
    resultsContent.classList.add('hidden');
}
function goBackHome(){
    window.location.href = 'index.html';
}
function showResults() {
    loadingState.classList.add('hidden');
    noDataState.classList.add('hidden');
    resultsContent.classList.remove('hidden');
}

function formatPercentage(value) {
    if (typeof value === 'number') {
        return `${(value * 100).toFixed(0)}%`;
    }
    if (typeof value === 'string') {
        return value;
    }
    return 'N/A';
}

async function startSentimentAnalysis(company, dateRange = '1d') {
    if (!company) {
        alert('Please enter a company symbol or name');
        return;
    }
    
    resetUI();
    resultsSection.classList.remove('hidden');
    currentCompany = company;

    // Simulate loading progress
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);

    try {
        // Change this line to use your actual Render backend URL
        const API_BASE_URL = 'https://your-backend-app-name.onrender.com';  // Replace with your actual URL
        const response = await fetch(`https://sagix.onrender.com/api/news?company=${encodeURIComponent(company)}&date_range=${dateRange}`);
        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressText.textContent = '100%';
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            showNoData();
            return;
        }

        // Calculate overall sentiment counts
        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        data.articles.forEach(article => {
            const s = article.sentiment || 'neutral';
            sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
        });

        const totalArticles = data.articles.length;
        const maxSentiment = Object.entries(sentimentCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        const maxSentimentPercentage = ((sentimentCounts[maxSentiment] / totalArticles) * 100).toFixed(0);

        // Update header and summary
        companyNameElem.innerText = company;
        document.getElementById('companySymbol').innerText = company.toUpperCase();
        document.getElementById('companySector').innerText = 'Technology'; // You can enhance this

        sentimentBadge.className = `sentiment-badge ${maxSentiment}`;
        sentimentBadge.querySelector('.sentiment-label').innerText = maxSentiment.charAt(0).toUpperCase() + maxSentiment.slice(1);
        sentimentBadge.querySelector('.sentiment-confidence').innerText = `${maxSentimentPercentage}%`;

        overallReasoning.innerText = `Based on analyzing ${totalArticles} recent articles within the selected date range, the overall sentiment is ${maxSentiment} with ${maxSentimentPercentage}% confidence. This analysis uses FinBERT, a financial sentiment model trained specifically for market news.`;
        sourcesAnalyzed.innerText = '1'; // NewsAPI source
        articlesProcessed.innerText = totalArticles;
        overallConfidence.innerText = `${maxSentimentPercentage}%`;

        // Populate analysis factors
        populateAnalysisFactors(data.articles, sentimentCounts);

        // Render articles
        // Render articles
        newsSourcesList.innerHTML = '';
        data.articles.forEach(article => {
            const sentiment = article.sentiment || 'neutral';
            const confidence = formatPercentage(article.sentiment_confidence);

            const item = document.createElement('div');
            item.className = `news-item ${sentiment}`;
            item.innerHTML = `
                <div class="news-source-header">
                    <h4 class="news-headline">${article.title}</h4>
                    <div class="news-sentiment-tag ${sentiment}">${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} (${confidence})</div>
                </div>
                <div class="news-source-meta">
                    <span class="news-source-name">${article.source.name}</span>
                    <span class="news-timestamp">${new Date(article.publishedAt).toLocaleDateString()}</span>
                    <span class="news-confidence">Confidence: ${confidence}</span>
                </div>
            `;
            
            // NEW: Opens original news article in new tab
            item.addEventListener('click', () => {
                if (article.url) {
                    window.open(article.url, '_blank');
                } else {
                    console.log('No URL available for this article');
                }
            });

            // Add visual feedback for clickable items
            item.style.cursor = 'pointer';
            item.title = 'Click to read full article';

            newsSourcesList.appendChild(item);
        });


        showResults();

    } catch (error) {
        console.error('Error fetching news:', error);
        clearInterval(progressInterval);
        showNoData();
    }
}

function populateAnalysisFactors(articles, sentimentCounts) {
    const positiveFactors = document.getElementById('positiveFactors');
    const negativeFactors = document.getElementById('negativeFactors');
    const neutralFactors = document.getElementById('neutralFactors');

    // Clear existing factors
    positiveFactors.innerHTML = '';
    negativeFactors.innerHTML = '';
    neutralFactors.innerHTML = '';

    // Sample factors based on sentiment distribution
    if (sentimentCounts.positive > 0) {
        positiveFactors.innerHTML = `
            <div class="factor-item positive">
                <p class="factor-text">Strong positive coverage in ${sentimentCounts.positive} articles</p>
                <div class="factor-sources">Sources analyzed with high confidence scores</div>
            </div>
        `;
    }

    if (sentimentCounts.negative > 0) {
        negativeFactors.innerHTML = `
            <div class="factor-item negative">
                <p class="factor-text">Negative sentiment detected in ${sentimentCounts.negative} articles</p>
                <div class="factor-sources">Requires attention and monitoring</div>
            </div>
        `;
    }

    if (sentimentCounts.neutral > 0) {
        neutralFactors.innerHTML = `
            <div class="factor-item neutral">
                <p class="factor-text">Neutral reporting in ${sentimentCounts.neutral} articles</p>
                <div class="factor-sources">Balanced coverage without strong bias</div>
            </div>
        `;
    }
}

// Modal functions
function openNewsModal(article) {
    modalHeadline.innerText = article.title;
    modalSource.innerText = article.source.name;
    modalTimestamp.innerText = new Date(article.publishedAt).toLocaleString();
    modalCredibility.innerText = 'Credibility: High';
    
    const sentiment = article.sentiment ? article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1) : 'Unknown';
    modalSentimentTag.innerText = sentiment;
    modalSentimentTag.className = `sentiment-tag ${article.sentiment || 'neutral'}`;
    
    modalConfidence.innerText = article.sentiment_confidence ? formatPercentage(article.sentiment_confidence) : '';
    modalReasoning.innerText = 
    modalKeyPhrases.innerHTML = '';
    modalFullText.innerText = article.description || 'No summary available.';
    newsModal.classList.remove('hidden');
}

function closeNewsModal() {
    newsModal.classList.add('hidden');
}

// Modal close button and backdrop
document.querySelector('.modal-close').addEventListener('click', closeNewsModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeNewsModal);

// Refresh button
refreshBtn.addEventListener('click', () => {
    if (currentCompany) {
        startSentimentAnalysis(currentCompany, selectedDateRange);
    }
});

// Clear results
function clearResults() {
    resultsSection.classList.add('hidden');
    companyNameElem.innerText = '';
    document.getElementById('companySymbol').innerText = '';
    document.getElementById('companySector').innerText = '';
    sentimentBadge.className = 'sentiment-badge';
    sentimentBadge.querySelector('.sentiment-label').innerText = '';
    sentimentBadge.querySelector('.sentiment-confidence').innerText = '';
    overallReasoning.innerText = '';
    sourcesAnalyzed.innerText = '0';
    articlesProcessed.innerText = '0';
    overallConfidence.innerText = '0%';
    newsSourcesList.innerHTML = '';
    searchInput.value = '';
    searchInput.focus();
}

// Hide suggestions on outside click
window.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) {
        searchSuggestions.classList.add('hidden');
    }
});

// Dynamic API Base URL Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:5000'  // Local development
    : window.location.origin;  // Production (Render)

console.log('API Base URL:', API_BASE_URL); // For debugging

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

// Company suggestions data (you may already have this)
const companies = [
    { name: "Tata Consultancy Services", symbol: "TCS" },
    { name: "Reliance Industries", symbol: "RELIANCE" },
    { name: "HDFC Bank", symbol: "HDFCBANK" },
    { name: "Infosys", symbol: "INFY" },
    { name: "Hindustan Unilever", symbol: "HINDUNILVR" },
    { name: "ICICI Bank", symbol: "ICICIBANK" },
    { name: "State Bank of India", symbol: "SBIN" },
    { name: "Bharti Airtel", symbol: "BHARTIARTL" },
    { name: "ITC", symbol: "ITC" },
    { name: "Kotak Mahindra Bank", symbol: "KOTAKBANK" }
];

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
        `<li class="suggestion-item" data-symbol="${c.symbol}">${c.name} (${c.symbol})</li>`
    ).join('');
    searchSuggestions.classList.remove('hidden');
});

// Handle suggestion clicks
searchSuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-item')) {
        const symbol = e.target.getAttribute('data-symbol');
        const name = e.target.textContent;
        searchInput.value = name;
        currentCompany = symbol;
        searchSuggestions.classList.add('hidden');
        
        // Automatically fetch data when a company is selected
        if (symbol) {
            fetchSentimentData(symbol, selectedDateRange);
        }
    }
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
});

// Date range selection handlers
document.querySelectorAll('.date-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        selectedDateRange = btn.getAttribute('data-range');
        
        // Refresh data if a company is selected
        if (currentCompany) {
            fetchSentimentData(currentCompany, selectedDateRange);
        }
    });
});

// Refresh button handler
refreshBtn.addEventListener('click', () => {
    if (currentCompany) {
        fetchSentimentData(currentCompany, selectedDateRange);
    }
});

// Main function to fetch sentiment data
async function fetchSentimentData(company, dateRange) {
    try {
        showLoadingState();
        
        // Updated to use dynamic API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/news?company=${company}&date_range=${dateRange}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.articles && data.data.articles.length > 0) {
            displayResults(data.data);
        } else {
            showNoDataState();
        }
        
    } catch (error) {
        console.error('Error fetching sentiment data:', error);
        showErrorState(error.message);
    }
}

// Alternative API call for specific sentiment analysis
async function fetchSpecificSentiment(symbol) {
    try {
        // Updated to use dynamic API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/sentiment/${symbol}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error fetching specific sentiment:', error);
        throw error;
    }
}

// Function to display results
function displayResults(data) {
    hideAllStates();
    resultsSection.classList.remove('hidden');
    
    // Update company name
    companyNameElem.textContent = currentCompany;
    
    // Update overall metrics
    if (data.overall_sentiment) {
        updateSentimentBadge(data.overall_sentiment.sentiment, data.overall_sentiment.confidence);
        overallReasoning.textContent = data.overall_sentiment.reasoning || 'No specific reasoning provided';
    }
    
    // Update statistics
    sourcesAnalyzed.textContent = data.sources_analyzed || 0;
    articlesProcessed.textContent = data.articles ? data.articles.length : 0;
    overallConfidence.textContent = data.overall_sentiment ? 
        `${Math.round(data.overall_sentiment.confidence * 100)}%` : 'N/A';
    
    // Display news articles
    if (data.articles && data.articles.length > 0) {
        displayNewsArticles(data.articles);
    }
}

// Function to update sentiment badge
function updateSentimentBadge(sentiment, confidence) {
    sentimentBadge.className = 'sentiment-badge';
    
    if (sentiment === 'positive') {
        sentimentBadge.classList.add('positive');
    } else if (sentiment === 'negative') {
        sentimentBadge.classList.add('negative');
    } else {
        sentimentBadge.classList.add('neutral');
    }
    
    sentimentBadge.textContent = sentiment.toUpperCase();
}

// Function to display news articles
function displayNewsArticles(articles) {
    newsSourcesList.innerHTML = articles.map(article => `
        <div class="news-source-item" onclick="openNewsModal('${article.id || Math.random()}')">
            <div class="source-header">
                <div class="source-info">
                    <span class="source-name">${article.source || 'Unknown Source'}</span>
                    <span class="article-time">${formatTimestamp(article.published_at || article.timestamp)}</span>
                </div>
                <div class="sentiment-indicator ${article.sentiment || 'neutral'}">
                    ${(article.sentiment || 'neutral').toUpperCase()}
                </div>
            </div>
            <h4 class="article-headline">${article.title || article.headline || 'No Title'}</h4>
            <div class="article-metrics">
                <span class="confidence-score">Confidence: ${article.confidence ? Math.round(article.confidence * 100) : 'N/A'}%</span>
                <span class="credibility-score">Credibility: ${article.credibility_score || 'N/A'}</span>
            </div>
        </div>
    `).join('');
    
    // Store articles for modal access
    window.currentArticles = articles;
}

// Function to open news detail modal
function openNewsModal(articleId) {
    if (!window.currentArticles) return;
    
    const article = window.currentArticles.find(a => 
        (a.id && a.id.toString() === articleId) || 
        Math.random().toString() === articleId
    ) || window.currentArticles[0];
    
    if (!article) return;
    
    // Populate modal content
    modalHeadline.textContent = article.title || article.headline || 'No Title';
    modalSource.textContent = article.source || 'Unknown Source';
    modalTimestamp.textContent = formatTimestamp(article.published_at || article.timestamp);
    modalCredibility.textContent = article.credibility_score || 'N/A';
    
    // Update sentiment tag
    modalSentimentTag.className = 'sentiment-tag ' + (article.sentiment || 'neutral');
    modalSentimentTag.textContent = (article.sentiment || 'neutral').toUpperCase();
    
    modalConfidence.textContent = article.confidence ? 
        `${Math.round(article.confidence * 100)}%` : 'N/A';
    modalReasoning.textContent = article.reasoning || 'No reasoning provided';
    
    // Display key phrases
    if (article.key_phrases && article.key_phrases.length > 0) {
        modalKeyPhrases.innerHTML = article.key_phrases.map(phrase => 
            `<span class="key-phrase">${phrase}</span>`
        ).join('');
    } else {
        modalKeyPhrases.innerHTML = '<span class="no-data">No key phrases available</span>';
    }
    
    modalFullText.textContent = article.content || article.full_text || 'Full article content not available';
    
    // Show modal
    newsModal.classList.add('active');
}

// Function to close modal
function closeNewsModal() {
    newsModal.classList.remove('active');
}

// Function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch (error) {
        return 'Invalid date';
    }
}

// State management functions
function showLoadingState() {
    hideAllStates();
    loadingState.classList.remove('hidden');
}

function showNoDataState() {
    hideAllStates();
    noDataState.classList.remove('hidden');
}

function showErrorState(message) {
    hideAllStates();
    noDataState.classList.remove('hidden');
    // You can customize this to show error message
    console.error('Error:', message);
}

function hideAllStates() {
    loadingState.classList.add('hidden');
    noDataState.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

// Search form submission
document.getElementById('sentimentForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const searchValue = searchInput.value.trim();
    if (!searchValue) return;
    
    // Try to find matching company
    const matchedCompany = companies.find(c => 
        c.name.toLowerCase().includes(searchValue.toLowerCase()) || 
        c.symbol.toLowerCase() === searchValue.toLowerCase()
    );
    
    const companySymbol = matchedCompany ? matchedCompany.symbol : searchValue.toUpperCase();
    currentCompany = companySymbol;
    
    fetchSentimentData(companySymbol, selectedDateRange);
});

// Close modal when clicking outside or on close button
document.addEventListener('click', (e) => {
    if (e.target === newsModal || e.target.classList.contains('close-modal')) {
        closeNewsModal();
    }
});

// Keyboard navigation for modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newsModal.classList.contains('active')) {
        closeNewsModal();
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('SagiX Sentiment Analysis initialized');
    console.log('API Base URL:', API_BASE_URL);
    
    // Set default date range as active
    document.querySelector('.date-range-btn[data-range="1d"]')?.classList.add('active');
});

// Health check function
async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        console.log('Health check:', data);
        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        return null;
    }
}

// Test function
async function testAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/test`);
        const data = await response.json();
        console.log('Test API:', data);
        return data;
    } catch (error) {
        console.error('Test API failed:', error);
        return null;
    }
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchSentimentData,
        healthCheck,
        testAPI
    };
}

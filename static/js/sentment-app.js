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

// Company suggestions data
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('SagiX Sentiment Analysis initialized');
    console.log('API Base URL:', API_BASE_URL);
    
    // Set default date range as active
    const defaultDateBtn = document.querySelector('.date-range-btn[data-range="1d"]');
    if (defaultDateBtn) {
        defaultDateBtn.classList.add('active');
    }
    
    // Add event listeners only if elements exist
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    
    if (searchSuggestions) {
        searchSuggestions.addEventListener('click', handleSuggestionClick);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Add date range button listeners
    document.querySelectorAll('.date-range-btn').forEach(btn => {
        btn.addEventListener('click', handleDateRangeClick);
    });
    
    // Add form submission listener
    const sentimentForm = document.getElementById('sentimentForm');
    if (sentimentForm) {
        sentimentForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Add global click listener for hiding suggestions
    document.addEventListener('click', handleGlobalClick);
    
    // Add modal close listeners
    document.addEventListener('click', handleModalClose);
    document.addEventListener('keydown', handleKeyboardNavigation);
});

// Show suggestions as user types
function handleSearchInput() {
    const inputVal = searchInput.value.toLowerCase();
    if (inputVal.length < 2) {
        if (searchSuggestions) {
            searchSuggestions.classList.add('hidden');
        }
        return;
    }
    
    const filtered = companies.filter(c => {
        const name = c.name ? c.name.toLowerCase() : '';
        const symbol = c.symbol ? c.symbol.toLowerCase() : '';
        return name.includes(inputVal) || symbol.includes(inputVal);
    });
    
    if (filtered.length === 0 || !searchSuggestions) {
        if (searchSuggestions) {
            searchSuggestions.classList.add('hidden');
        }
        return;
    }
    
    searchSuggestions.innerHTML = filtered.map(c => 
        `<li class="suggestion-item" data-symbol="${c.symbol}">${c.name} (${c.symbol})</li>`
    ).join('');
    searchSuggestions.classList.remove('hidden');
}

// Handle suggestion clicks
function handleSuggestionClick(e) {
    if (e.target.classList.contains('suggestion-item')) {
        const symbol = e.target.getAttribute('data-symbol');
        const name = e.target.textContent;
        if (searchInput) {
            searchInput.value = name;
        }
        currentCompany = symbol;
        if (searchSuggestions) {
            searchSuggestions.classList.add('hidden');
        }
        
        // Automatically fetch data when a company is selected
        if (symbol) {
            fetchSentimentData(symbol, selectedDateRange);
        }
    }
}

// Handle global clicks to hide suggestions
function handleGlobalClick(e) {
    if (searchInput && searchSuggestions && 
        !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
}

// Date range selection handlers
function handleDateRangeClick(e) {
    const btn = e.target;
    // Remove active class from all buttons
    document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');
    
    selectedDateRange = btn.getAttribute('data-range');
    
    // Refresh data if a company is selected
    if (currentCompany) {
        fetchSentimentData(currentCompany, selectedDateRange);
    }
}

// Refresh button handler
function handleRefresh() {
    if (currentCompany) {
        fetchSentimentData(currentCompany, selectedDateRange);
    }
}

// Form submission handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!searchInput) return;
    
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
}

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
    if (resultsSection) {
        resultsSection.classList.remove('hidden');
    }
    
    // Update company name
    if (companyNameElem) {
        companyNameElem.textContent = currentCompany;
    }
    
    // Update overall metrics
    if (data.overall_sentiment) {
        updateSentimentBadge(data.overall_sentiment.sentiment, data.overall_sentiment.confidence);
        if (overallReasoning) {
            overallReasoning.textContent = data.overall_sentiment.reasoning || 'No specific reasoning provided';
        }
    }
    
    // Update statistics
    if (sourcesAnalyzed) {
        sourcesAnalyzed.textContent = data.sources_analyzed || 0;
    }
    if (articlesProcessed) {
        articlesProcessed.textContent = data.articles ? data.articles.length : 0;
    }
    if (overallConfidence) {
        overallConfidence.textContent = data.overall_sentiment ? 
            `${Math.round(data.overall_sentiment.confidence * 100)}%` : 'N/A';
    }
    
    // Display news articles
    if (data.articles && data.articles.length > 0) {
        displayNewsArticles(data.articles);
    }
}

// Function to update sentiment badge
function updateSentimentBadge(sentiment, confidence) {
    if (!sentimentBadge) return;
    
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
    if (!newsSourcesList) return;
    
    newsSourcesList.innerHTML = articles.map((article, index) => `
        <div class="news-source-item" onclick="openNewsModal(${index})">
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
function openNewsModal(articleIndex) {
    if (!window.currentArticles || !newsModal) return;
    
    const article = window.currentArticles[articleIndex];
    if (!article) return;
    
    // Populate modal content
    if (modalHeadline) {
        modalHeadline.textContent = article.title || article.headline || 'No Title';
    }
    if (modalSource) {
        modalSource.textContent = article.source || 'Unknown Source';
    }
    if (modalTimestamp) {
        modalTimestamp.textContent = formatTimestamp(article.published_at || article.timestamp);
    }
    if (modalCredibility) {
        modalCredibility.textContent = article.credibility_score || 'N/A';
    }
    
    // Update sentiment tag
    if (modalSentimentTag) {
        modalSentimentTag.className = 'sentiment-tag ' + (article.sentiment || 'neutral');
        modalSentimentTag.textContent = (article.sentiment || 'neutral').toUpperCase();
    }
    
    if (modalConfidence) {
        modalConfidence.textContent = article.confidence ? 
            `${Math.round(article.confidence * 100)}%` : 'N/A';
    }
    if (modalReasoning) {
        modalReasoning.textContent = article.reasoning || 'No reasoning provided';
    }
    
    // Display key phrases
    if (modalKeyPhrases) {
        if (article.key_phrases && article.key_phrases.length > 0) {
            modalKeyPhrases.innerHTML = article.key_phrases.map(phrase => 
                `<span class="key-phrase">${phrase}</span>`
            ).join('');
        } else {
            modalKeyPhrases.innerHTML = '<span class="no-data">No key phrases available</span>';
        }
    }
    
    if (modalFullText) {
        modalFullText.textContent = article.content || article.full_text || 'Full article content not available';
    }
    
    // Show modal
    newsModal.classList.add('active');
}

// Function to close modal
function closeNewsModal() {
    if (newsModal) {
        newsModal.classList.remove('active');
    }
}

// Modal close handlers
function handleModalClose(e) {
    if (e.target === newsModal || e.target.classList.contains('close-modal')) {
        closeNewsModal();
    }
}

// Keyboard navigation for modal
function handleKeyboardNavigation(e) {
    if (e.key === 'Escape' && newsModal && newsModal.classList.contains('active')) {
        closeNewsModal();
    }
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
    if (loadingState) {
        loadingState.classList.remove('hidden');
    }
}

function showNoDataState() {
    hideAllStates();
    if (noDataState) {
        noDataState.classList.remove('hidden');
    }
}

function showErrorState(message) {
    hideAllStates();
    if (noDataState) {
        noDataState.classList.remove('hidden');
    }
    console.error('Error:', message);
}

function hideAllStates() {
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
    if (noDataState) {
        noDataState.classList.add('hidden');
    }
    if (resultsSection) {
        resultsSection.classList.add('hidden');
    }
}

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
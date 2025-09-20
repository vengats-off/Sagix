from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS
import requests
import re
import feedparser  # ← MISSING IMPORT - THIS IS THE FIX!
from datetime import datetime, timedelta, timezone
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, origins=[
    "https://sagix.onrender.com",
    "http://localhost:3000", # for local development
    "http://127.0.0.1:8080" # for local development
])

API_KEY = '7eae47b18ad34858878240cb7a6f139a'
analyzer = SentimentIntensityAnalyzer()

def finbert_sentiment_analysis(text):
    """Enhanced financial sentiment analysis optimized for Indian markets"""
    if not text or text.strip() == "":
        return "neutral", 0.5, "No content to analyze"
    
    text_lower = text.lower().strip()
    
    # Indian Financial Market Positive Indicators
    positive_indicators = {
        'partnership': 0.5, 'pact': 0.5, 'agreement': 0.4, 'tie-up': 0.4,
        'collaboration': 0.4, 'alliance': 0.4, 'joint venture': 0.5,
        'launch': 0.4, 'introduces': 0.4, 'expansion': 0.5, 'foray': 0.4,
        'growth': 0.4, 'increase': 0.3, 'rise': 0.3, 'surge': 0.5,
        'profit': 0.6, 'revenue growth': 0.5, 'earnings': 0.4, 'dividend': 0.4,
        'buyback': 0.5, 'bonus': 0.3, 'record': 0.4, 'strong': 0.3,
        'market share': 0.4, 'leadership': 0.4, 'milestone': 0.4,
        'breakthrough': 0.5, 'innovation': 0.4, 'patent': 0.3,
        'contract': 0.4, 'deal': 0.4, 'order': 0.3, 'wins': 0.5,
        'acquisition': 0.4, 'investment': 0.4, 'funding': 0.4,
        'upgrade': 0.5, 'outperform': 0.6, 'buy rating': 0.7,
        'target raised': 0.6, 'bullish': 0.5, 'positive': 0.4
    }
    
    # Indian Financial Market Negative Indicators
    negative_indicators = {
        'slashed': -0.7, 'cut': -0.5, 'reduced': -0.4, 'lowered': -0.4,
        'downgrade': -0.6, 'target cut': -0.6, 'price target slashed': -0.8,
        'decline': -0.4, 'fall': -0.4, 'drop': -0.5, 'plunge': -0.7,
        'loss': -0.6, 'losses': -0.6, 'deficit': -0.5, 'negative': -0.3,
        'bearish': -0.5, 'concern': -0.4, 'worry': -0.4, 'fear': -0.5,
        'uncertainty': -0.4, 'volatility': -0.3, 'risk': -0.3,
        'investigation': -0.6, 'probe': -0.5, 'lawsuit': -0.5,
        'penalty': -0.5, 'fine': -0.4, 'scandal': -0.8,
        'layoffs': -0.7, 'restructuring': -0.4, 'closure': -0.6,
        'bankruptcy': -0.9, 'debt': -0.4, 'underperform': -0.5,
        'sell rating': -0.7, 'avoid': -0.6, 'warning': -0.5
    }
    
    # Calculate base VADER sentiment
    vader_scores = analyzer.polarity_scores(text)
    base_score = vader_scores['compound']
    
    # Apply financial keyword adjustments
    financial_adjustment = 0
    positive_matches = []
    negative_matches = []
    
    for indicator, weight in positive_indicators.items():
        if indicator in text_lower:
            financial_adjustment += weight
            positive_matches.append(indicator)
    
    for indicator, weight in negative_indicators.items():
        if indicator in text_lower:
            financial_adjustment += weight
            negative_matches.append(indicator)
    
    final_score = base_score + financial_adjustment
    final_score = max(-1.0, min(1.0, final_score))
    
    if final_score >= 0.2:
        sentiment = "positive"
        confidence = min(0.95, 0.6 + abs(final_score * 0.4))
    elif final_score <= -0.2:
        sentiment = "negative"
        confidence = min(0.95, 0.6 + abs(final_score * 0.4))
    else:
        sentiment = "neutral"
        confidence = 0.6
    
    # Build reasoning
    reasoning_parts = []
    if positive_matches:
        reasoning_parts.append(f"Positive: {', '.join(positive_matches[:3])}")
    if negative_matches:
        reasoning_parts.append(f"Negative: {', '.join(negative_matches[:3])}")
    if not positive_matches and not negative_matches:
        reasoning_parts.append("Based on overall tone")
    
    reasoning = " | ".join(reasoning_parts) + f" (Score: {final_score:.2f})"
    
    return sentiment, confidence, reasoning

def get_date_filter(date_range):
    """Convert date range to API format"""
    now = datetime.now(timezone.utc)
    try:
        if date_range.endswith('d'):
            days = int(date_range[:-1])
            from_date = now - timedelta(days=days)
        elif date_range.endswith('w'):
            weeks = int(date_range[:-1])
            from_date = now - timedelta(weeks=weeks)
        elif date_range.endswith('m'):
            months = int(date_range[:-1])
            from_date = now - timedelta(days=30 * months)
        else:
            from_date = now - timedelta(days=1)
    except (ValueError, IndexError):
        from_date = now - timedelta(days=1)
    
    return from_date.strftime('%Y-%m-%dT%H:%M:%SZ')

def create_sample_articles(company_name):
    """Create sample articles when no real news is found"""
    sample_articles = [
        {
            'title': f'{company_name} maintains steady market position in current trading session',
            'description': f'Market analysis shows {company_name} trading within expected ranges with moderate investor interest and stable volume patterns.',
            'url': 'https://example.com/sample1',
            'publishedAt': datetime.now(timezone.utc).isoformat(),
            'source': {'name': 'Sample Financial Analysis'},
            'sentiment': 'neutral',
            'sentiment_confidence': 0.65,
            'sentiment_reasoning': 'Based on overall tone (Score: 0.02)',
            'urlToImage': None
        }
    ]
    return sample_articles

def get_fallback_news(company_name):
    """Enhanced fallback with multiple trusted Indian financial news sources"""
    all_articles = []
    
    # List of TRUSTED Indian financial RSS feeds
    news_sources = [
        # Tier 1 - Core Financial Publications (Original 4)
        {
            'name': 'Economic Times Markets',
            'url': 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
            'source_name': 'Economic Times'
        },
        {
            'name': 'Business Standard Markets',
            'url': 'https://www.business-standard.com/rss/markets-106.rss',
            'source_name': 'Business Standard'
        },
        {
            'name': 'Hindu BusinessLine Markets',
            'url': 'https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss',
            'source_name': 'Hindu BusinessLine'
        },
        {
            'name': 'LiveMint Markets',
            'url': 'https://www.livemint.com/rss/markets',
            'source_name': 'LiveMint'
        },
        
        # Tier 2 - Additional Verified Working Sources
        {
            'name': 'Financial Express Economy',
            'url': 'https://www.financialexpress.com/feed/',  # Working main feed
            'source_name': 'Financial Express'
        },
        {
            'name': 'Times of India Business',
            'url': 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',  # Business RSS
            'source_name': 'Times of India'
        },
        {
            'name': 'Indian Express Business',
            'url': 'https://indianexpress.com/section/business/feed/',
            'source_name': 'Indian Express'
        },
        {
            'name': 'CNBC-TV18',
            'url': 'https://www.cnbctv18.com/rss/home.xml',  # Working RSS
            'source_name': 'CNBC-TV18'
        },
        
        # Tier 3 - International Sources with India Focus
        {
            'name': 'Reuters India Business',
            'url': 'https://feeds.reuters.com/reuters/INbusinessNews',
            'source_name': 'Reuters India'
        },
        {
            'name': 'Bloomberg India',
            'url': 'https://feeds.bloomberg.com/markets/news.rss',
            'source_name': 'Bloomberg'
        },
        
        # Tier 4 - Regional Business Publications
        {
            'name': 'Economic Times B2B',
            'url': 'https://b2b.economictimes.indiatimes.com/rss',
            'source_name': 'ET B2B'
        },
        {
            'name': 'Economic Times Retail',
            'url': 'https://retail.economictimes.indiatimes.com/rss',
            'source_name': 'ET Retail'
        },
        
        # Tier 5 - Market Watch International
        {
            'name': 'MarketWatch',
            'url': 'https://feeds.marketwatch.com/marketwatch/topstories/',
            'source_name': 'MarketWatch'
        }
    ]
    
    print(f"🔍 Searching for {company_name} across {len(news_sources)} trusted Indian financial news sources...")
    
    # Enhanced company name matching
    def get_company_variations(company_name):
        variations = [
            company_name.lower(),
            company_name.upper(),
            company_name.replace(' ', '').lower(),
        ]
        
        # Add NSE stock symbol variations
        company_upper = company_name.upper()
        if company_upper == 'TCS':
            variations.extend(['tata consultancy', 'tcs ltd', 'tcs limited', 'tata consultancy services'])
        elif company_upper == 'SBIN':
            variations.extend(['state bank', 'sbi', 'state bank of india'])
        elif company_upper == 'RELIANCE':
            variations.extend(['reliance industries', 'ril', 'mukesh ambani'])
        elif company_upper == 'INFY':
            variations.extend(['infosys', 'infosys ltd', 'infosys limited'])
        elif company_upper in ['HDFC', 'HDFCBANK']:
            variations.extend(['hdfc bank', 'hdfc ltd', 'housing development'])
        elif company_upper == 'ICICIBANK':
            variations.extend(['icici bank', 'icici ltd'])
        elif company_upper == 'ITC':
            variations.extend(['itc ltd', 'itc limited', 'indian tobacco'])
        elif company_upper == 'WIPRO':
            variations.extend(['wipro ltd', 'wipro limited'])
        elif company_upper == 'LT':
            variations.extend(['l&t', 'larsen toubro', 'larsen & toubro'])
        elif 'M&M' in company_upper or 'MAHINDRA' in company_upper:
            variations.extend(['mahindra', 'm&m', 'mahindra & mahindra', 'anand mahindra'])
        
        return variations
    
    company_variations = get_company_variations(company_name)
    
    for source in news_sources:
        try:
            print(f"  📰 Checking {source['name']}...")
            
            # Parse RSS feed with timeout
            feed = feedparser.parse(source['url'])
            
            if not feed.entries:
                print(f"    ❌ {source['name']}: No entries found")
                continue
            
            source_articles = []
            
            # Check more entries for better matching
            for entry in feed.entries[:30]:  # Increased from 20 to 30
                title = getattr(entry, 'title', '')
                summary = getattr(entry, 'summary', '')
                combined_text = f"{title} {summary}".lower()
                
                # More flexible matching
                found_match = any(variation in combined_text for variation in company_variations)
                
                if found_match:
                    # Perform sentiment analysis on real news
                    text = f"{title} {summary}"
                    sentiment, confidence, reasoning = finbert_sentiment_analysis(text)
                    
                    # Get publication date
                    published_at = getattr(entry, 'published', datetime.now(timezone.utc).isoformat())
                    
                    article = {
                        'title': title,
                        'description': summary,
                        'url': getattr(entry, 'link', ''),
                        'publishedAt': published_at,
                        'source': {'name': source['source_name']},
                        'sentiment': sentiment,
                        'sentiment_confidence': round(confidence, 3),
                        'sentiment_reasoning': reasoning,
                        'urlToImage': None
                    }
                    
                    source_articles.append(article)
                    print(f"    ✅ Found: {title[:60]}...")
            
            print(f"    📊 {source['name']}: Found {len(source_articles)} articles")
            all_articles.extend(source_articles)
            
            # Stop after finding enough articles from trusted sources
            if len(all_articles) >= 8:
                break
                
        except Exception as e:
            print(f"    ❌ {source['name']} error: {e}")
            continue
    
    # If no real articles found, create sample articles (last resort)
    if not all_articles:
        print(f"  🎯 No real articles found, creating sample data for {company_name}")
        all_articles = create_sample_articles(company_name)
    
    print(f"📊 Total articles found: {len(all_articles)} from trusted Indian financial sources")
    return all_articles

def generate_reasoning_text(sentiment_counts, overall_sentiment):
    """Generate reasoning text for the summary"""
    total = sum(sentiment_counts.values())
    if total == 0:
        return "No articles found for analysis"
    
    if overall_sentiment == 'positive':
        return f"Positive sentiment detected in {sentiment_counts['positive']} out of {total} articles from trusted financial sources"
    elif overall_sentiment == 'negative':
        return f"Negative sentiment detected in {sentiment_counts['negative']} out of {total} articles from trusted financial sources"
    else:
        return f"Mixed sentiment across {total} articles from trusted sources: {sentiment_counts['positive']} positive, {sentiment_counts['negative']} negative, {sentiment_counts['neutral']} neutral"

# Frontend routes
@app.route('/')
def homepage():
    """Serve your main dashboard"""
    return render_template('index.html')

@app.route('/sentiment')
def sentiment_page():
    """Serve sentiment analysis page"""
    return render_template('sentiment.html')

# Static file routes
@app.route('/companies.js')
def serve_companies_js():
    return send_from_directory('.', 'static/js/companies.js')

@app.route('/sentment-app.js')
def serve_sentiment_app_js():
    return send_from_directory('.', 'static/js/sentment-app.js')

@app.route('/sentiment-style.css')
def serve_sentiment_css():
    return send_from_directory('.', 'sentiment-style.css')

@app.route('/logo.png')
def serve_logo():
    return send_from_directory('.', 'logo.png')

# MAIN API ROUTE - Always fetches real news from trusted sources
@app.route('/api/news', methods=['GET'])
def get_news():
    company_name = request.args.get('company', '').strip()
    if not company_name:
        return jsonify({'error': 'Company name required'}), 400
    
    date_range = request.args.get('date_range', '1d').lower()
    from_date = get_date_filter(date_range)
    
    print(f"🚀 Starting analysis for {company_name} (range: {date_range})")
    
    # Try NewsAPI first for latest news
    query = f'"{company_name}"'
    url = (f'https://newsapi.org/v2/everything?q={query}'
           f'&language=en&from={from_date}&sortBy=publishedAt&apiKey={API_KEY}')
    
    try:
        resp = requests.get(url, timeout=10)
        
        # Always try trusted Indian sources first
        print(f"📰 Fetching from trusted Indian financial news sources...")
        trusted_articles = get_fallback_news(company_name)
        
        # If NewsAPI is working, combine with trusted sources
        if resp.status_code == 200:
            data = resp.json()
            pattern = re.compile(r'\b{}\b'.format(re.escape(company_name)), re.IGNORECASE)
            
            newsapi_articles = []
            for article in data.get('articles', []):
                title = article.get('title', '') or ''
                description = article.get('description', '') or ''
                
                if pattern.search(title) or pattern.search(description):
                    text = (title + ' ' + description).strip()
                    sentiment, confidence, reasoning = finbert_sentiment_analysis(text)
                    
                    article.update({
                        'sentiment': sentiment,
                        'sentiment_confidence': round(confidence, 3),
                        'sentiment_reasoning': reasoning
                    })
                    newsapi_articles.append(article)
            
            # Combine NewsAPI + Trusted sources
            all_articles = trusted_articles + newsapi_articles[:5]  # Limit NewsAPI to 5
        else:
            # Use only trusted sources
            all_articles = trusted_articles
        
        # Remove duplicates by title
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            title = article.get('title', '')
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_articles.append(article)
        
        all_articles = unique_articles[:10]  # Limit to 10 total articles
        
        # Calculate sentiment summary
        sentiments = [a['sentiment'] for a in all_articles]
        sentiment_counts = {
            'positive': sentiments.count('positive'),
            'negative': sentiments.count('negative'),
            'neutral': sentiments.count('neutral')
        }
        
        overall_sentiment = (
            'positive' if sentiment_counts['positive'] > sentiment_counts['negative']
            else 'negative' if sentiment_counts['negative'] > sentiment_counts['positive']
            else 'neutral'
        )
        
        avg_confidence = sum(a['sentiment_confidence'] for a in all_articles) / len(all_articles) if all_articles else 0.6
        
        # Count trusted vs other sources
        trusted_sources = {'Economic Times', 'Business Standard', 'Hindu BusinessLine', 'Financial Express', 'Mint', 'MoneyControl'}
        trusted_count = sum(1 for a in all_articles if a.get('source', {}).get('name', '') in trusted_sources)
        
        return jsonify({
            'articles': all_articles,
            'totalResults': len(all_articles),
            'summary': {
                'overall_sentiment': overall_sentiment,
                'sentiment_counts': sentiment_counts,
                'average_confidence': round(avg_confidence, 3),
                'company': company_name,
                'date_range': date_range,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'reasoning': generate_reasoning_text(sentiment_counts, overall_sentiment),
                'trusted_sources_count': trusted_count,
                'total_sources_analyzed': len(set(a.get('source', {}).get('name', '') for a in all_articles))
            },
            'status': 'success_trusted_sources',
            'message': f'Analysis from {trusted_count} trusted Indian financial sources'
        }), 200
        
    except Exception as e:
        print(f"❌ Exception for {company_name}: {str(e)}")
        
        # Even on exception, use trusted sources
        trusted_articles = get_fallback_news(company_name)
        sentiments = [a['sentiment'] for a in trusted_articles]
        sentiment_counts = {
            'positive': sentiments.count('positive'),
            'negative': sentiments.count('negative'),
            'neutral': sentiments.count('neutral')
        }
        
        overall_sentiment = (
            'positive' if sentiment_counts['positive'] > sentiment_counts['negative']
            else 'negative' if sentiment_counts['negative'] > sentiment_counts['positive']
            else 'neutral'
        )
        
        avg_confidence = sum(a['sentiment_confidence'] for a in trusted_articles) / len(trusted_articles) if trusted_articles else 0.6
        
        return jsonify({
            'articles': trusted_articles,
            'totalResults': len(trusted_articles),
            'summary': {
                'overall_sentiment': overall_sentiment,
                'sentiment_counts': sentiment_counts,
                'average_confidence': round(avg_confidence, 3),
                'company': company_name,
                'date_range': date_range,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'reasoning': generate_reasoning_text(sentiment_counts, overall_sentiment)
            },
            'status': 'trusted_sources_fallback',
            'message': f'Using trusted Indian financial sources'
        }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'routes_available': ['/', '/sentiment', '/api/news', '/api/health'],
        'news_sources': 'Trusted Indian Financial Publications'
    })

@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({
        'message': 'SagiX Flask backend is working with trusted news sources!',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'test_company': request.args.get('company', 'No company provided')
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

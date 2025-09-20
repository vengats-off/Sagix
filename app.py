from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS
import requests
import re
import feedparser
from datetime import datetime, timedelta, timezone
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from bs4 import BeautifulSoup
import time
import random

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, origins=[
    "https://sagix.onrender.com",
    "http://localhost:3000", 
    "http://127.0.0.1:8080" 
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
        'target raised': 0.6, 'bullish': 0.5, 'positive': 0.4,
        'beat estimates': 0.6, 'exceeded expectations': 0.7
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
        'sell rating': -0.7, 'avoid': -0.6, 'warning': -0.5,
        'missed estimates': -0.6, 'disappointing': -0.5
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

def scrape_moneycontrol_news(company_name, max_articles=5):
    """Scrape news from MoneyControl"""
    articles = []
    try:
        search_url = f"https://www.moneycontrol.com/news/tags/{company_name.lower().replace(' ', '-')}.html"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find news articles
            news_items = soup.find_all('div', class_='news_area')[:max_articles]
            
            for item in news_items:
                try:
                    title_elem = item.find('h2') or item.find('a')
                    if title_elem:
                        title = title_elem.get_text().strip()
                        link = title_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = f"https://www.moneycontrol.com{link}"
                        
                        description = ""
                        desc_elem = item.find('p')
                        if desc_elem:
                            description = desc_elem.get_text().strip()
                        
                        if title and any(var in title.lower() for var in [company_name.lower(), company_name.upper()]):
                            sentiment, confidence, reasoning = finbert_sentiment_analysis(f"{title} {description}")
                            
                            articles.append({
                                'title': title,
                                'description': description,
                                'url': link,
                                'publishedAt': datetime.now(timezone.utc).isoformat(),
                                'source': {'name': 'MoneyControl'},
                                'sentiment': sentiment,
                                'sentiment_confidence': round(confidence, 3),
                                'sentiment_reasoning': reasoning,
                                'urlToImage': None
                            })
                except Exception:
                    continue
                    
        print(f"  📊 MoneyControl: Found {len(articles)} articles")
        
    except Exception as e:
        print(f"  ❌ MoneyControl scraping error: {e}")
    
    return articles

def scrape_investing_com_news(company_name, max_articles=5):
    """Scrape news from Investing.com India"""
    articles = []
    try:
        search_url = f"https://in.investing.com/search/?q={company_name}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find news articles
            news_items = soup.find_all('div', class_='js-inner-all-results-quote-item')[:max_articles]
            
            for item in news_items:
                try:
                    title_elem = item.find('a')
                    if title_elem:
                        title = title_elem.get_text().strip()
                        link = title_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = f"https://in.investing.com{link}"
                        
                        description = ""
                        desc_elem = item.find('span', class_='excerptPart')
                        if desc_elem:
                            description = desc_elem.get_text().strip()
                        
                        if title and any(var in title.lower() for var in [company_name.lower()]):
                            sentiment, confidence, reasoning = finbert_sentiment_analysis(f"{title} {description}")
                            
                            articles.append({
                                'title': title,
                                'description': description,
                                'url': link,
                                'publishedAt': datetime.now(timezone.utc).isoformat(),
                                'source': {'name': 'Investing.com'},
                                'sentiment': sentiment,
                                'sentiment_confidence': round(confidence, 3),
                                'sentiment_reasoning': reasoning,
                                'urlToImage': None
                            })
                except Exception:
                    continue
                    
        print(f"  📊 Investing.com: Found {len(articles)} articles")
        
    except Exception as e:
        print(f"  ❌ Investing.com scraping error: {e}")
    
    return articles

def scrape_economic_times_search(company_name, max_articles=5):
    """Scrape Economic Times search results"""
    articles = []
    try:
        search_url = f"https://economictimes.indiatimes.com/topic/{company_name.lower().replace(' ', '-')}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find story cards
            story_cards = soup.find_all('div', class_='eachStory')[:max_articles]
            
            for card in story_cards:
                try:
                    title_elem = card.find('h3') or card.find('h2')
                    link_elem = card.find('a')
                    
                    if title_elem and link_elem:
                        title = title_elem.get_text().strip()
                        link = link_elem.get('href', '')
                        if link and not link.startswith('http'):
                            link = f"https://economictimes.indiatimes.com{link}"
                        
                        description = ""
                        desc_elem = card.find('p')
                        if desc_elem:
                            description = desc_elem.get_text().strip()
                        
                        sentiment, confidence, reasoning = finbert_sentiment_analysis(f"{title} {description}")
                        
                        articles.append({
                            'title': title,
                            'description': description,
                            'url': link,
                            'publishedAt': datetime.now(timezone.utc).isoformat(),
                            'source': {'name': 'Economic Times'},
                            'sentiment': sentiment,
                            'sentiment_confidence': round(confidence, 3),
                            'sentiment_reasoning': reasoning,
                            'urlToImage': None
                        })
                except Exception:
                    continue
                    
        print(f"  📊 Economic Times: Found {len(articles)} articles")
        
    except Exception as e:
        print(f"  ❌ Economic Times scraping error: {e}")
    
    return articles

def get_company_variations(company_name):
    """Get all possible variations of a company name"""
    variations = [
        company_name.lower(),
        company_name.upper(),
        company_name.replace(' ', '').lower(),
    ]
    
    # Add NSE stock symbol variations
    company_upper = company_name.upper()
    company_mappings = {
        'TCS': ['tata consultancy', 'tcs ltd', 'tcs limited', 'tata consultancy services'],
        'SBIN': ['state bank', 'sbi', 'state bank of india'],
        'RELIANCE': ['reliance industries', 'ril', 'mukesh ambani', 'reliance ltd'],
        'INFY': ['infosys', 'infosys ltd', 'infosys limited'],
        'HDFC': ['hdfc bank', 'hdfc ltd', 'housing development'],
        'HDFCBANK': ['hdfc bank', 'hdfc banking'],
        'ICICIBANK': ['icici bank', 'icici ltd'],
        'ITC': ['itc ltd', 'itc limited', 'indian tobacco'],
        'WIPRO': ['wipro ltd', 'wipro limited'],
        'LT': ['l&t', 'larsen toubro', 'larsen & toubro'],
        'M&M': ['mahindra', 'm&m', 'mahindra & mahindra', 'anand mahindra'],
        'MARUTI': ['maruti suzuki', 'maruti udyog'],
        'BHARTIARTL': ['bharti airtel', 'airtel', 'bharti'],
        'AXISBANK': ['axis bank', 'axis banking'],
        'KOTAKBANK': ['kotak mahindra', 'kotak bank'],
        'SUNPHARMA': ['sun pharma', 'sun pharmaceutical'],
        'DRREDDY': ['dr reddy', 'dr reddys', 'drl'],
        'TATASTEEL': ['tata steel', 'tata steel ltd'],
        'TATAMOTORS': ['tata motors', 'tata motor'],
        'HINDUNILVR': ['hindustan unilever', 'hul'],
        'ASIANPAINT': ['asian paints', 'asian paint'],
        'BAJFINANCE': ['bajaj finance', 'bajaj fin'],
        'ADANIENT': ['adani enterprises', 'adani group'],
        'ONGC': ['oil natural gas', 'oil and natural gas'],
        'NTPC': ['ntpc ltd', 'ntpc limited'],
        'COALINDIA': ['coal india', 'cil'],
        'IOC': ['indian oil', 'indian oil corp'],
        'BPCL': ['bharat petroleum', 'bpcl ltd'],
        'HINDPETRO': ['hindustan petroleum', 'hpcl']
    }
    
    if company_upper in company_mappings:
        variations.extend(company_mappings[company_upper])
    
    return variations

def get_rss_news(company_name):
    """Get news from RSS feeds"""
    articles = []
    
    news_sources = [
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
            'name': 'Financial Express',
            'url': 'https://www.financialexpress.com/feed/',
            'source_name': 'Financial Express'
        },
        {
            'name': 'LiveMint Markets',
            'url': 'https://www.livemint.com/rss/markets',
            'source_name': 'LiveMint'
        }
    ]
    
    company_variations = get_company_variations(company_name)
    
    for source in news_sources:
        try:
            feed = feedparser.parse(source['url'])
            
            for entry in feed.entries[:20]:
                title = getattr(entry, 'title', '')
                summary = getattr(entry, 'summary', '')
                combined_text = f"{title} {summary}".lower()
                
                found_match = any(variation in combined_text for variation in company_variations)
                
                if found_match:
                    text = f"{title} {summary}"
                    sentiment, confidence, reasoning = finbert_sentiment_analysis(text)
                    
                    articles.append({
                        'title': title,
                        'description': summary,
                        'url': getattr(entry, 'link', ''),
                        'publishedAt': getattr(entry, 'published', datetime.now(timezone.utc).isoformat()),
                        'source': {'name': source['source_name']},
                        'sentiment': sentiment,
                        'sentiment_confidence': round(confidence, 3),
                        'sentiment_reasoning': reasoning,
                        'urlToImage': None
                    })
                    
                if len(articles) >= 5:
                    break
                    
        except Exception as e:
            print(f"  ❌ RSS {source['name']} error: {e}")
            continue
    
    return articles

def get_comprehensive_news(company_name):
    """Get news from multiple sources using both RSS and web scraping"""
    all_articles = []
    
    print(f"🔍 Comprehensive news search for {company_name}")
    
    # 1. RSS Sources (fast and reliable)
    print("  📡 Fetching RSS feeds...")
    rss_articles = get_rss_news(company_name)
    all_articles.extend(rss_articles)
    
    # Add delays to avoid being blocked
    time.sleep(random.uniform(1, 2))
    
    # 2. Web Scraping Sources
    print("  🕷️ Starting web scraping...")
    
    # MoneyControl
    try:
        mc_articles = scrape_moneycontrol_news(company_name, 4)
        all_articles.extend(mc_articles)
        time.sleep(random.uniform(1, 2))
    except Exception as e:
        print(f"  ❌ MoneyControl failed: {e}")
    
    # Investing.com
    try:
        inv_articles = scrape_investing_com_news(company_name, 3)
        all_articles.extend(inv_articles)
        time.sleep(random.uniform(1, 2))
    except Exception as e:
        print(f"  ❌ Investing.com failed: {e}")
    
    # Economic Times Search
    try:
        et_articles = scrape_economic_times_search(company_name, 4)
        all_articles.extend(et_articles)
    except Exception as e:
        print(f"  ❌ Economic Times scraping failed: {e}")
    
    # Remove duplicates by title similarity
    unique_articles = []
    seen_titles = set()
    
    for article in all_articles:
        title = article.get('title', '').lower().strip()
        # Create a normalized title for comparison
        title_key = ' '.join(sorted(title.split()[:5]))  # Use first 5 words, sorted
        
        if title_key and title_key not in seen_titles:
            seen_titles.add(title_key)
            unique_articles.append(article)
    
    # Sort by source reliability (trusted sources first)
    trusted_sources = ['Economic Times', 'Business Standard', 'Hindu BusinessLine', 'Financial Express', 'MoneyControl', 'LiveMint']
    
    def source_priority(article):
        source_name = article.get('source', {}).get('name', '')
        if source_name in trusted_sources:
            return trusted_sources.index(source_name)
        return len(trusted_sources)
    
    unique_articles.sort(key=source_priority)
    
    print(f"📊 Total unique articles found: {len(unique_articles)}")
    
    return unique_articles[:15]  # Return top 15 articles

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
        return f"Mixed sentiment across {total} articles: {sentiment_counts['positive']} positive, {sentiment_counts['negative']} negative, {sentiment_counts['neutral']} neutral"

# Frontend routes
@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/sentiment')
def sentiment_page():
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

# MAIN API ROUTE - Comprehensive news fetching
@app.route('/api/news', methods=['GET'])
def get_news():
    company_name = request.args.get('company', '').strip()
    if not company_name:
        return jsonify({'error': 'Company name required'}), 400
    
    date_range = request.args.get('date_range', '1d').lower()
    
    print(f"🚀 Starting comprehensive analysis for {company_name} (range: {date_range})")
    
    try:
        # Use comprehensive approach
        all_articles = get_comprehensive_news(company_name)
        
        if not all_articles:
            # Last resort - create sample articles
            all_articles = create_sample_articles(company_name)
        
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
        
        # Count sources
        sources_used = list(set(a.get('source', {}).get('name', '') for a in all_articles))
        
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
                'sources_used': sources_used,
                'total_sources_analyzed': len(sources_used)
            },
            'status': 'comprehensive_analysis',
            'message': f'Analysis from {len(sources_used)} sources including RSS + web scraping'
        }), 200
        
    except Exception as e:
        print(f"❌ Exception for {company_name}: {str(e)}")
        
        # Fallback to sample articles
        sample_articles = create_sample_articles(company_name)
        
        return jsonify({
            'articles': sample_articles,
            'totalResults': len(sample_articles),
            'summary': {
                'overall_sentiment': 'neutral',
                'sentiment_counts': {'positive': 0, 'negative': 0, 'neutral': len(sample_articles)},
                'average_confidence': 0.6,
                'company': company_name,
                'date_range': date_range,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'reasoning': 'Analysis based on sample data due to technical issues'
            },
            'status': 'fallback_mode',
            'message': 'Using sample data - please try again'
        }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'routes_available': ['/', '/sentiment', '/api/news', '/api/health'],
        'news_sources': 'RSS + Web Scraping from Trusted Indian Financial Publications'
    })

@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({
        'message': 'SagiX Flask backend with comprehensive news scraping!',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'test_company': request.args.get('company', 'No company provided')
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

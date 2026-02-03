import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import HTMLFlipBook from 'react-pageflip';

const DEFAULT_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5ld3NwYXBlciBJbWFnZTwvdGV4dD48L3N2Zz4=';

const API_BASE = 'https://news-scraper-api-ai-1.onrender.com';

// Cache utilities
const CACHE_KEY = 'news_articles_cache';
const CACHE_TIMESTAMP_KEY = 'news_cache_timestamp';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const getCachedArticles = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
};

const setCachedArticles = (articles: any[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(articles));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Cache write error:', error);
  }
};

// Image preloading utility - silent background loading
const preloadImages = (articles: any[]) => {
  articles.forEach((article, index) => {
    if (article.img && article.img !== DEFAULT_IMG) {
      // Create image element but don't wait for it to load
      const img = new Image();
      img.onload = () => console.log(`Preloaded image ${index + 1}`);
      img.onerror = () => console.log(`Failed to preload image ${index + 1}`);
      
      // Stagger loading to avoid overwhelming the network
      setTimeout(() => {
        img.src = article.img;
      }, index * 50); // 50ms delay between each image
    }
  });
};

// Fetch news articles from API
const fetchNews = async (limit = 50) => {
  // Check cache first, but only if we're asking for same or fewer articles
  const cached = getCachedArticles();
  if (cached && cached.length >= limit) {
    console.log(`Using cached articles (${cached.length} available, ${limit} requested)`);
    return cached.slice(0, limit);
  }

  try {
    console.log(`Fetching ${limit} articles from API`);
    const response = await fetch(`${API_BASE}/articles?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.articles || data.articles.length === 0) {
      throw new Error('No articles found');
    }
    
    const articles = data.articles.map((article: any) => ({
      id: article.id,
      headline: article.title,
      date: new Date(article.scraped_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      source: article.source,
      img: article.image_url === 'No image found' ? null : article.image_url,
      content: article.content
    }));

    // Cache the results only if we got more articles than before
    if (!cached || articles.length > cached.length) {
      setCachedArticles(articles);
      console.log(`Cached ${articles.length} articles`);
    }
    
    return articles;
  } catch (error) {
    console.error('Failed to fetch news:', error);
    // Return cached data as fallback if available
    if (cached) {
      console.log('Using cached articles as fallback');
      return cached.slice(0, limit);
    }
    return [];
  }
};

const globalStyles = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Merriweather', serif;
  background: #2c2c2c;
  overflow: hidden;
  user-select: none;
  height: 100vh;
}

.viewport-stage {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c2c2c;
}

.flip-book {
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  border-radius: 8px;
  overflow: hidden;
  transition: none !important;
}

.flip-book * {
  transition: none !important;
}

.page-sheet {
  width: 100%;
  height: 100%;
  background: #f5f3ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.copyright {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 8px;
  color: #666;
  font-family: 'Playfair Display', serif;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.8;
}

.page-content {
  flex: 1;
  padding: 20px 20px 60px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 12px;
  color: #1a1a1a;
  text-align: center;
}

.date {
  font-size: 10px;
  color: #888;
  text-align: center;
  margin-bottom: 8px;
  font-style: italic;
}

.source {
  font-size: 9px;
  color: #666;
  text-align: center;
  margin-bottom: 15px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.image-container {
  flex: 0 0 auto;
  margin-bottom: 15px;
  text-align: center;
}

.image-container img {
  width: 100%;
  max-height: 150px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.description {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-right: 5px;
  white-space: pre-wrap;
}

.description::-webkit-scrollbar {
  width: 3px;
}

.description::-webkit-scrollbar-track {
  background: transparent;
}

.description::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}

.description p {
  margin-bottom: 12px;
  text-align: justify;
}

.page-number {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 15px;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #e0e0e0;
  background: rgba(245, 243, 237, 0.9);
}

@media (min-width: 768px) {
  .title {
    font-size: 24px;
    margin-bottom: 15px;
  }
  
  .page-content {
    padding: 25px 30px 20px 30px;
  }
  
  .description {
    font-size: 14px;
    line-height: 1.5;
  }
  
  .image-container img {
    max-height: 180px;
  }
  
  .date {
    font-size: 11px;
    margin-bottom: 8px;
  }
  
  .source {
    font-size: 10px;
    margin-bottom: 18px;
  }
}

.read-more-indicator {
  position: absolute;
  top: 60%;
  right: 8px;
  transform: translateY(-50%);
  padding: 4px 8px;
  background: rgba(26, 26, 26, 0.8);
  border-radius: 12px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  font-size: 9px;
  color: #f5f3ed;
  font-family: 'Playfair Display', serif;
  white-space: nowrap;
}

.read-more-indicator:hover {
  background: rgba(26, 26, 26, 1);
  transform: translateY(-50%) scale(1.05);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #f5f3ed;
  width: 90vw;
  max-width: 600px;
  height: 80vh;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-close-btn {
  position: absolute;
  top: 60%;
  right: 8px;
  transform: translateY(-50%);
  padding: 4px 8px;
  background: rgba(26, 26, 26, 0.8);
  border-radius: 12px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  font-size: 9px;
  color: #f5f3ed;
  font-family: 'Playfair Display', serif;
  white-space: nowrap;
  border: none;
}

.modal-close-btn:hover {
  background: rgba(26, 26, 26, 1);
  transform: translateY(-50%) scale(1.05);
}

.modal-header {
  padding: 20px 20px 10px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.modal-meta {
  padding: 0 20px 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}

.modal-date {
  font-size: 11px;
  color: #888;
  font-style: italic;
  margin-bottom: 5px;
}

.modal-source {
  font-size: 10px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
  margin-right: 15px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
}

.modal-body p {
  margin-bottom: 15px;
  text-align: justify;
}

.refresh-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(26, 26, 26, 0.8);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: #f5f3ed;
  cursor: pointer;
  z-index: 100;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: rgba(26, 26, 26, 1);
  transform: scale(1.05);
}

@media (max-width: 480px) {
  .title {
    font-size: 18px;
  }
  
  .description {
    font-size: 12px;
  }
  
  .modal-content {
    width: 95vw;
    height: 85vh;
  }
  
  .modal-title {
    font-size: 16px;
  }
  
  .modal-body {
    font-size: 13px;
  }
}
`;

const NewspaperPage = React.forwardRef<HTMLDivElement, { article: any, pageNum: number, total: number, onReadMore: (article: any) => void }>(  ({ article, pageNum, total, onReadMore }, ref) => {
    if (!article) return null;

    const isLongArticle = article.content.length > 800;
    const summary = isLongArticle ? article.content.substring(0, 800) + '...' : article.content;

    return (
      <div ref={ref} className="page-sheet">
        <div className="copyright">The Reading Room</div>
        
        <div className="page-content">
          <h1 className="title">{article.headline}</h1>
          
          <div className="date">{article.date}</div>
          
          <div className="source">{article.source}</div>
          
          <div className="image-container">
            <img
              src={article.img || DEFAULT_IMG}
              alt="Story Visual"
              draggable="false"
              onError={(e) => {
                // Fallback to default image if loading fails
                e.currentTarget.src = DEFAULT_IMG;
              }}
            />
          </div>

          <div className="description">
            {summary}
          </div>
        </div>
        
        {isLongArticle && (
          <div 
            className="read-more-indicator"
            onClick={(e) => {
              e.stopPropagation();
              onReadMore(article);
            }}
            title="Continue Reading"
          >
            Read all ?
          </div>
        )}
        
        <div className="page-number">
          {pageNum} / {total}
        </div>
      </div>
    );
  }
);

function App() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(5);
  const [modalArticle, setModalArticle] = useState<any>(null);
  const flipBookRef = useRef<any>(null);

  // Background load full articles after initial load
  const backgroundLoadFullArticles = async () => {
    try {
      const fullArticles = await fetchNews(20);
      if (fullArticles.length > 5) {
        // Preload images for better page flipping experience (background only)
        setTimeout(() => preloadImages(fullArticles), 500);
        
        // Only update if user is still on first page to avoid flicker
        setTimeout(() => {
          setArticles(fullArticles);
          setCurrentLimit(20);
          console.log('Background loaded 20 articles');
        }, 1000); // Delay to ensure user sees initial content
      }
    } catch (error) {
      console.error('Background load error:', error);
    }
  };

  // Load more articles when needed
  const loadMoreArticles = async (newLimit: number) => {
    if (newLimit <= currentLimit) return;
    
    try {
      const moreArticles = await fetchNews(newLimit);
      if (moreArticles.length > 0) {
        // Preload new images silently
        setTimeout(() => preloadImages(moreArticles.slice(currentLimit)), 200);
        
        setArticles(moreArticles);
        setCurrentLimit(newLimit);
        console.log(`Loaded ${newLimit} articles total`);
      }
    } catch (error) {
      console.error('Error loading more articles:', error);
    }
  };

  // Load news articles on mount
  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        // Load only 5 articles initially for fast startup
        const newsArticles = await fetchNews(5);
        setArticles(newsArticles);
        setCurrentLimit(5);
        
        // Preload initial images silently in background
        setTimeout(() => preloadImages(newsArticles), 500);
        
        // Start background loading of full 20 articles after a longer delay
        setTimeout(() => {
          backgroundLoadFullArticles();
        }, 2000);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  const handleFlip = (e: any) => {
    const pageNum = e.data + 1;
    console.log(`Flipped to page ${pageNum}, current limit: ${currentLimit}`);
    
    // Load more articles as user progresses
    if (pageNum >= 4 && currentLimit < 50) {
      console.log('Triggering load of 50 articles');
      loadMoreArticles(50);
    } else if (pageNum >= 31 && currentLimit < 100) {
      console.log('Triggering load of 100 articles');
      loadMoreArticles(100);
    } else if (pageNum >= 71 && currentLimit < 200) {
      console.log('Triggering load of 200 articles');
      loadMoreArticles(200);
    } else if (pageNum >= 151 && currentLimit < 400) {
      console.log('Triggering load of 400 articles');
      loadMoreArticles(400);
    }
  };

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <div className="viewport-stage">
          <div className="page-sheet">
            <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', color: '#666' }}>Loading news...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (articles.length === 0) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        <div className="viewport-stage">
          <div className="page-sheet">
            <div className="page-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', color: '#666' }}>No news available</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <button className="refresh-btn" onClick={() => {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        window.location.reload(true);
      }} title="Refresh">
        ↻
      </button>
      <div className="viewport-stage">
        <HTMLFlipBook
          ref={flipBookRef}
          width={Math.min(400, window.innerWidth * 0.9)}
          height={Math.min(600, window.innerHeight * 0.85)}
          size="fixed"
          minWidth={300}
          maxWidth={400}
          minHeight={400}
          maxHeight={600}
          maxShadowOpacity={0.3}
          showCover={false}
          mobileScrollSupport={true}
          onFlip={handleFlip}
          className="flip-book"
          startPage={0}
          drawShadow={true}
          flippingTime={400}
          usePortrait={true}
          startZIndex={0}
          autoSize={false}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={50}
          showPageCorners={true}
          disableFlipByClick={false}
        >
          {articles.map((article, index) => (
            <NewspaperPage
              key={article.id}
              article={article}
              pageNum={index + 1}
              total={articles.length}
              onReadMore={setModalArticle}
            />
          ))}
        </HTMLFlipBook>
      </div>
      
      {modalArticle && (
        <div className="modal-overlay" onMouseUp={() => setModalArticle(null)}>
          <div className="modal-content" onMouseUp={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalArticle.headline}</h2>
              <button className="close-btn" onMouseUp={() => setModalArticle(null)}>×</button>
            </div>
            <div className="modal-meta">
              <div className="modal-date">{modalArticle.date}</div>
              <div className="modal-source">{modalArticle.source}</div>
            </div>
            <div className="modal-body">
              <div className="image-container" style={{ marginBottom: '15px' }}>
                <img
                  src={modalArticle.img || DEFAULT_IMG}
                  alt="Story Visual"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
                />
              </div>
              {modalArticle.content}
            </div>
            <button className="modal-close-btn" onMouseUp={() => setModalArticle(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

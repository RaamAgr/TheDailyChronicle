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

// Fetch news articles from API with proper pagination
const fetchNews = async (limit = 50, maxId?: number, uniqueStory = false) => {
  // Build URL with proper pagination
  let url = `${API_BASE}/articles?limit=${limit}`;
  if (maxId) {
    url += `&max_id=${maxId}`;
  }
  if (uniqueStory) {
    url += `&unique_story=true`;
  }

  try {
    console.log(`Fetching ${limit} articles${maxId ? ` with max_id=${maxId}` : ''}${uniqueStory ? ' (unique stories)' : ''}`);
    const response = await fetch(url, {
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
      return [];
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
    
    return articles;
  } catch (error) {
    console.error('Failed to fetch news:', error);
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
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.modal-body p {
  margin-bottom: 15px;
  text-align: justify;
}

.full-coverage-btn {
  padding: 10px 20px;
  background: rgba(26, 26, 26, 0.9);
  border: none;
  border-radius: 12px;
  color: #f5f3ed;
  font-size: 12px;
  font-family: 'Playfair Display', serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin: 20px auto 10px auto;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 120px;
}

.full-coverage-btn:hover {
  background: rgba(26, 26, 26, 1);
  transform: scale(1.05);
}

.refresh-btn {
  position: fixed;
  bottom: calc(50vh - min(300px, 42.5vh) - 50px);
  right: calc(50vw - min(200px, 45vw));
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  color: #666;
  cursor: pointer;
  z-index: 100;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  color: #333;
  transform: scale(1.05);
}

.menu-dropdown {
  position: fixed;
  bottom: calc(50vh - min(300px, 42.5vh) - 5px);
  right: calc(50vw - min(200px, 45vw));
  background: rgba(26, 26, 26, 0.9);
  border-radius: 8px;
  padding: 8px 0;
  z-index: 101;
  min-width: 120px;
  backdrop-filter: blur(10px);
}

.menu-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  background: none;
  border: none;
  color: #f5f3ed;
  font-size: 12px;
  font-family: 'Playfair Display', serif;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.feed-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 4px 8px;
  color: #333;
  cursor: pointer;
  z-index: 100;
  font-size: 9px;
  font-family: 'Playfair Display', serif;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.feed-toggle:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.feed-toggle .active {
  color: #1a1a1a;
  opacity: 1;
}

.feed-toggle .inactive {
  color: #999;
  opacity: 0.7;
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
  
  .refresh-btn {
    bottom: calc(50vh - 42.5vh - 50px);
    right: calc(50vw - 45vw);
  }
  
  .menu-dropdown {
    bottom: calc(50vh - 42.5vh - 5px);
    right: calc(50vw - 45vw);
  }
}
`;

const NewspaperPage = React.memo(React.forwardRef<HTMLDivElement, { article: any, pageNum: number, total: number, onReadMore: (article: any) => void }>(  ({ article, pageNum, total, onReadMore }, ref) => {
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
));

function App() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uniqueMode, setUniqueMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [modalArticle, setModalArticle] = useState<any>(null);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const flipBookRef = useRef<any>(null);
  const totalPagesRef = useRef(0);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Fetch related articles for timeline
  const fetchRelatedArticles = async (headline: string) => {
    try {
      const allArticles = await fetchNews(200, undefined, false);
      const related = allArticles.filter(article => 
        article.headline.toLowerCase().includes(headline.split(' ')[0].toLowerCase()) ||
        article.headline.toLowerCase().includes(headline.split(' ')[1]?.toLowerCase() || '')
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setRelatedArticles(related);
    } catch (error) {
      console.error('Error fetching related articles:', error);
    }
  };

  // Handle share article
  const handleShare = async (article: any) => {
    const shareText = `${article.headline}\n${article.source}`;
    
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({
          title: article.headline,
          text: shareText
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          alert('Could not share article');
        }
      }
    } else {
      // Fallback: copy to clipboard
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Article copied to clipboard!');
      } catch (error) {
        alert('Could not copy article');
      }
      document.body.removeChild(textArea);
    }
  };

  // Handle read more with related articles fetch
  const handleReadMore = (article: any) => {
    setModalArticle(article);
    setShowTimeline(false);
    fetchRelatedArticles(article.headline);
  };

  // Load more articles using max_id pagination
  const loadMoreArticles = async () => {
    if (articles.length === 0 || loadingMore) return;
    
    setLoadingMore(true);
    const lastArticleId = articles[articles.length - 1].id;
    const maxId = lastArticleId - 1;
    
    try {
      const moreArticles = await fetchNews(50, maxId, uniqueMode);
      if (moreArticles.length > 0) {
        // Use functional update to prevent re-render flicker
        setArticles(prev => {
          const newArticles = [...prev, ...moreArticles];
          setTimeout(() => preloadImages(moreArticles), 200);
          return newArticles;
        });
      }
    } catch (error) {
      console.error('Error loading more articles:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Load news articles on mount
  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        // Load initial articles
        const newsArticles = await fetchNews(20, undefined, uniqueMode);
        setArticles(newsArticles);
        
        // Preload initial images silently in background
        setTimeout(() => preloadImages(newsArticles), 500);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, [uniqueMode]);

  const handleFlip = (e: any) => {
    const pageNum = e.data + 1;
    const totalPages = articles.length;
    
    if (loadingMore) return;
    
    if ((totalPages === 20 && pageNum >= 5) || (totalPages > 20 && pageNum >= totalPages - 25)) {
      loadMoreArticles();
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
      <button className="refresh-btn" onClick={() => setShowMenu(!showMenu)} title="Menu">
        ⋯
      </button>
      {showMenu && (
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            window.location.reload(true);
          }}>
            Refresh
          </button>
          <button className="menu-item" onClick={() => {
            setUniqueMode(!uniqueMode);
            setShowMenu(false);
          }}>
            {uniqueMode ? 'Show All Stories' : 'Show Unique Stories'}
          </button>
          <button className="menu-item" onClick={() => {
            if (articles.length > 0) {
              handleShare(articles[0]);
            }
            setShowMenu(false);
          }}>
            Share Article
          </button>
        </div>
      )}
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
          key={`flipbook-${uniqueMode}`}
        >
          {articles.map((article, index) => (
            <NewspaperPage
              key={article.id}
              article={article}
              pageNum={index + 1}
              total={totalPagesRef.current}
              onReadMore={handleReadMore}
            />
          ))}
        </HTMLFlipBook>
      </div>
      
      {modalArticle && (
        <div className="modal-overlay" onClick={() => setModalArticle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalArticle.headline}</h2>
              <button className="close-btn" onClick={() => setModalArticle(null)}>×</button>
            </div>
            <div className="modal-meta">
              <div className="modal-date">{modalArticle.date}</div>
              <div className="modal-source">{modalArticle.source}</div>
            </div>
            <div className="modal-body" ref={modalBodyRef}>
              {showTimeline ? (
                <div>
                  <h3 style={{ marginBottom: '20px', textAlign: 'center', color: '#1a1a1a' }}>Timeline Coverage</h3>
                  {relatedArticles.map((article, index) => (
                    <div key={article.id} style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '5px' }}>{article.date}</div>
                      <div style={{ fontSize: '9px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>{article.source}</div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#1a1a1a' }}>{article.headline}</h4>
                      <div style={{ marginBottom: '10px' }}>
                        <img
                          src={article.img || DEFAULT_IMG}
                          alt="Story Visual"
                          style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#333' }}>{article.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="image-container" style={{ marginBottom: '15px' }}>
                    <img
                      src={modalArticle.img || DEFAULT_IMG}
                      alt="Story Visual"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                  {modalArticle.content}
                </div>
              )}
            </div>
            <button className="modal-close-btn" onClick={() => setModalArticle(null)}>
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

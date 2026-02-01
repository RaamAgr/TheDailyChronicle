import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import HTMLFlipBook from 'react-pageflip';

const DEFAULT_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5ld3NwYXBlciBJbWFnZTwvdGV4dD48L3N2Zz4=';

const API_BASE = 'https://news-scraper-api-ai-am7i.onrender.com';

// Fetch news articles from API
const fetchNews = async (limit = 50) => {
  try {
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
    
    return data.articles.map((article: any) => ({
      id: article.id,
      headline: article.title,
      date: new Date(article.scraped_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      img: article.image_url === 'No image found' ? null : article.image_url,
      content: article.content
    }));
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
  margin-bottom: 15px;
  font-style: italic;
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
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
}

.modal-body p {
  margin-bottom: 15px;
  text-align: justify;
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
          
          <div className="image-container">
            <img
              src={article.img || DEFAULT_IMG}
              alt="Story Visual"
              draggable="false"
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
  const [currentLimit, setCurrentLimit] = useState(20);
  const [modalArticle, setModalArticle] = useState<any>(null);
  const flipBookRef = useRef<any>(null);

  // Load more articles when needed
  const loadMoreArticles = async (newLimit: number) => {
    if (newLimit <= currentLimit) return;
    
    try {
      const moreArticles = await fetchNews(newLimit);
      if (moreArticles.length > 0) {
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
        const newsArticles = await fetchNews(20);
        setArticles(newsArticles);
        setCurrentLimit(20);
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
    
    if (pageNum >= 11 && currentLimit < 50) {
      loadMoreArticles(50);
    } else if (pageNum >= 31 && currentLimit < 100) {
      loadMoreArticles(100);
    } else if (pageNum >= 71 && currentLimit < 200) {
      loadMoreArticles(200);
    } else if (pageNum >= 151 && currentLimit < 400) {
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
        <div className="modal-overlay" onClick={() => setModalArticle(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalArticle.headline}</h2>
              <button className="close-btn" onClick={() => setModalArticle(null)}>×</button>
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
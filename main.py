from fastapi import FastAPI
from app.database import Base, engine, SessionLocal
from app.models import Article
from app.news import sample_articles
from app.ai import summarize_text

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "AI News Project is running"}

@app.post("/load-news")
def load_news():
    db = SessionLocal()

    for item in sample_articles:
        summary = summarize_text(item["content"])

        article = Article(
            title=item["title"],
            url=item["url"],
            content=item["content"],
            summary=summary
        )

        db.add(article)

    db.commit()
    db.close()

    return {"message": "News loaded and summarized"}

@app.get("/articles")
def get_articles():
    db = SessionLocal()
    articles = db.query(Article).all()
    db.close()

    return articles
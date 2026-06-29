from sqlalchemy import Column, Integer, String, Text
from ai_news_project.database import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    url = Column(String)
    content = Column(Text)
    summary = Column(Text)
    


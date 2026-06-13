from app.db.database import Base, engine

def init_db():
    # Creates all tables if they don't exist
    Base.metadata.create_all(bind=engine)
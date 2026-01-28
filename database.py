
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session

class Machine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    mac_address: str
    ip_address: str = Field(default="")
    password: str
    category: str = Field(default="Uncategorized")
    wol_enabled: bool = Field(default=True)
    order: int = Field(default=0)

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    order: int = Field(default=0)

sqlite_file_name = "data/database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

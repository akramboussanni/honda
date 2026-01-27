
from fastapi import FastAPI, HTTPException, Depends, Request
from sqlmodel import Session, select
from database import engine, Machine, create_db_and_tables, get_session
from wakeonlan import send_magic_packet
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import os

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse
import secrets

security = HTTPBasic()

def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    # You can change these environment variables or hardcode for simplicity
    correct_username = os.getenv("ADMIN_USER", "admin")
    correct_password = os.getenv("ADMIN_PASSWORD", "admin")
    
    is_correct_username = secrets.compare_digest(credentials.username, correct_username)
    is_correct_password = secrets.compare_digest(credentials.password, correct_password)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Pydantic models for request body
class MachineCreate(BaseModel):
    name: str
    mac_address: str
    password: str

class WakeRequest(BaseModel):
    machine_id: int
    password: str

@app.get("/admin", response_class=HTMLResponse)
def admin_dashboard(username: str = Depends(get_current_username)):
    with open("admin_dashboard.html", "r") as f:
        return f.read()

@app.post("/admin/machines", status_code=201)
def create_machine(machine: MachineCreate, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    db_machine = Machine.from_orm(machine)
    session.add(db_machine)
    session.commit()
    session.refresh(db_machine)
    return db_machine

@app.get("/machines")
def read_machines(session: Session = Depends(get_session)):
    machines = session.exec(select(Machine)).all()
    return [{"id": m.id, "name": m.name} for m in machines]

@app.delete("/admin/machines/{machine_id}")
def delete_machine(machine_id: int, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    machine = session.get(Machine, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    session.delete(machine)
    session.commit()
    return {"ok": True}

@app.post("/wake")
@limiter.limit("5/minute")
def wake_machine(request: Request, wake_req: WakeRequest, session: Session = Depends(get_session)):
    machine = session.get(Machine, wake_req.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    if machine.password != wake_req.password:
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    send_magic_packet(machine.mac_address)
    return {"message": f"Wake-on-LAN packet sent to {machine.name}"}

# Static files
if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/", StaticFiles(directory="static", html=True), name="static")

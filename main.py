
from fastapi import FastAPI, HTTPException, Depends, Request
from sqlmodel import Session, select
from database import engine, Machine, Category, create_db_and_tables, get_session
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

machine_status = {}

try:
    from scapy.all import srp, Ether, ARP
except ImportError:
    print("Scapy not installed or pcap missing. Network discovery will fail.")
    def srp(*args, **kwargs): raise ImportError("Scapy not available")
    def Ether(*args, **kwargs): pass
    def ARP(*args, **kwargs): pass
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
import sys
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "CHANGE-ME-PLEASE":
    print("CRITICAL ERROR: SECRET_KEY env var is default. Please set a secure SECRET_KEY.")
    sys.exit(1)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
COOKIE_NAME = "access_token"

class LoginRequest(BaseModel):
    username: str
    password: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_username(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        if request.url.path.startswith("/admin") and request.method == "GET":
             raise HTTPException(status_code=307, detail="Redirect to login")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
         if request.url.path.startswith("/admin") and request.method == "GET":
             raise HTTPException(status_code=307, detail="Redirect to login")
         raise HTTPException(status_code=401, detail="Invalid token")
        
    return username

@app.post("/login")
def login(creds: LoginRequest):
    correct_username = os.getenv("ADMIN_USER", "admin")
    correct_password = os.getenv("ADMIN_PASSWORD", "admin")
    
    is_correct_username = secrets.compare_digest(creds.username, correct_username)
    is_correct_password = secrets.compare_digest(creds.password, correct_password)
    
    if is_correct_username and is_correct_password:
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": correct_username}, expires_delta=access_token_expires
        )
        return JSONResponse(content={"ok": True}, headers={
            "Set-Cookie": f"{COOKIE_NAME}={access_token}; HttpOnly; Path=/; Max-Age={ACCESS_TOKEN_EXPIRE_MINUTES * 60}; SameSite=Lax"
        })
    else:
        raise HTTPException(status_code=401, detail="Incorrect credentials")

@app.post("/logout")
def logout():
    return JSONResponse(content={"ok": True}, headers={
        "Set-Cookie": f"{COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
    })

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 307:
         return RedirectResponse(url="/login.html")
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()

class MachineCreate(BaseModel):
    name: str
    mac_address: str
    ip_address: str = ""
    password: str = ""
    category: str = "Uncategorized"
    wol_enabled: bool = True

class WakeRequest(BaseModel):
    machine_id: int
    password: str

@app.get("/admin", response_class=HTMLResponse)
def admin_dashboard(username: str = Depends(get_current_username)):
    with open("admin_dashboard.html", "r") as f:
        return f.read()

@app.get("/admin/discover")
def discover_devices(request: Request, subnet: str = "", username: str = Depends(get_current_username), session: Session = Depends(get_session)):
    import socket
    
    client_ip = request.client.host if request.client else None
    client_hostname = None
    if client_ip:
        try:
            client_hostname = socket.gethostbyaddr(client_ip)[0]
        except (socket.herror, socket.gaierror):
            client_hostname = client_ip
    
    server_hostname = socket.gethostname()
    
    if subnet:
        subnets_to_scan = [subnet]
    else:
        subnets_to_scan = ["192.168.1.0/24", "192.168.0.0/24", "192.168.2.0/24", "10.0.0.0/24"]
    
    existing_macs = {m.mac_address.lower() for m in session.exec(select(Machine)).all()}
    
    devices_by_mac = {}
    
    for target_subnet in subnets_to_scan:
        try:
            ans, unans = srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=target_subnet), timeout=2, verbose=0)
            
            for sent, received in ans:
                ip = received.psrc
                mac = received.hwsrc.lower()
                
                if mac in devices_by_mac:
                    continue
                
                try:
                    hostname = socket.gethostbyaddr(ip)[0]
                except (socket.herror, socket.gaierror):
                    hostname = ip
                
                is_managed = mac in existing_macs

                is_you = (hostname == client_hostname) or (hostname == server_hostname)
                
                devices_by_mac[mac] = {
                    'ip': ip, 
                    'mac': received.hwsrc, 
                    'name': hostname, 
                    'is_managed': is_managed,
                    'is_you': is_you
                }
        except Exception as e:
            print(f"Discovery error for {target_subnet}: {e}")
            continue
    
    return list(devices_by_mac.values())

@app.post("/admin/machines", status_code=201)
def create_machine(machine: MachineCreate, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    existing = session.exec(select(Machine).where(Machine.mac_address == machine.mac_address)).first()
    if existing:
        raise HTTPException(status_code=409, detail="A device with this MAC address already exists")
    
    db_machine = Machine.from_orm(machine)
    session.add(db_machine)
    session.commit()
    session.refresh(db_machine)
    return db_machine

@app.get("/machines")
def read_machines(session: Session = Depends(get_session)):
    machines = session.exec(select(Machine).order_by(Machine.category, Machine.order)).all()
    return [{
        "id": m.id, 
        "name": m.name, 
        "mac": m.mac_address, 
        "category": m.category,
        "wol_enabled": m.wol_enabled,
        "online": machine_status.get(m.id)
    } for m in machines]

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

@app.get("/admin/categories")
def get_categories(session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    categories = session.exec(select(Category).order_by(Category.order)).all()
    return [{"id": c.id, "name": c.name, "order": c.order} for c in categories]

@app.post("/admin/categories", status_code=201)
def create_category(name: str, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    existing = session.exec(select(Category).where(Category.name == name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    category = Category(name=name)
    session.add(category)
    session.commit()
    session.refresh(category)
    return {"id": category.id, "name": category.name}

@app.delete("/admin/categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    session.delete(category)
    session.commit()
    return {"ok": True}

class CategoryUpdate(BaseModel):
    name: str = None
    order: int = None

@app.patch("/admin/categories/{category_id}")
def update_category(category_id: int, updates: CategoryUpdate, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if updates.name is not None:
        existing = session.exec(select(Category).where(Category.name == updates.name, Category.id != category_id)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Category name already exists")
        category.name = updates.name
    
    if updates.order is not None:
        category.order = updates.order
    
    session.add(category)
    session.commit()
    session.refresh(category)
    return {"id": category.id, "name": category.name, "order": category.order}

class ReorderRequest(BaseModel):
    items: list[dict]  # [{"id": 1, "order": 0}, {"id": 2, "order": 1}, ...]

@app.post("/admin/categories/reorder")
def reorder_categories(req: ReorderRequest, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    for item in req.items:
        category = session.get(Category, item["id"])
        if category:
            category.order = item["order"]
            session.add(category)
    session.commit()
    return {"ok": True}

@app.post("/admin/machines/reorder")
def reorder_machines(req: ReorderRequest, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    for item in req.items:
        machine = session.get(Machine, item["id"])
        if machine:
            machine.order = item["order"]
            session.add(machine)
    session.commit()
    return {"ok": True}

class MachineUpdate(BaseModel):
    name: str = None
    mac_address: str = None
    ip_address: str = None
    password: str = None
    category: str = None
    wol_enabled: bool = None

@app.patch("/admin/machines/{machine_id}")
def update_machine(machine_id: int, updates: MachineUpdate, session: Session = Depends(get_session), username: str = Depends(get_current_username)):
    machine = session.get(Machine, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    if updates.name is not None:
        machine.name = updates.name
    if updates.mac_address is not None:
        machine.mac_address = updates.mac_address
    if updates.ip_address is not None:
        machine.ip_address = updates.ip_address
    if updates.password is not None:
        machine.password = updates.password
    if updates.category is not None:
        machine.category = updates.category
    if updates.wol_enabled is not None:
        machine.wol_enabled = updates.wol_enabled
    
    session.add(machine)
    session.commit()
    session.refresh(machine)
    return {"id": machine.id, "name": machine.name}

def _ping_single_machine(machine: Machine, session: Session) -> dict:
    """Helper function to ping a single machine and update its status"""
    import subprocess
    import platform
    
    ip = machine.ip_address
    
    if not ip:
        try:
            if platform.system().lower() == "windows":
                result = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=2)
            else:
                result = subprocess.run(["arp", "-n"], capture_output=True, text=True, timeout=2)
            
            for line in result.stdout.split("\n"):
                mac_normalized = machine.mac_address.lower().replace(":", "-")
                if mac_normalized in line.lower() or machine.mac_address.lower() in line.lower():
                    parts = line.split()
                    if parts:
                        for part in parts:
                            if "." in part and part.count(".") == 3:
                                ip = part
                                machine.ip_address = ip
                                session.add(machine)
                                session.commit()
                                break
                    if ip:
                        break
        except Exception as e:
            print(f"ARP lookup failed for {machine.name}: {e}")
    
    if ip:
        try:
            param = "-n" if platform.system().lower() == "windows" else "-c"
            ping_result = subprocess.run(["ping", param, "1", "-w", "1000", ip], capture_output=True, timeout=3)
            is_online = ping_result.returncode == 0
            machine_status[machine.id] = is_online
            return {"online": is_online, "ip": ip}
        except Exception as e:
            machine_status[machine.id] = False
            return {"online": False, "error": str(e), "ip": ip}
    else:
        machine_status[machine.id] = False
        return {"online": False, "error": "No IP address available"}

@app.post("/ping/{machine_id}")
def ping_machine(machine_id: int, session: Session = Depends(get_session)):
    machine = session.get(Machine, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    return _ping_single_machine(machine, session)

@app.post("/ping/all")
async def ping_all_machines(session: Session = Depends(get_session)):
    """Ping all machines and return aggregated results"""
    machines = session.exec(select(Machine)).all()
    results = []
    
    for machine in machines:
        result = _ping_single_machine(machine, session)
        results.append({
            "id": machine.id,
            "name": machine.name,
            **result
        })
    
    online_count = sum(1 for r in results if r.get("online"))
    return {
        "total": len(results),
        "online": online_count,
        "offline": len(results) - online_count,
        "results": results
    }

if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/", StaticFiles(directory="static", html=True), name="static")

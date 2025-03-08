from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import asyncpg
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import bcrypt
import uvicorn
import httpx
import re

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "nEdAj5u6DJKjsuo4AR7k1fVdgYL7AcSl"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 30


class UserCreate(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


@app.on_event("startup")
async def startup():
    app.state.db = await asyncpg.create_pool(
        user='postgres',
        password='hackujstat',
        database='hackujstat',
        host='localhost',
        port=5432
    )
    async with app.state.db.acquire() as connection:
        await connection.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash BYTEA NOT NULL
            )
        ''')




def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def is_valid_email(email):
    return bool(re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email))


async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        if token.startswith("Bearer "):
            token = token[7:]

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Endpoints
@app.post("/register")
async def register(user: UserCreate, response: Response):
    if not is_valid_email(user.username):
        raise HTTPException(status_code=400, detail="Email not valid")
    async with app.state.db.acquire() as connection:
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), salt)

        try:
            await connection.execute(
                "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
                user.username, hashed_password
            )
            access_token = create_access_token(data={"sub": user.username})
            response.set_cookie(
                key="access_token",
                value=f"Bearer {access_token}",
                httponly=False,
                max_age=ACCESS_TOKEN_EXPIRE * 60,
                expires=ACCESS_TOKEN_EXPIRE * 60,
                path="/"
            )
            return {"message": "User created successfully"}
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Username already exists")


@app.post("/login")
async def login(user: UserLogin, response: Response):
    if not is_valid_email(user.username):
        raise HTTPException(status_code=400, detail="Email not valid")
    async with app.state.db.acquire() as connection:
        result = await connection.fetchrow(
            "SELECT * FROM users WHERE username=$1",
            user.username
        )

        if not result or not bcrypt.checkpw(
                user.password.encode('utf-8'),
                result['password_hash']
        ):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token(data={"sub": user.username})
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=False,
            max_age=ACCESS_TOKEN_EXPIRE * 60,
            expires=ACCESS_TOKEN_EXPIRE * 60,
            path="/"
        )
        return {"message": "Login successful"}


@app.get("/getByVin/{vin}")
async def getByVin(vin: str, current_user: str = Depends(get_current_user)):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM inspection_records WHERE vehicle_vin=$1", vin
        )
    return result


@app.get("/getByVinPublic/{vin}")
async def getByVinPublic(vin: str):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM inspection_records WHERE vehicle_vin=$1", vin
        )
    return result


@app.get("/getDefectsByInspectionId/{InspectionId}")
async def getDefectsByInspectionId(InspectionId: str, current_user: str = Depends(get_current_user)):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT severity FROM public.inspection_defects WHERE inspection_id=$1", int(InspectionId)
        )
    return {"count": len(result), "result": result}


@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logout successful"}


class VehicleData(BaseModel):
    vehicle_vin: str


@app.post("/addVehicleToUser")
async def add_vehicle_to_user(vehicle_data: VehicleData, response: Response,  current_user: str = Depends(get_current_user)):
    async with app.state.db.acquire() as connection:
        try:
            user = await connection.fetchrow(
                "SELECT id FROM public.users WHERE username=$1", current_user
            )
            await connection.execute(
                "INSERT INTO user_cars (user_id, vehicle_vin) VALUES ($1, $2)",
                user["id"], vehicle_data.vehicle_vin
            )
            return {"message": "Vehicle added"}
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Error while adding vehicle")


@app.post("/removeVehicleFromUser")
async def removeVehicleFromUser(vehicle_data: VehicleData, response: Response,  current_user: str = Depends(get_current_user)):
    async with app.state.db.acquire() as connection:
        try:
            await connection.execute(
                "DELETE FROM user_cars WHERE vehicle_vin = $1",
                 vehicle_data.vehicle_vin
            )
            return {"message": "Vehicle removed"}
        except asyncpg.exceptions.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Error while removing vehicle")


@app.get("/getUserVehicles")
async def getUserVehicles(current_user: str = Depends(get_current_user)):
    async with app.state.db.acquire() as connection:
        user = await connection.fetchrow(
            "SELECT id FROM public.users WHERE username=$1", current_user
        )
        result = await connection.fetch(
            "SELECT * FROM user_cars WHERE user_id=$1", user["id"]
        )
    return result


@app.get("/getByVinTest/{vin}")
async def getByVinTest(vin: str):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM inspection_records WHERE vehicle_vin=$1", vin
        )
    return [dict(record) for record in result]


async def fetch_vin_data(vin: str):
    url = f"http://localhost:8000/getByVinTest/{vin}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()


@app.get("/getCars")
async def getByVinPublic():
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM user_cars"
        )
    return [dict(record) for record in result]


@app.get("/getUserID/{vin}")
async def getUserID(vin: str):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM user_cars WHERE vehicle_vin=$1", vin
        )
    return [dict(record) for record in result]


@app.get("/getUserMail/{userID}")
async def getUserID(userID: int):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT username FROM public.users WHERE id = $1", userID
        )
    return [dict(record) for record in result]


@app.get("/getSTKData/{number}")
async def getUserID(number: str):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM public.stations WHERE number = $1", number
        )
    return [dict(record) for record in result]


@app.get("/getSTKByRegion/{region}")
async def getSTKByRegion(region: str):
    async with app.state.db.acquire() as connection:
        result = await connection.fetch(
            "SELECT * FROM public.stations WHERE kraj = $1", region
        )
    return [dict(record) for record in result]

uvicorn.run(app, port=8000, host='0.0.0.0')

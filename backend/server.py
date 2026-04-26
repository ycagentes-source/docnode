from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import bcrypt
import jwt
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24 * 7  # 7 days for mobile UX simplicity
REFRESH_TOKEN_DAYS = 30

DOCUMENT_TYPES = {
    "cpf", "rg", "cnh", "passaporte", "certidao", "contrato", "exame", "vacina",
    "documento_carro", "documento_imovel", "garantia_produto", "boleto",
    "matricula_escolar", "outro",
}
PARENTESCO_VALUES = {"eu", "conjuge", "filho", "filha", "pai", "mae", "avo", "avo_f", "outro"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("docnode")


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": now_utc() + timedelta(days=REFRESH_TOKEN_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False, samesite="lax",
                        max_age=REFRESH_TOKEN_DAYS * 86400, path="/")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str = "user"
    created_at: datetime


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class UpdateProfileIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)


class FamiliarIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    parentesco: str
    data_nascimento: Optional[str] = None  # ISO date string
    avatar_base64: Optional[str] = None
    observacoes: Optional[str] = None


class FamiliarOut(BaseModel):
    id: str
    user_id: str
    nome: str
    parentesco: str
    data_nascimento: Optional[str] = None
    avatar_base64: Optional[str] = None
    observacoes: Optional[str] = None
    documentos_count: int = 0
    created_at: datetime
    updated_at: datetime


class LembreteIn(BaseModel):
    dias_antes: int
    ativo: bool = True


class DocumentoIn(BaseModel):
    nome: str = Field(min_length=1, max_length=160)
    tipo: str
    familiar_id: Optional[str] = None
    arquivo_base64: Optional[str] = None
    arquivo_nome: Optional[str] = None
    arquivo_tipo: Optional[str] = None  # mime type, e.g. application/pdf
    data_emissao: Optional[str] = None
    data_vencimento: Optional[str] = None
    observacoes: Optional[str] = None
    lembretes: List[LembreteIn] = Field(default_factory=list)


class DocumentoOut(BaseModel):
    id: str
    user_id: str
    familiar_id: Optional[str]
    familiar_nome: Optional[str] = None
    nome: str
    tipo: str
    arquivo_nome: Optional[str] = None
    arquivo_tipo: Optional[str] = None
    has_arquivo: bool = False
    data_emissao: Optional[str] = None
    data_vencimento: Optional[str] = None
    observacoes: Optional[str] = None
    status: str
    lembretes: List[LembreteIn] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class DocumentoDetail(DocumentoOut):
    arquivo_base64: Optional[str] = None


class DashboardOut(BaseModel):
    user_name: str
    familiares_count: int
    documentos_count: int
    documentos_vencidos: int
    documentos_vencendo: int
    documentos_sem_vencimento: int
    proximos_vencimentos: List[DocumentoOut]


class DeleteFamiliarIn(BaseModel):
    apagar_documentos: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_status(data_vencimento: Optional[str]) -> str:
    if not data_vencimento:
        return "sem_vencimento"
    try:
        dt = datetime.fromisoformat(data_vencimento)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except Exception:
        return "sem_vencimento"
    delta = (dt.date() - now_utc().date()).days
    if delta < 0:
        return "vencido"
    if delta <= 30:
        return "vencendo_em_breve"
    return "ativo"


def serialize_user(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        role=doc.get("role", "user"),
        created_at=doc["created_at"],
    )


def serialize_familiar(doc: dict, documentos_count: int = 0) -> FamiliarOut:
    return FamiliarOut(
        id=doc["id"],
        user_id=doc["user_id"],
        nome=doc["nome"],
        parentesco=doc["parentesco"],
        data_nascimento=doc.get("data_nascimento"),
        avatar_base64=doc.get("avatar_base64"),
        observacoes=doc.get("observacoes"),
        documentos_count=documentos_count,
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def serialize_documento(doc: dict, familiar_nome: Optional[str] = None, include_arquivo: bool = False):
    payload = dict(
        id=doc["id"],
        user_id=doc["user_id"],
        familiar_id=doc.get("familiar_id"),
        familiar_nome=familiar_nome,
        nome=doc["nome"],
        tipo=doc["tipo"],
        arquivo_nome=doc.get("arquivo_nome"),
        arquivo_tipo=doc.get("arquivo_tipo"),
        has_arquivo=bool(doc.get("arquivo_base64")),
        data_emissao=doc.get("data_emissao"),
        data_vencimento=doc.get("data_vencimento"),
        observacoes=doc.get("observacoes"),
        status=compute_status(doc.get("data_vencimento")),
        lembretes=[LembreteIn(**l) for l in doc.get("lembretes", [])],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )
    if include_arquivo:
        payload["arquivo_base64"] = doc.get("arquivo_base64")
        return DocumentoDetail(**payload)
    return DocumentoOut(**payload)


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ---------------------------------------------------------------------------
# App + Router
# ---------------------------------------------------------------------------

app = FastAPI(title="Docnode API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "Docnode", "company": "Keynode", "version": "1.0.0"}


# -------------------- AUTH --------------------

@api.post("/auth/register", response_model=UserPublic)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.users.insert_one(user)
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    response.headers["x-access-token"] = access
    return serialize_user(user)


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response, request: Request):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until") and attempt["locked_until"] > now_utc():
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em alguns minutos.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1},
             "$set": {"locked_until": now_utc() + timedelta(minutes=15) if (attempt and attempt.get("count", 0) + 1 >= 5) else None}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {
        "user": serialize_user(user).model_dump(),
        "access_token": access,
        "refresh_token": refresh,
    }


@api.post("/auth/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token ausente")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    new_access = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", new_access, httponly=True, secure=False, samesite="lax",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    return {"access_token": new_access}


@api.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return ok (do not leak if email exists)
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "expires_at": now_utc() + timedelta(hours=1),
            "used": False,
            "created_at": now_utc(),
        })
        # MVP: simulate by returning token (would normally email it)
        logger.info(f"[forgot-password] token for {email}: {token}")
        return {"ok": True, "reset_token": token, "message": "Token gerado. Em produção, será enviado por e-mail."}
    return {"ok": True, "message": "Se o e-mail existir, instruções foram enviadas."}


@api.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    expires_at = rec["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    await db.users.update_one({"id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(payload.new_password),
                                        "updated_at": now_utc()}})
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.put("/auth/profile", response_model=UserPublic)
async def update_profile(payload: UpdateProfileIn, current_user: dict = Depends(get_current_user)):
    update = {"updated_at": now_utc()}
    if payload.name is not None:
        update["name"] = payload.name.strip()
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return serialize_user(user)


@api.post("/auth/change-password")
async def change_password(payload: ChangePasswordIn, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    await db.users.update_one({"id": current_user["id"]},
                              {"$set": {"password_hash": hash_password(payload.new_password),
                                        "updated_at": now_utc()}})
    return {"ok": True}


@api.delete("/auth/account")
async def delete_account(response: Response, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    await db.documentos.delete_many({"user_id": uid})
    await db.familiares.delete_many({"user_id": uid})
    await db.password_reset_tokens.delete_many({"user_id": uid})
    await db.users.delete_one({"id": uid})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


# -------------------- FAMILIARES --------------------

async def _documentos_count_by_familiar(user_id: str) -> dict:
    pipeline = [
        {"$match": {"user_id": user_id, "familiar_id": {"$ne": None}}},
        {"$group": {"_id": "$familiar_id", "count": {"$sum": 1}}},
    ]
    counts = {}
    async for row in db.documentos.aggregate(pipeline):
        counts[row["_id"]] = row["count"]
    return counts


@api.get("/familiares", response_model=List[FamiliarOut])
async def list_familiares(current_user: dict = Depends(get_current_user)):
    counts = await _documentos_count_by_familiar(current_user["id"])
    out = []
    cursor = db.familiares.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", 1)
    async for doc in cursor:
        out.append(serialize_familiar(doc, counts.get(doc["id"], 0)))
    return out


@api.post("/familiares", response_model=FamiliarOut)
async def create_familiar(payload: FamiliarIn, current_user: dict = Depends(get_current_user)):
    if payload.parentesco not in PARENTESCO_VALUES:
        raise HTTPException(status_code=400, detail="Parentesco inválido")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "nome": payload.nome.strip(),
        "parentesco": payload.parentesco,
        "data_nascimento": payload.data_nascimento,
        "avatar_base64": payload.avatar_base64,
        "observacoes": payload.observacoes,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.familiares.insert_one(doc)
    return serialize_familiar(doc, 0)


@api.get("/familiares/{familiar_id}", response_model=FamiliarOut)
async def get_familiar(familiar_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.familiares.find_one({"id": familiar_id, "user_id": current_user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Familiar não encontrado")
    counts = await _documentos_count_by_familiar(current_user["id"])
    return serialize_familiar(doc, counts.get(familiar_id, 0))


@api.put("/familiares/{familiar_id}", response_model=FamiliarOut)
async def update_familiar(familiar_id: str, payload: FamiliarIn, current_user: dict = Depends(get_current_user)):
    if payload.parentesco not in PARENTESCO_VALUES:
        raise HTTPException(status_code=400, detail="Parentesco inválido")
    update = {
        "nome": payload.nome.strip(),
        "parentesco": payload.parentesco,
        "data_nascimento": payload.data_nascimento,
        "avatar_base64": payload.avatar_base64,
        "observacoes": payload.observacoes,
        "updated_at": now_utc(),
    }
    res = await db.familiares.update_one({"id": familiar_id, "user_id": current_user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Familiar não encontrado")
    doc = await db.familiares.find_one({"id": familiar_id}, {"_id": 0})
    counts = await _documentos_count_by_familiar(current_user["id"])
    return serialize_familiar(doc, counts.get(familiar_id, 0))


@api.delete("/familiares/{familiar_id}")
async def delete_familiar(familiar_id: str, payload: DeleteFamiliarIn,
                          current_user: dict = Depends(get_current_user)):
    fam = await db.familiares.find_one({"id": familiar_id, "user_id": current_user["id"]})
    if not fam:
        raise HTTPException(status_code=404, detail="Familiar não encontrado")
    if payload.apagar_documentos:
        await db.documentos.delete_many({"familiar_id": familiar_id, "user_id": current_user["id"]})
    else:
        await db.documentos.update_many(
            {"familiar_id": familiar_id, "user_id": current_user["id"]},
            {"$set": {"familiar_id": None, "updated_at": now_utc()}},
        )
    await db.familiares.delete_one({"id": familiar_id})
    return {"ok": True}


# -------------------- DOCUMENTOS --------------------

async def _resolve_familiar_name(familiar_id: Optional[str], user_id: str) -> Optional[str]:
    if not familiar_id:
        return None
    fam = await db.familiares.find_one({"id": familiar_id, "user_id": user_id}, {"_id": 0, "nome": 1})
    return fam["nome"] if fam else None


def _validate_documento(payload: DocumentoIn) -> None:
    if payload.tipo not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    for l in payload.lembretes:
        if l.dias_antes not in (7, 15, 30, 60, 90):
            raise HTTPException(status_code=400, detail="Lembrete inválido")


@api.get("/documentos", response_model=List[DocumentoOut])
async def list_documentos(
    current_user: dict = Depends(get_current_user),
    q: Optional[str] = None,
    familiar_id: Optional[str] = None,
    tipo: Optional[str] = None,
    status_filter: Optional[Literal["ativo", "vencendo_em_breve", "vencido", "sem_vencimento"]] = None,
):
    query = {"user_id": current_user["id"]}
    if familiar_id:
        query["familiar_id"] = familiar_id
    if tipo:
        query["tipo"] = tipo
    if q:
        query["$or"] = [
            {"nome": {"$regex": q, "$options": "i"}},
            {"observacoes": {"$regex": q, "$options": "i"}},
            {"tipo": {"$regex": q, "$options": "i"}},
        ]

    fam_map = {}
    cursor = db.familiares.find({"user_id": current_user["id"]}, {"_id": 0, "id": 1, "nome": 1})
    async for f in cursor:
        fam_map[f["id"]] = f["nome"]

    out: List[DocumentoOut] = []
    cursor = db.documentos.find(query, {"_id": 0, "arquivo_base64": 0}).sort("updated_at", -1)
    async for doc in cursor:
        item = serialize_documento(doc, fam_map.get(doc.get("familiar_id")))
        if status_filter and item.status != status_filter:
            continue
        # If user typed q and we want to include familiar name search
        if q and q.lower() not in (item.nome or "").lower() \
                and q.lower() not in (item.observacoes or "").lower() \
                and q.lower() not in (item.tipo or "").lower() \
                and q.lower() not in (item.familiar_nome or "").lower():
            continue
        out.append(item)
    return out


@api.post("/documentos", response_model=DocumentoOut)
async def create_documento(payload: DocumentoIn, current_user: dict = Depends(get_current_user)):
    _validate_documento(payload)
    if payload.familiar_id:
        fam = await db.familiares.find_one({"id": payload.familiar_id, "user_id": current_user["id"]})
        if not fam:
            raise HTTPException(status_code=400, detail="Familiar inválido")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "familiar_id": payload.familiar_id,
        "nome": payload.nome.strip(),
        "tipo": payload.tipo,
        "arquivo_base64": payload.arquivo_base64,
        "arquivo_nome": payload.arquivo_nome,
        "arquivo_tipo": payload.arquivo_tipo,
        "data_emissao": payload.data_emissao,
        "data_vencimento": payload.data_vencimento,
        "observacoes": payload.observacoes,
        "lembretes": [l.model_dump() for l in payload.lembretes],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.documentos.insert_one(doc)
    fam_nome = await _resolve_familiar_name(payload.familiar_id, current_user["id"])
    return serialize_documento(doc, fam_nome)


@api.get("/documentos/{doc_id}", response_model=DocumentoDetail)
async def get_documento(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documentos.find_one({"id": doc_id, "user_id": current_user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    fam_nome = await _resolve_familiar_name(doc.get("familiar_id"), current_user["id"])
    return serialize_documento(doc, fam_nome, include_arquivo=True)


@api.put("/documentos/{doc_id}", response_model=DocumentoOut)
async def update_documento(doc_id: str, payload: DocumentoIn, current_user: dict = Depends(get_current_user)):
    _validate_documento(payload)
    existing = await db.documentos.find_one({"id": doc_id, "user_id": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    if payload.familiar_id:
        fam = await db.familiares.find_one({"id": payload.familiar_id, "user_id": current_user["id"]})
        if not fam:
            raise HTTPException(status_code=400, detail="Familiar inválido")
    update = {
        "familiar_id": payload.familiar_id,
        "nome": payload.nome.strip(),
        "tipo": payload.tipo,
        "data_emissao": payload.data_emissao,
        "data_vencimento": payload.data_vencimento,
        "observacoes": payload.observacoes,
        "lembretes": [l.model_dump() for l in payload.lembretes],
        "updated_at": now_utc(),
    }
    # Replace file only if provided
    if payload.arquivo_base64 is not None:
        update["arquivo_base64"] = payload.arquivo_base64
        update["arquivo_nome"] = payload.arquivo_nome
        update["arquivo_tipo"] = payload.arquivo_tipo

    await db.documentos.update_one({"id": doc_id}, {"$set": update})
    doc = await db.documentos.find_one({"id": doc_id}, {"_id": 0})
    fam_nome = await _resolve_familiar_name(doc.get("familiar_id"), current_user["id"])
    return serialize_documento(doc, fam_nome)


@api.delete("/documentos/{doc_id}")
async def delete_documento(doc_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.documentos.delete_one({"id": doc_id, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return {"ok": True}


@api.delete("/documentos/{doc_id}/arquivo")
async def remove_arquivo(doc_id: str, current_user: dict = Depends(get_current_user)):
    res = await db.documentos.update_one(
        {"id": doc_id, "user_id": current_user["id"]},
        {"$set": {"arquivo_base64": None, "arquivo_nome": None, "arquivo_tipo": None,
                  "updated_at": now_utc()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return {"ok": True}


# -------------------- DASHBOARD / VENCIMENTOS --------------------

@api.get("/dashboard", response_model=DashboardOut)
async def dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    familiares_count = await db.familiares.count_documents({"user_id": user_id})
    docs = []
    fam_map = {}
    cursor = db.familiares.find({"user_id": user_id}, {"_id": 0, "id": 1, "nome": 1})
    async for f in cursor:
        fam_map[f["id"]] = f["nome"]
    cursor = db.documentos.find({"user_id": user_id}, {"_id": 0, "arquivo_base64": 0})
    async for d in cursor:
        docs.append(serialize_documento(d, fam_map.get(d.get("familiar_id"))))

    vencidos = [d for d in docs if d.status == "vencido"]
    vencendo = [d for d in docs if d.status == "vencendo_em_breve"]
    sem = [d for d in docs if d.status == "sem_vencimento"]

    proximos = sorted(
        [d for d in docs if d.data_vencimento and d.status in ("vencido", "vencendo_em_breve", "ativo")],
        key=lambda d: d.data_vencimento or "",
    )[:5]

    return DashboardOut(
        user_name=current_user["name"],
        familiares_count=familiares_count,
        documentos_count=len(docs),
        documentos_vencidos=len(vencidos),
        documentos_vencendo=len(vencendo),
        documentos_sem_vencimento=len(sem),
        proximos_vencimentos=proximos,
    )


@api.get("/vencimentos")
async def vencimentos(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    fam_map = {}
    cursor = db.familiares.find({"user_id": user_id}, {"_id": 0, "id": 1, "nome": 1})
    async for f in cursor:
        fam_map[f["id"]] = f["nome"]
    docs: List[DocumentoOut] = []
    cursor = db.documentos.find({"user_id": user_id, "data_vencimento": {"$ne": None}},
                                {"_id": 0, "arquivo_base64": 0})
    async for d in cursor:
        docs.append(serialize_documento(d, fam_map.get(d.get("familiar_id"))))

    today = now_utc().date()
    vencidos, em_7, em_30, depois = [], [], [], []
    for d in docs:
        try:
            dt = datetime.fromisoformat(d.data_vencimento).date()
        except Exception:
            continue
        delta = (dt - today).days
        if delta < 0:
            vencidos.append(d)
        elif delta <= 7:
            em_7.append(d)
        elif delta <= 30:
            em_30.append(d)
        else:
            depois.append(d)
    for group in (vencidos, em_7, em_30, depois):
        group.sort(key=lambda x: x.data_vencimento or "")
    return {
        "vencidos": [d.model_dump() for d in vencidos],
        "proximos_7": [d.model_dump() for d in em_7],
        "proximos_30": [d.model_dump() for d in em_30],
        "depois": [d.model_dump() for d in depois],
    }


@api.get("/meta")
async def meta():
    return {
        "tipos_documento": [
            {"value": "cpf", "label": "CPF"},
            {"value": "rg", "label": "RG"},
            {"value": "cnh", "label": "CNH"},
            {"value": "passaporte", "label": "Passaporte"},
            {"value": "certidao", "label": "Certidão"},
            {"value": "contrato", "label": "Contrato"},
            {"value": "exame", "label": "Exame"},
            {"value": "vacina", "label": "Vacina"},
            {"value": "documento_carro", "label": "Documento do carro"},
            {"value": "documento_imovel", "label": "Documento do imóvel"},
            {"value": "garantia_produto", "label": "Garantia de produto"},
            {"value": "boleto", "label": "Boleto importante"},
            {"value": "matricula_escolar", "label": "Matrícula escolar"},
            {"value": "outro", "label": "Outro"},
        ],
        "parentescos": [
            {"value": "eu", "label": "Eu"},
            {"value": "conjuge", "label": "Cônjuge"},
            {"value": "filho", "label": "Filho"},
            {"value": "filha", "label": "Filha"},
            {"value": "pai", "label": "Pai"},
            {"value": "mae", "label": "Mãe"},
            {"value": "avo", "label": "Avô"},
            {"value": "avo_f", "label": "Avó"},
            {"value": "outro", "label": "Outro"},
        ],
        "lembretes": [7, 15, 30, 60, 90],
    }


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.familiares.create_index([("user_id", 1)])
    await db.documentos.create_index([("user_id", 1), ("updated_at", -1)])
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@docnode.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin Docnode",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "updated_at": now_utc()}},
        )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()

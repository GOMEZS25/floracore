FloraCore


## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Ant Design |
| Backend | Node.js + Express |
| ORM | Prisma |
| Base de datos | MySQL |
| Auth | JWT |
| Frontend deploy | Vercel |
| Backend deploy | Render |
| DB deploy | Railway |

---

## Requisitos previos

Antes de clonar el proyecto, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- [Git](https://git-scm.com/)
- [MySQL](https://www.mysql.com/) (local) o conexión a Railway

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/GOMEZS25/floracore.git
cd floracore
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

---

## Variables de entorno

### Backend — `backend/.env`

Crea el archivo `backend/.env` con las siguientes variables:

```env
# Base de datos
DATABASE_URL="mysql://usuario:contraseña@host:puerto/floracore"

# JWT
JWT_SECRET="________________"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3001
NODE_ENV=development
```

### Frontend — `frontend/.env`

Crea el archivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

> **Nota:** Nunca subas archivos `.env` al repositorio. Ya están en `.gitignore`.

---

## Base de datos

### Aplicar migraciones

```bash
cd backend

# En desarrollo (crea migraciones nuevas si hay cambios en schema.prisma)
npx prisma migrate dev

# En producción o para aplicar migraciones existentes sin crear nuevas
npx prisma migrate deploy
```

### Ver la base de datos con Prisma Studio

```bash
cd backend
npx prisma studio
```

---

## Correr el proyecto en local

### Backend

```bash
cd backend
npm run dev
```

El servidor corre en `http://localhost:3001`

### Frontend

```bash
cd frontend
npm run dev
```

La app corre en `http://localhost:5173`

---

## Estructura del proyecto

```
floracore/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Modelo de base de datos
│   ├── src/
│   │   ├── routes/             # Rutas de la API
│   │   ├── controllers/        # Lógica de cada módulo
│   │   ├── middlewares/        # Auth, validaciones
│   │   └── utils/              # Helpers (serializeBigInt, etc.)
│   └── .env                    # Variables de entorno (no subir)
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── pages/              # Vistas por módulo
│   │   ├── services/           # axiosInstance y llamadas a la API
│   │   └── hooks/              # Custom hooks (useTablePreferences, etc.)
│   └── .env                    # Variables de entorno (no subir)
└── README.md
```

---

## Módulos implementados

- [x] Autenticación (JWT)
- [x] Usuarios y permisos por usuario
- [x] Categorías
- [x] Atributos
- [x] Productos (con variantes por producto cartesiano)
- [x] Inventario / Lotes
- [x] Movimientos de stock (StockMovement)
- [x] Ubicaciones (FINCA → BLOQUE → CAMA)
- [x] Órdenes de venta (BORRADOR → APROBADA → DESPACHADA)

---

## Flujo de ramas (Git)

```
feature/* → develop → main
```

- `main` → versión estable
- `develop` → integración
- `feature/nombre` → desarrollo de cada funcionalidad

Siempre crea tu rama desde `develop` actualizado:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-funcionalidad
```

---

## Herramientas recomendadas

| Herramienta | Uso |
|---|---|
| VS Code | Editor principal |
| Postman | Probar endpoints de la API |
| Prisma Studio | Ver y editar datos en la BD |
| Chrome DevTools | Debug del frontend |
| dbdiagram.io | Diseño del modelo de BD |
| ClickUp | Gestión de sprints (Scrum) |

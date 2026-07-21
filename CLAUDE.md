# FloraCore

ERP para el sector floricultor colombiano. Proyecto SENA (Ficha 3118547) y producto real.

## Stack
- **Backend:** Node.js + Express + Prisma ORM + MySQL (Railway)
- **Frontend:** React + Ant Design (JavaScript, no TypeScript). Create React App.
- **Auth:** JWT + bcryptjs
- **Deploy:** Render (backend) + Vercel (frontend)

## Versiones (¡importante!)
- React 19 y Ant Design 6 — versiones recientes.
  No sugerir APIs obsoletas de React 17/18 ni Ant Design 4/5.
  Verificar patrones actuales antes de proponer cambios de UI.

## Estructura
​```
floracore/
├── backend/
└── frontend/
​```

## Convenciones de código
- Código, nombres de variables y comentarios en **inglés**
- Textos de UI (labels, mensajes) en **español**

## Reglas de Git (IMPORTANTES)
- NUNCA commitear directo a `develop` ni `main`
- Siempre crear branch desde `develop` actualizado → commit → push → PR
- Comandos de git desde la raíz del repo, no desde `backend/`
- Prefijos de commit: `Fix:` (correcciones), `Feat:` (features nuevas), `Core:` (infraestructura)

## Reglas de Prisma
- En producción usar `migrate deploy`, NUNCA `migrate dev` (puede resetear la DB)
- Campos nuevos necesitan `?` o `@default` para no perder datos
- Campos BigInt requieren `.toString()` antes de serializar a JSON

## Estándares visuales (frontend)
- Verde de marca (primarios): `#1a3c2e`
- Botones de acción neutros: `#8c8c8c`
- Botón eliminar: prop `danger` de Ant Design
- Fondo de contenido: `#f5f5f5`
- Títulos de página: `#595959`

## Comandos de verificación (frontend)
> Proyecto Create React App. El lint corre automático en start/build.
- Build (detecta errores y warnings de lint): `cd frontend && npm run build`
- Dev server: `cd frontend && npm start`
- Tests: `cd frontend && npm test`
- No existe `npm run lint` separado — ESLint está integrado en react-scripts

## Módulos existentes
Login, Users, Clients, Categories, Products, Inventory/Lots/Locations, Sales Orders

## Cómo trabajar conmigo
- Declara supuestos antes de construir
- Cambios quirúrgicos: toca solo lo necesario para la tarea
- Simplicidad primero, nada especulativo
- Explica el razonamiento antes de ejecutar
- Trabaja incremental: un cambio a la vez, verificado antes de seguir
- No refactorices código adyacente que no esté roto
- Para mejoras de frontend: pantalla por pantalla o componente por componente, nunca todo de una
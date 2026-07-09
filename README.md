# BoskePOS

Monorepo inicial para un POS con Django 6, Django REST Framework, PostgreSQL y React + Vite + Tailwind.

## Backend

```powershell
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

En PowerShell, si `npm` queda bloqueado por la politica de ejecucion local, usar `npm.cmd`.

## Validacion

```powershell
python manage.py check
cd frontend
npm.cmd run lint
npm.cmd run build
```

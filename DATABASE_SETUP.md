# Database Setup Options

คุณสามารถเลือกใช้ database local ได้ 3 วิธี:

## 1. SQLite (แนะนำสำหรับ Development) ⭐

### ข้อดี:
- ไม่ต้องติดตั้งอะไร
- ใช้ file เก็บข้อมูล
- รวดเร็วและง่าย
- มี JSON support

### การติดตั้ง:
```bash
npm install sqlite3 better-sqlite3
```

### การใช้งาน:
1. สร้าง `.env.local` file:
```env
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/bpm-to-core.db
```

2. Run initialization:
```bash
npm run db:init:sqlite
```

---

## 2. Docker PostgreSQL (แนะนำสำหรับ Production-like)

### ข้อดี:
- ใช้ PostgreSQL จริง
- แยก container ได้
- ใกล้เคียง production

### การติดตั้ง:
```bash
# ติดตั้ง Docker Desktop ก่อน
docker-compose up -d
```

### การใช้งาน:
1. สร้าง `.env.local` file:
```env
DATABASE_TYPE=postgres
POSTGRES_HOST=localhost
POSTGRES_DATABASE=bpm_to_core
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
```

2. Run initialization:
```bash
npm run db:init:postgres
```

---

## 3. Local PostgreSQL Installation

### การติดตั้ง:

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
ดาวน์โหลดจาก: https://www.postgresql.org/download/windows/

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### สร้าง Database:
```sql
CREATE DATABASE bpm_to_core;
CREATE USER admin WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE bpm_to_core TO admin;
```

### การใช้งาน:
ใช้ config เดียวกับ Docker PostgreSQL

---

## เริ่มต้นใช้งาน

1. เลือกวิธีที่ต้องการ
2. ตั้งค่า `.env.local`
3. รัน initialization script
4. เริ่มใช้งานระบบ

## Migration Scripts

ระบบจะมี scripts ต่างๆ:
- `npm run db:init:sqlite` - ตั้งค่า SQLite
- `npm run db:init:postgres` - ตั้งค่า PostgreSQL
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - ใส่ sample data
# LexOffice — Law Firm Management System (Full-Stack Version)

Aap ki original file ek **single HTML file** thi jisme saara data browser
ki IndexedDB (sirf usi computer/usi browser tak mehdood) mein save hota
tha. Maine iska **complete backend** bana diya hai — ab data ek real
server + database mein save hota hai, login server pe verify hota hai,
aur poori app ko ek desktop program ki tarah bhi run kiya ja sakta hai.

```
lexoffice/
├── backend/          ← Node.js + Express + SQLite REST API (the "backend")
│   ├── server.js      Express app: routes + static file serving
│   ├── db.js           SQLite data layer (one table per module)
│   ├── auth.js          Login, JWT tokens, role permissions
│   ├── seed.js            First-run demo data (10 clients, 15 cases...)
│   └── data/lexoffice.db   ← the actual database file (auto-created)
├── frontend/         ← same UI as before, now talking to the API
│   └── index.html
└── electron/         ← wraps everything into a desktop app (.exe/.dmg/.AppImage)
    └── main.js
```

---

## 1. Sabse Aasan Tareeqa — Local Server (5 minute setup)

Ye tareeqa har OS (Windows/Mac/Linux) pe kaam karta hai aur "desktop app"
jaisa hi experience deta hai — bas ek Terminal command chalani hai, baqi
sab browser mein khulta hai jaise koi normal app.

**Requirement:** [Node.js](https://nodejs.org) installed hona chahiye (LTS version, v18 ya usse upar).

```bash
cd backend
npm install        # ek dafa — sab libraries download karta hai
npm start           # server chalu karta hai
```

Terminal mein ye dikhega:
```
LexOffice server running:  http://localhost:4000
```

Ab browser mein `http://localhost:4000` kholiye — poori app khul jayegi.
Demo logins (backend khud hi pehli dafa banata hai):

| Username     | Password  | Role       |
|--------------|-----------|------------|
| admin        | demo123   | Admin (sab kuch) |
| lawyer       | demo123   | Lawyer     |
| assistant    | demo123   | Assistant  |
| accountant   | demo123   | Accountant |

Server ko band karne ke liye Terminal mein `Ctrl+C` dabayein. Dobara chalane
ke liye sirf `npm start` — data waisa hi rahega jaisa chhoda tha (SQLite
file `backend/data/lexoffice.db` mein permanently save hai).

**Desktop shortcut banane ke liye:** `npm start` chalane ke baad, Chrome/Edge
mein `http://localhost:4000` khol kar (⋮ menu →) **"Install app"** / **"Create
shortcut"** dabayein — ab ek desktop icon ban jayega jo browser chrome ke
bina, ek alag window mein khulta hai, bilkul native app jaisa.

---

## 2. Real Desktop App (.exe / .dmg / .AppImage) — Electron

Agar aapko double-click karke chalne wala **installer file** chahiye
(jaise koi bhi Windows software), to Electron wrapper use karein:

```bash
# 1) backend ki libraries install karein (agar pehle nahi ki)
cd backend && npm install && cd ..

# 2) electron project setup karein
cd electron
npm install

# 3) better-sqlite3 ko Electron ke Node version ke against rebuild karein
#    (native module hai, isliye ye step zaroori hai — sirf ek dafa)
npx electron-rebuild --module-dir ../backend

# 4) test run (installer banane se pehle check kar lein sab theek chal raha hai)
npm start

# 5) actual installer banayein
npm run dist
```

`npm run dist` ke baad `electron/dist/` folder mein aapko milega:
- Windows: `LexOffice Setup.exe`
- macOS: `LexOffice.dmg`
- Linux: `LexOffice.AppImage`

Ye file kisi bhi computer pe copy karke double-click se install ho sakti
hai — ek proper desktop app ki tarah, Start Menu / Applications mein icon
ke saath. Andar wahi backend + database chalta hai, bas ab yeh ek native
window mein khulta hai (koi browser address bar nahi dikhti).

> **Note:** Database is per-computer. Agar aap multiple computers pe ek hi
> data (ek hi clients/cases) dekhna chahte hain, to Section 1 wala tareeqa
> use karein aur backend ko ek office server/computer pe chalayein — baqi
> sab log apne browser se `http://<us-computer-ka-IP>:4000` khol kar
> connect ho sakte hain (LAN pe).

---

## 3. Data Kaise Manage Hota Hai — Poori Architecture

### Pehle (original file):
```
Browser  →  IndexedDB (sirf isi browser/computer mein, koi login security nahi)
```
Passwords plain text mein save the, koi bhi browser console khol kar sab
data ya passwords dekh sakta tha, aur data doosre computer pe copy nahi ho
sakta tha.

### Ab (naya system):
```
Browser (UI)  →  fetch() calls  →  Express REST API  →  SQLite Database
                  (JWT token har request ke sath)         (backend/data/lexoffice.db)
```

**Step by step:**

1. **Login:** Username/password `POST /api/auth/login` pe jate hain.
   Server password ko `bcrypt` se verify karta hai (password kabhi
   plain-text save nahi hota — hash hota hai). Sahi hone par server ek
   **JWT token** deta hai jo 12 ghante ke liye valid hota hai.

2. **Har request:** Token browser mein save hota hai (`localStorage`) aur
   har API call ke sath `Authorization: Bearer <token>` header mein jata
   hai. Server har request pe token check karta hai — bina valid token
   koi bhi data access nahi hota.

3. **Roles/Permissions:** Har role (admin/lawyer/assistant/accountant)
   ke liye backend khud decide karta hai wo kaunse modules access kar
   sakta hai (e.g. sirf admin naye users bana sakta hai) — ye check
   **server pe** hota hai, sirf UI mein chhupaya nahi jata, isliye koi
   browser console se bhi bypass nahi kar sakta.

4. **Data storage:** Har module (Clients, Cases, Hearings, Fees,
   Payments, Expenses, Documents, Tasks, Courts, Case Parties, Important
   Dates, Notes, Audit Log, Settings) apni alag table mein SQLite database
   file (`backend/data/lexoffice.db`) mein save hota hai — ek normal
   file jise aap copy/backup kar sakte hain.

5. **CRUD operations:** UI mein jo bhi "Save", "Delete", list dikhana
   hota hai, wo sab in generic API routes se hota hai:
   - `GET /api/clients` — sab clients ki list
   - `GET /api/clients/:id` — ek client ki detail
   - `PUT /api/clients/:id` — naya client add / existing update
   - `DELETE /api/clients/:id` — client delete
   
   Yahi pattern har module (`cases`, `hearings`, `fees`, `payments`,
   `expenses`, `documents`, `tasks`, `courts`, `notes`, waghera) ke liye
   kaam karta hai.

6. **Backup/Restore:** App ke andar "Backup & Restore" wala feature
   waisa hi kaam karta hai jaisa pehle karta tha (Excel file mein export/
   import) — bas ab wo data seedha database se aata hai.

### Security improvements is naye system mein:
- Passwords ab hashed (bcrypt) hain, plain-text nahi.
- Har API request authenticated (JWT) aur role-checked hai.
- Data ek real file-based database mein hai — browser cache clear karne
  se data delete nahi hota.
- Multiple computers/users ek hi shared data dekh sakte hain (agar server
  network pe chalaya jaye).

### Limitation jo aapko pata honi chahiye:
- Ye ek **single-file JSON-style SQLite storage** hai (har table mein
  `id` + poora record JSON ki tarah) — chhoti se medium size law firm
  (sainkron clients/cases) ke liye bilkul theek hai. Agar future mein
  hazaaron records aur complex reporting chahiye ho, to isko PostgreSQL/
  MySQL mein migrate karna aasan hoga kyunki API layer wahi rahegi, sirf
  `backend/db.js` badalna hoga.

---

## 4. File Kahan Milengi

Maine neeche files present kar di hain: poora `backend/`, `frontend/`,
aur `electron/` folder. Inhe ek folder mein rakh kar upar diye steps
follow karein.

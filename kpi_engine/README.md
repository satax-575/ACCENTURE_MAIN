# 🟣 Accenture Applied Intelligence — KPI Intelligence-to-Action Engine (Round 2)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://accenture-kpi-engine.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](http://localhost:8000/docs)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](http://localhost:5173)
[![Test Suite](https://img.shields.io/badge/Pytest-100%25%20Passed%20(12%2F12)-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](tests/test_engine.py)
[![Accenture Responsible AI](https://img.shields.io/badge/Accenture-Responsible%20AI%20Fenced-a100ff?style=for-the-badge)](https://accenture.com)

> **Enterprise KPI Intelligence-to-Action Engine** designed for C-suite executives, operations managers, and quantitative analytics leads. Reconciles data and business context across heterogeneous enterprise sources, computes exact additive financial decompositions, grounds root-cause drivers with temporal causal precedence, conducts real-time web search benchmarks, and provides 1-click operational action dispatches (Slack, Jira, Salesforce CRM).

---

## 🌐 Live Deployments & Repository Links

- **🚀 Live Vercel Production Portal**: [https://accenture-kpi-engine.vercel.app](https://accenture-kpi-engine.vercel.app)
- **📦 GitHub Repository**: [https://github.com/saugata-malakar/ACCENTURE](https://github.com/saugata-malakar/ACCENTURE)
- **⚡ Local Frontend (React + Vite)**: `http://localhost:5173`
- **📚 Local REST API & Swagger UI (FastAPI)**: `http://localhost:8000/docs`



---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       accenture >   Applied Intelligence                                         │
│                                   Enterprise KPI Intelligence-to-Action Suite                                     │
└────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                                         │
       ┌──────────────────────────────┬──────────────────┴──────────────┬──────────────────────────────┐
       ▼                              ▼                                 ▼                              ▼
┌──────────────┐             ┌──────────────────┐             ┌──────────────────┐             ┌──────────────┐
│ Data Layer   │             │ Analytical Core  │             │ Governance & LLM │             │ Action Hub   │
│ • Snowflake  │             │ • Holt-Winters   │             │ • Hard Abstain   │             │ • Slack (P1) │
│ • Databricks │ ──────────> │ • Additive Math  │ ──────────> │ • Zero-Hallucin. │ ──────────> │ • Jira (ENG) │
│ • Stripe/CRM │             │ • DAG Lineage    │             │ • Gemini Flash   │             │ • Salesforce │
│ • Custom CSV │             │ • Temporal Match │             │ • JSON Fencing   │             │ • Webhook    │
└──────────────┘             └──────────────────┘             └──────────────────┘             └──────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Clone the Repository
```bash
git clone https://github.com/saugata-malakar/ACCENTURE.git
cd ACCENTURE
```

### 2. Run the Backend (FastAPI)
```bash
cd kpi_engine
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at `http://localhost:8000/docs`.

### 3. Run the Frontend (React + Vite)
```bash
cd kpi_engine/frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🧪 Automated Test Suite

Run the full 12-stage automated test suite:
```bash
cd kpi_engine
python -m pytest tests/test_engine.py -v
```

---

## ⚖️ License & Copyright

© 2026 **Accenture**. All rights reserved. Applied Intelligence & AI Strategy Practice.

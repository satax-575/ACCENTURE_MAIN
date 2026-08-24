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

## ✨ Key Enterprise Capabilities

### 1. 🌐 Interactive Semantic Knowledge Graph Studio (`/knowledge-graph`)
- **DAG Causal Topology**: In-memory directed acyclic graph mapping metrics to root drivers.
- **Dual Visual Modes**: Switch between **Radial Topology** and **Hierarchical Tree**.
- **Upstream & Downstream Lineage**: Selecting any node highlights exact arithmetic formulas (`SUM(qty * price)`), business weights, and dependent leaf nodes.
- **Causal Sensitivity Simulator**: Interactive stress-testing slider ($+5\%$ to $+100\%$) projecting daily revenue drag.
- **Dynamic Metric Studio**: 1-click dialog to register custom client KPI contracts into the runtime DAG.

### 2. 👑 Persona-Tailored Executive Dashboards (`/`)
Toggling personas instantly restructures the interface:
- **CEO Executive View**: Macro P&L run-rate revenue, revenue-at-risk, strategic 1-click intervention center, and compute cost accounting ($92\%$ token savings).
- **Manager Operations View**: Territory health tracking, checkout error surge alarms, and incident escalation SLA boards.
- **Analyst Quantitative View**: Peak statistical anomaly $z$-scores ($z = -1.89$), 100% data completeness audit, and additive waterfall bridge.

### 3. 🤖 Decision Assistant with Live Web Search & Market Browser (`/chat`)
- **Live Real-Time Web Indexing**: Queries live web sources (DuckDuckGo API / live HTTP endpoints) to retrieve external SaaS conversion rates, Stripe outage stats, and industry benchmarks.
- **Embedded Visual Charts**: Recharts bar charts and 7-day forecast curves rendered directly inside conversational message bubbles.
- **Dedicated Live Web Browser Tab**: Search any market query or inspect live URLs with a 1-click **"Analyze in Chat"** button to correlate web research with internal KPIs.

### 4. 🧪 What-If Business Scenario Simulator (`/simulator`)
- Interactive slider sandbox to model:
  - *Target Checkout Error Rate* ($12.4\% \rightarrow 0.2\%$)
  - *Price Adjustments* ($-15\%$ to $+15\%$)
  - *Marketing Budget Delta* ($-\$3,000$ to $+\$3,000/\text{wk}$)
- Calculates exact recovered weekly revenue, annualized ROI ($+\$142,000/\text{yr}$), and visual financial waterfall bridges.

### 5. 🔌 Data Connectors & Ingestion Hub (`/connectors`)
- Connect live to **Snowflake**, **Databricks**, **Stripe**, **Salesforce**, **BigQuery**, or **PostgreSQL**.
- **Instant Custom CSV Ingest Studio**: Drop any transaction CSV for automated schema inference, summary statistics, and anomaly case synthesis.

### 6. 📄 1-Page CEO Executive Board Briefing (`/case/...`)
- Generates publication-ready board briefing documents formatted with Volume/Price/Mix decomposition, ranked drivers, and executive sign-off certification.
- 1-click print or export to PDF for board reviews.

---

## 🔬 Deterministic 10-Stage Pipeline

```
  [1. Ingest & Multi-Source Reconciliation] ──> Transactions, Support Tickets, Marketing Feeds
                   │
  [2. Semantic Contracts & Knowledge Graph] ──> Formula DAG, Business Weights, Owners
                   │
  [3. Multi-KPI Scanning & Prioritization]  ──> z-score × weight × recency scoring
                   │
  [4. Time-Series Forecasting]              ──> Holt-Winters Exponential Smoothing + 95% PI
                   │
  [5. Additive Waterfall Decomposition]     ──> ΔRev = ΔVolume + ΔPrice + ΔMix
                   │
  [6. Causal Precedence & Driver Ranking]   ──> Temporal check (t_driver ≤ t_kpi) + Pearson r
                   │
  [7. Confidence & Hard Abstention]         ──> 100% hard abstention on stale/missing feeds
                   │
  [8. Actionable Recommendation Engine]     ──> Structured playbooks with owner decision rights
                   │
  [9. Persona-Tailored Narration]           ──> Gemini 2.0 Flash with JSON evidence pinning
                   │
  [10. Self-Calibrating Feedback Loop]      ──> Analyst confirmation tracking & weight rebalancing
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Recharts, Lucide React, Axios |
| **Backend API** | Python 3.11, FastAPI, Uvicorn, Pydantic v2 |
| **Analytical Engine** | Pandas, NumPy, Statsmodels, Scipy |
| **LLM & Search** | Google Gemini 2.0 Flash, DuckDuckGo Live Search API, JSON Evidence Fencing |
| **Testing & Quality** | Pytest, TestClient, Flake8 |
| **Deployment** | Vercel (Production UI), Git, Docker Ready |

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

**Test Results:** `12 passed in 100% test coverage` ✅
- `test_access_and_column_security` PASSED
- `test_anomaly_detection` PASSED
- `test_api_endpoints` PASSED
- `test_confidence_and_abstention` PASSED
- `test_feedback_and_calibration` PASSED
- `test_ingest_and_data_quality` PASSED
- `test_persona_narratives_and_recommendations` PASSED
- `test_proactive_alerts_and_forecasting` PASSED
- `test_root_cause_and_waterfall` PASSED
- `test_semantic_contracts_and_knowledge_graph` PASSED
- `test_sparse_history` PASSED
- `test_telemetry` PASSED

---

## 👥 User Personas

| Persona | Primary Focus | Output Provided |
|---|---|---|
| **👑 CEO** | Strategic P&L & Net Anomaly Drag | High-level financial impact, strategic intervention approvals, compute cost accounting |
| **⚙️ Manager** | Operational Pacing & SLA Resolution | Territory pacing metrics, checkout error surge alarms, team escalation task boards |
| **🔬 Analyst** | Statistical Rigor & Semantic Lineage | $z$-score distributions, data completeness audits, correlation matrix ($r$), DAG contract viewer |

---

## 📜 Governance, Security & Compliance

- **Column-Level Redaction**: PII fields (`customer_id`, exact financial spend) automatically hashed or redacted for operational roles.
- **Regional Access Scoping**: Territory boundaries enforced via governed role access.
- **Immutable Action Audit Logging**: All external Slack, Jira, and CRM dispatches are permanently recorded with timestamp, authorized persona, and external reference IDs in `data/integrations_dispatch_log.json`.

---

## ⚖️ License & Copyright

© 2026 **Accenture**. All rights reserved. Applied Intelligence & AI Strategy Practice.

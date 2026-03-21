<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=50&duration=3000&pause=1000&color=00FF88&center=true&vCenter=true&width=1000&lines=ITERABEAST;SYNTH_DATAGEN_ENGINE" alt="Typing SVG" />
  
  <img src="assets/IteraBeastGif2.gif" alt="IteraBeast Main Demo" width="100%" style="max-width: 800px; border-radius: 10px; box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);" />

  <p align="center">
    <br />
    <strong>Synth DataGen Engine</strong><br/>
    <em>High-performance, UI-driven synthetic data generation for AI fine-tuning.</em>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Status-ONLINE-00FF00?style=for-the-badge&logo=statuspage" alt="Status" />
    <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="Backend" />
    <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react" alt="Frontend" />
    <img src="https://img.shields.io/badge/Output-JSONL-white?style=for-the-badge" alt="Output" />
  </p>
</div>

<br/>

## 📡 OVERVIEW

**IteraBeast** is a modern, cyber-aesthetic web application designed to simplify and accelerate the process of generating large-scale synthetic datasets (`.jsonl`) for training and fine-tuning LLMs. 

Engineered for **AI Researchers**, **Data Scientists**, and **LLM Fine-tuners**, this tool bridges the gap between raw prompt engineering and production-grade dataset creation. It transforms the chaotic task of data synthesis into a streamlined, visually immersive operation—perfect for building RAG pipelines, fine-tuning adapters (LoRA/QLoRA), or generating evaluation benchmarks.

By leveraging a dual-node architecture (FastAPI backend + React frontend), it allows developers to batch-generate diverse, context-aware conversational data across multiple LLM providers simultaneously.

---

## ⚡ CORE CAPABILITIES

<div align="center">
  <table>
    <tr>
      <td width="50%" valign="top">
        <h3>🧬 Multi-Provider Node Matrix</h3>
        <p>Seamlessly integrates local (Ollama) and cloud nodes (Groq, OpenRouter, DeepInfra) into a unified generation grid. Switch providers instantly without breaking the workflow.</p>
      </td>
      <td width="50%" valign="top">
        <h3>🔄 Advanced Distribution Routing</h3>
        <p>Features intelligent workload balancing algorithms including <code>Sequential</code>, <code>Round-Robin</code>, and <code>Hybrid</code> strategies to maximize throughput and minimize API rate limits.</p>
      </td>
    </tr>
    <tr>
      <td width="50%" valign="top">
        <h3>🛡️ Strict JSONL & Schema Enforcement</h3>
        <p>Implements a rigorous <strong>Post-Generation Validation Layer</strong> that guarantees 100% valid JSONL syntax. The engine automatically sanitizes output and escapes forbidden characters, ensuring zero-fail ingestion for training pipelines.</p>
      </td>
      <td width="50%" valign="top">
        <h3>🗃️ Direct Stream Architecture</h3>
        <p>Bypasses memory bottlenecks by streaming generated <code>.jsonl</code> chunks directly to your local SSD via the FileSystem Access API. Capable of handling massive datasets with zero latency.</p>
      </td>
    </tr>
     <tr>
      <td width="50%" valign="top">
        <h3>🧠 Semantic Variation Injection</h3>
        <p>Prevents dataset overfitting by using <strong>MiniLM embeddings</strong> to analyze and inject dynamic context. The system autonomously alters sentence structures to ensure high-entropy, semantically diverse data distribution.</p>
      </td>
      <td width="50%" valign="top">
        <h3>🎨 UNSTABLE_CORE Interface</h3>
        <p>A reactive, hardware-accelerated UI with real-time <strong>cost/token telemetry</strong> and interchangeable themes (MAGI / UNSTABLE_CORE), designed for high-velocity data operations.</p>
      </td>
    </tr>
  </table>
</div>

<br/>

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="assets/IteraBeastGif1.gif" alt="IteraBeast Feature 1" width="100%" style="max-width: 400px; border-radius: 8px; height: 300px; object-fit: cover;" />
        <br />
        <br />
        <strong>Multi-Provider Integration & Node Configuration</strong>
      </td>
      <td align="center" width="50%">
        <img src="assets/IteraBeastGif3.gif" alt="IteraBeast Feature 3" width="100%" style="max-width: 400px; border-radius: 8px; height: 300px; object-fit: cover;" />
        <br />
        <br />
        <strong>Semantic Variation System & Distribution Routing</strong>
      </td>
    </tr>
  </table>
</div>

---

## 🛠️ QUICK START

### 1. Backend Service (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows
# source .venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
python main.py
```
*API runs on `http://localhost:8000`*

### 2. Frontend Client (React)

```bash
cd frontend
npm install
npm run dev
```
*Interface accessible at `http://localhost:5173`*

---

## 📁 ARCHITECTURE

```text
IteraBeast/
├── backend/                  # Async Server Node
│   ├── main.py               # API Endpoints & Generators
│   └── requirements.txt      # Dependencies
├── frontend/                 # Client UI Node
│   ├── src/
│   │   ├── components/       # Interface Elements & Terminal
│   │   ├── App.jsx           # State & Execution Logic
│   │   └── index.css         # Styling & Animations
│   └── package.json
└── README.md
```

---

## ⚙️ REQUIREMENTS

- Python 3.9+
- Node.js 18+
- Chromium-based browser (Chrome/Edge) recommended for full `FileSystemWritableFileStream` support.

---

<div align="center">
  <br/>
  <p style="font-family: 'Courier New', monospace; font-size: 14px; color: #888;">
    [ SYSTEM_STATUS: <strong style="color: #00ff88;">OPERATIONAL</strong> ] &nbsp;|&nbsp; [ CAPACITY: <strong style="color: #00ff88;">OPTIMAL</strong> ]
  </p>
  <a href="https://github.com/CodaCipher" target="_blank">
    <img src="https://img.shields.io/badge/ARCHITECT-CODACIPHER-000000?style=for-the-badge&logo=github&logoColor=00FF88&labelColor=1a1a1a" alt="CodaCipher" />
  </a>
  <p style="font-size: 10px; opacity: 0.5; margin-top: 10px;">
    END_OF_LINE_SEQUENCE
  </p>
</div>

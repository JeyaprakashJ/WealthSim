# 🌊 WealthSim

**Financial Independence, Quantified.**

WealthSim is a premium, high-fidelity Fintech wealth simulator designed for modern professionals. It goes beyond simple savings calculators by accounting for complex compensation structures (RSUs, performance bonuses), localized tax regimes, and life-stage financial events.

## ✨ Core Features

### 1. Multi-Scenario Projection Engine
Visualize your future across three market outlooks:
- 🛡️ **Conservative:** Low-risk, steady growth (e.g., Debt/FD focused).
- ⚡ **Moderate:** Balanced portfolio (e.g., Index funds/ETFs).
- 🚀 **Aggressive:** High-growth strategy (e.g., Tech stocks/Crypto).

### 2. Sophisticated Compensation Modeling
- **RSU Portfolio Tracking:** Model annual grants with specific stock growth rates separate from your cash savings.
- **Graduated Tax Slabs:** Includes localized tax logic for **India (New Regime)** and the **USA (Federal)**, automatically calculating take-home pay from gross figures.
- **Compound Performance Bonuses:** Calculate bonuses as a percentage of your base salary, compounding with annual hikes.

### 3. "Magic Timeline" (AI Life Events)
Powered by **Google Gemini**, describe life events in natural language (e.g., *"Buying a 50L car in 2028"* or *"Expecting a 30% hike next year"*) and watch the simulation update in real-time.

### 4. Wealth Intelligence & OCR
- **Document Parsing:** Upload paystubs or previous financial statements. The AI extracts salary, RSU, and asset data to pre-configure your simulation.
- **Data Continuity:** Import historical CSV data to create a "Rolling Simulation"—merging your actual past performance with future AI-driven projections.

### 5. Premium UI/UX
- **Material 3 Design:** A sleek, professional interface with Midnight, Lumina, and Neutral themes.
- **Interactive Data:** Charts with high-precision vertical zoom and horizontal panning.
- **Real Value Insights:** Toggle between absolute numbers and **Inflation-Adjusted** "Real Values" to see what your money will actually buy in the future.

---

## 🛠️ Tech Stack

- **Framework:** React 19 (ES6+ Modules)
- **Styling:** Tailwind CSS + Google Material Symbols
- **AI Engine:** @google/genai (Gemini 2.5 Flash / 3.0 Pro)
- **Data Handling:** JSZip (for secure exports), Papaparse (CSV), jsPDF
- **Build Tool:** Vite 6

---

## 🚀 Getting Started

### 🔜Webapp coming soon 
### Prerequisites
You will need a **Google Gemini API Key**. You can get one for free at [aistudio.google.com](https://aistudio.google.com/).

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root and add your key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## ☁️ Deployment

### Deploy for Free (Vercel/Netlify)
1. Push your code to GitHub.
2. Connect your repo to **Vercel** or **Netlify**.
3. **Environment Variables:** In the hosting dashboard, add `GEMINI_API_KEY` to the project settings.
4. Deploy! Your app will be live on a secure HTTPS URL.

---

## 🔒 Privacy & Security

WealthSim is built with **Data Sovereignty** in mind:
- **Client-Side Processing:** All simulation logic runs in your browser.
- **No Database:** Your financial data is never stored on a server.
- **Portable Data:** Export your entire simulation as a encrypted-ready ZIP containing raw JSON and CSV files for your own records.

---

## 📄 License
MIT License - Feel free to use and modify for personal or commercial use.

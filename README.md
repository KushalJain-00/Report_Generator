# RIG — Report Intelligence Generator (Agentic Offline Edition)

RIG is an advanced AI-powered report generation dashboard that leverages **n8n** and local Large Language Models (LLMs) to automatically generate professional, interconnected consulting documents. 

This repository contains everything you need to run the entire pipeline **100% offline** and for **free** on your own computer without any API limits or costs.

## 🚀 Recommended Offline LLM

To run this smoothly on a standard PC without lag, we highly recommend using **Ollama** with the **Llama 3 (8B)** or **Qwen2.5 (7B)** model. 
These models are incredibly fast, take up very little disk space (~4.7GB), and run comfortably on machines with 8GB to 16GB of RAM.

- **Recommended Model:** `llama3` or `qwen2.5:7b`
- **Why?** It strikes the perfect balance between high-quality document generation and low resource usage.

---

## 🛠️ Complete Setup Guide for Clients

Follow these steps to get the entire system running locally on your machine.

### Step 1: Install Ollama (Local AI Engine)
1. Go to [ollama.com](https://ollama.com/) and download the installer for your OS (Windows, Mac, or Linux).
2. Install the application.
3. Open your Terminal (Mac/Linux) or Command Prompt (Windows).
4. Run the following command to download the AI model:
   ```bash
   ollama run llama3
   ```
   *(This will download the model. Once you see a prompt `>>>`, you can close the terminal or type `/bye`. Ollama is now running in the background).*

### Step 2: Install & Start n8n (Orchestration Engine)
n8n is the engine that connects the website to your local AI. You can run it easily using `npm` (if you have Node.js installed) or Docker.

**Option A: Using Node.js (Easiest)**
1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Open your terminal and run:
   ```bash
   npx n8n
   ```
3. n8n will start and open in your browser at `http://localhost:5678`.

### Step 3: Import the RIG Workflow
1. Open n8n in your browser (`http://localhost:5678`).
2. Follow the setup screens to create a local owner account.
3. Go to **Workflows** → **Add Workflow**.
4. In the top right corner, click the **... (options)** button and select **Import from File**.
5. Select the `n8n_workflow.json` file located in this repository.
6. The workflow will appear on your screen!

### Step 4: Configure the Local AI Node
1. In your n8n workflow, double-click the **Ollama** node (or the Basic LLM node).
2. Set the Base URL to `http://localhost:11434` (This is where Ollama runs).
3. Set the Model name to `llama3`.
4. Close the node settings.
5. **CRITICAL:** Click the toggle switch at the top right of n8n to set the workflow to **Active**.
6. Double-click the **Webhook** node at the very start of the workflow. Change the environment to "Production" and copy the **Production URL** (it should look like `http://localhost:5678/webhook/generate-reports`).

### Step 5: Run the Dashboard
1. You do not need a web server! Simply double-click the `index.html` file in this folder to open it in your web browser (Chrome/Edge/Safari).
2. In the "n8n Webhook URL" field on the website, paste the URL you copied from Step 4.
3. Fill in your project details, select the documents you want to generate, and click **Trigger n8n Agent Workflow**.

🎉 **That's it!** The website will send the request to n8n, which will orchestrate `llama3` to write your documents, zip them up, and prompt you to download the completed package.

---

## 📁 Repository Structure
* `index.html` — The main dashboard UI.
* `assets/css/index.css` — Styling and glassmorphism UI.
* `assets/js/n8n_client.js` — Client-side logic for connecting the UI to the n8n webhook.
* `n8n_workflow.json` — The complete agentic pipeline configuration for n8n.
* `README.md` — This setup guide.

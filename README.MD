AI Job Scout 🔍

AI Job Scout is a full-stack job aggregation platform that uses Gemini AI to perform "dorking"—generating highly specific search queries to find real-time job listings across the web. It features an automated CV analyzer that scores your resume fit against job descriptions.

🚀 Features

Universal Search: Search for any role globally using AI-optimized search dorks.

Gemini Dork Engine: Automatically transforms raw user input into targeted queries for platforms like LinkedIn, Indeed, Greenhouse, and Lever.

Live Web Fetcher: Real-time job retrieval without the need for expensive, paid APIs.

CV Fit Analyzer: Upload your PDF CV to get an AI-powered match score (30–100%) with actionable feedback on strengths and gaps.

Job Dashboard: Save listings, filter results, and track application opportunities.

🛠 Tech Stack

Backend: Django, Django REST Framework (DRF), google-genai SDK, pypdf.

Frontend: React 18, Vite, Tailwind CSS (v4), Lucide Icons.

Search Logic: Gemini 2.5 Flash for query optimization; DuckDuckGo HTML parsing for zero-cost web crawling.

⚙️ Local Development Setup

Prerequisites

Python 3.11+

Node.js (v18+)

A Google Gemini API Key (Get one here)

1. Backend Setup

Clone the repository and enter the directory:

git clone <your-repo-url>
cd ai-job-scout


Create and activate a virtual environment:

python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate


Install dependencies:

pip install django djangorestframework google-genai pypdf python-dotenv django-cors-headers


Configure your .env file in the root directory:

GEMINI_API_KEY=your_actual_api_key_here
DEBUG=True


Run the server:

python manage.py runserver


2. Frontend Setup

Open a second terminal window and navigate to the frontend directory:

cd frontend


Install dependencies:

npm install


Start the development server:

npm run dev


📝 Usage

Open http://localhost:5173 in your browser.

Enter your desired job role in Module 01 and hit "Run Universal AI Search".

Review the "Gemini Dork Engine" results and click any job listing.

Upload your PDF CV in Module 03 to generate your fit score.

Click "Save" on any job card to bookmark it to your local dashboard.

🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any new features or bug fixes.

import os
import json
import logging
import urllib.parse
import urllib.request
import re
from html import unescape
from google import genai
from google.genai import types
from pypdf import PdfReader

logger = logging.getLogger(__name__)

# --- EXISTING CLASSES (Kept for compatibility and single-job analysis) ---

class InputTransformer:
    """Transforms ANY job request into dynamic search dorks and queries using Gemini."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY environment variable missing.")

    def transform(self, raw_input: str, user_role_hint: str = "", location: str = "") -> dict:
        """Converts raw text for ANY profession into localized and global search dorks."""
        prompt = f"""
        You are an elite global recruitment search engine optimizer.
        Analyze the user's target job role and location.

        User Raw Input: "{raw_input}"
        Optional Role Context: "{user_role_hint}"
        Target Location: "{location if location else 'Global / Remote / Unspecified'}"

        Task:
        1. Identify the exact profession, industry, domain jargon, required certifications, and seniority level.
        2. Formulate 3-5 high-conversion search dorks targeting real job boards and direct career sites.
        3. Extract normalized search parameters.

        Return strictly valid JSON:
        {{
            "detected_profession": "string",
            "industry_category": "string",
            "primary_search_query": "string",
            "search_dorks": [
                "dork query 1",
                "dork query 2",
                "dork query 3"
            ],
            "extracted_filters": {{
                "normalized_title": "string",
                "estimated_seniority": "Entry | Mid | Senior | Executive | Any",
                "key_skills_or_certs": ["skill1"],
                "is_remote": true/false
            }}
        }}
        """

        if not self.client:
            return self._fallback_transformation(raw_input, location)

        try:
            response = self.client.models.generate_content(
                model='gemini-3.1-flash-lite',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            return self._fallback_transformation(raw_input, location)

    def _fallback_transformation(self, raw_input: str, location: str) -> dict:
        clean_input = raw_input.strip('"\'')
        loc_str = f' "{location}"' if location else ""
        return {
            "detected_profession": clean_input,
            "industry_category": "General",
            "primary_search_query": f'{clean_input}{loc_str} job vacancy hiring',
            "search_dorks": [
                f'site:linkedin.com/jobs "{clean_input}"{loc_str}',
                f'"{clean_input}"{loc_str} job vacancy hiring',
                f'"{clean_input}" careers{loc_str}'
            ],
            "extracted_filters": {
                "normalized_title": clean_input,
                "estimated_seniority": "Unspecified",
                "key_skills_or_certs": [],
                "is_remote": "remote" in raw_input.lower()
            }
        }

class GoogleSearchService:
    """Queries live web job listings using Custom Search API or robust web search fetcher."""
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.cx_id = os.getenv("GOOGLE_SEARCH_CX")

    def search(self, query: str, num_results: int = 8, raw_role: str = "", location: str = "") -> list:
        if self.api_key and self.cx_id:
            try:
                params = urllib.parse.urlencode({'key': self.api_key, 'cx': self.cx_id, 'q': query, 'num': min(num_results, 10)})
                url = f"https://www.googleapis.com/customsearch/v1?{params}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                results = [{'title': i.get('title'), 'link': i.get('link'), 'snippet': i.get('snippet')} for i in data.get('items', [])]
                if results: return results
            except Exception as e:
                logger.error(f"Google Custom Search API error: {e}")

        results = self._live_web_search(query, max_results=num_results)
        
        if not results:
            clean_query = re.sub(r'site:[^\s]+', '', query).replace('"', '').strip()
            clean_query = f"{clean_query} job vacancy hiring"
            results = self._live_web_search(clean_query, max_results=num_results)

        if not results:
            results = self._generate_direct_job_board_links(raw_role or query, location)
        return results

    def _live_web_search(self, query: str, max_results: int = 8) -> list:
        try:
            data_bytes = urllib.parse.urlencode({'q': query}).encode('utf-8')
            req = urllib.request.Request(
                'https://html.duckduckgo.com/html/',
                data=data_bytes,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                html = response.read().decode('utf-8', errors='ignore')

            results = []
            items = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
            snippets = re.findall(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)

            for idx, (link, raw_title) in enumerate(items[:max_results]):
                actual_link = urllib.parse.unquote(link.split('/uddg=')[1].split('&')[0]) if '/uddg=' in link else link
                clean_title = unescape(re.sub(r'<[^>]+>', '', raw_title)).strip()
                snippet_text = unescape(re.sub(r'<[^>]+>', '', snippets[idx])).strip() if idx < len(snippets) else ""
                
                if actual_link.startswith('http') and clean_title:
                    results.append({"title": clean_title, "link": actual_link, "snippet": snippet_text or f"Listing on {actual_link}"})
            return results
        except Exception as e:
            logger.error(f"Live web search error: {e}")
            return []

    def _generate_direct_job_board_links(self, role: str, location: str) -> list:
        role_clean = role.replace('"', '').strip()
        loc_clean = location.replace('"', '').strip() if location else ""
        role_param = urllib.parse.quote(role_clean)
        loc_param = urllib.parse.quote(loc_clean)

        base = [
            {"title": f"LinkedIn Jobs: {role_clean}", "link": f"https://www.linkedin.com/jobs/search/?keywords={role_param}&location={loc_param}", "snippet": "Explore live hiring listings on LinkedIn."},
            {"title": f"Glassdoor: {role_clean}", "link": f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_param}", "snippet": "View salary ranges and active postings."},
            {"title": f"Indeed: {role_clean}", "link": f"https://www.indeed.com/jobs?q={role_param}&l={loc_param}", "snippet": "Search thousands of active job vacancies."}
        ]
        if 'nepal' in loc_clean.lower() or 'kathmandu' in loc_clean.lower():
            base.insert(0, {"title": f"Merojob: {role_clean}", "link": f"https://merojob.com/search/?q={role_param}", "snippet": "Top Nepalese career portal listings."})
        return base

class CVAnalyzer:
    """Parses PDF CVs and calculates a 30% to 100% fit score against job criteria."""
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None

    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extracts raw text from an uploaded PDF file."""
        try:
            reader = PdfReader(pdf_file)
            return "".join([page.extract_text() or "" for page in reader.pages])
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def analyze_fit(self, cv_text: str, job_description: str) -> dict:
        """Scores CV against job description and outputs 30-100% fit with strengths/gaps."""
        prompt = f"""
        Act as an expert technical recruiter and HR screener.
        Compare the candidate's CV text against the Target Job Posting below.

        CANDIDATE CV:
        "{cv_text[:4000]}"

        TARGET JOB POSTING:
        "{job_description[:4000]}"

        Instructions:
        1. Evaluate overall suitability and assign a fit percentage score strictly between 30 and 100.
        2. Identify key matching strengths (max 3 bullets).
        3. Identify missing qualifications or skill gaps (max 3 bullets).

        Return strictly valid JSON:
        {{
            "fit_percentage": 85,
            "strengths": ["string1", "string2"],
            "gaps": ["string1", "string2"],
            "recommendation": "string (Short action summary)"
        }}
        """
        if not self.client:
            return {"fit_percentage": 50, "strengths": ["PDF successfully parsed"], "gaps": ["GEMINI_API_KEY missing - running in fallback mode"], "recommendation": "Configure Gemini API key for full AI analysis."}
        
        try:
            res = self.client.models.generate_content(
                model='gemini-3.1-flash-lite', 
                contents=prompt, 
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            return json.loads(res.text)
        except Exception as e:
            logger.error(f"CV analysis error: {e}")
            return {"fit_percentage": 30, "strengths": [], "gaps": [f"Analysis error: {str(e)}"], "recommendation": "Please try uploading a clearer PDF text document."}

# --- NEW AUTO-SCOUT ENGINE (CV-First Workflow) ---

class AutoJobScout:
    """Reads CV, determines best roles, and searches the web automatically."""
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.search_service = GoogleSearchService()
        self.cv_analyzer = CVAnalyzer()

    def scout_from_cv(self, pdf_file, location: str, work_style: str) -> dict:
        cv_text = self.cv_analyzer.extract_text_from_pdf(pdf_file)
        if not cv_text:
            raise ValueError("Could not read text from the provided PDF.")

        prompt = f"""
        You are an elite AI recruitment matchmaker.
        Analyze the candidate's CV to determine the absolute best job roles for them.
        
        Candidate Preferred Location: "{location}"
        Candidate Work Style Preference: "{work_style}" (e.g., Remote, On-site, Hybrid)

        CANDIDATE CV:
        "{cv_text[:5000]}"

        Task:
        1. Identify the top 2 exact job titles this candidate is most qualified for right now.
        2. Write a 1-sentence summary of the candidate's core professional identity.
        3. Formulate 3 high-conversion Google Search Dorks targeting real job boards (LinkedIn, Greenhouse, Lever, local boards) for these roles, incorporating the location and work style.
        4. Provide a primary Google search query.

        Return strictly valid JSON:
        {{
            "detected_roles": ["Role 1", "Role 2"],
            "candidate_summary": "string",
            "primary_search_query": "string",
            "search_dorks": ["dork1", "dork2", "dork3"]
        }}
        """

        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-3.1-flash-lite',
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                ai_data = json.loads(response.text)
            except Exception as e:
                logger.error(f"AutoScout Gemini error: {e}")
                ai_data = self._fallback_data(location, work_style)
        else:
            ai_data = self._fallback_data(location, work_style)

        # Execute Search based on AI determination
        primary_role = ai_data["detected_roles"][0] if ai_data["detected_roles"] else "Professional"
        search_query = ai_data.get("primary_search_query", f"{primary_role} {location} {work_style} job")
        
        jobs = self.search_service.search(
            query=search_query,
            num_results=12,
            raw_role=primary_role,
            location=location
        )

        return {
            "ai_analysis": ai_data,
            "jobs": jobs,
            "cv_text_snippet": cv_text[:1000] # Kept for faster subsequent single-job analysis
        }

    def _fallback_data(self, location, work_style):
        return {
            "detected_roles": ["General Professional"],
            "candidate_summary": "Parsed successfully, but AI extraction failed or is offline.",
            "primary_search_query": f"Job vacancies {location} {work_style}",
            "search_dorks": [f"site:linkedin.com/jobs {location} {work_style}"]
        }

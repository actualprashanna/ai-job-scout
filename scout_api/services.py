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
                model='gemini-3.5-flash-lite',
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


class CVAnalyzer:
    """Parses PDF CVs and calculates a 30% to 100% fit score against job criteria."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None

    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extracts raw text from an uploaded PDF file."""
        try:
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
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
            return {
                "fit_percentage": 50,
                "strengths": ["PDF successfully parsed"],
                "gaps": ["GEMINI_API_KEY missing - running in fallback mode"],
                "recommendation": "Configure Gemini API key for full AI analysis."
            }

        try:
            response = self.client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"CV analysis error: {e}")
            return {
                "fit_percentage": 30,
                "strengths": [],
                "gaps": [f"Analysis error: {str(e)}"],
                "recommendation": "Please try uploading a clearer PDF text document."
            }


class GoogleSearchService:
    """Queries live web job listings using Custom Search API or robust web search fetcher."""

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.cx_id = os.getenv("GOOGLE_SEARCH_CX")

    def search(self, query: str, num_results: int = 8, raw_role: str = "", location: str = "") -> list:
        """Executes search query against Google API or falls back to live web fetcher."""
        # 1. Try Google Custom Search API if keys exist
        if self.api_key and self.cx_id:
            try:
                params = urllib.parse.urlencode({
                    'key': self.api_key,
                    'cx': self.cx_id,
                    'q': query,
                    'num': min(num_results, 10)
                })
                url = f"https://www.googleapis.com/customsearch/v1?{params}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                
                results = []
                for item in data.get('items', []):
                    results.append({
                        'title': item.get('title'),
                        'link': item.get('link'),
                        'snippet': item.get('snippet')
                    })
                if results:
                    return results
            except Exception as e:
                logger.error(f"Google Custom Search API error: {e}")

        # 2. Try Live Web Search with original query/dork
        results = self._live_web_search(query, max_results=num_results)
        
        # 3. If dork returned 0 results, retry with cleaned keywords
        if not results:
            clean_query = re.sub(r'site:[^\s]+', '', query).replace('"', '').strip()
            clean_query = f"{clean_query} job vacancy hiring"
            results = self._live_web_search(clean_query, max_results=num_results)

        # 4. Localized direct job board generator if web engine is blocked
        if not results:
            results = self._generate_direct_job_board_links(raw_role or query, location)

        return results

    def _live_web_search(self, query: str, max_results: int = 8) -> list:
        """Parses real live web search results directly."""
        try:
            encoded_query = urllib.parse.quote(query)
            # Use DuckDuckGo HTML POST for higher reliability
            data_bytes = urllib.parse.urlencode({'q': query}).encode('utf-8')
            
            req = urllib.request.Request(
                'https://html.duckduckgo.com/html/',
                data=data_bytes,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            )
            
            with urllib.request.urlopen(req, timeout=8) as response:
                html_content = response.read().decode('utf-8', errors='ignore')

            results = []
            # Extract links and snippets from DDG HTML
            items = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html_content, re.DOTALL)
            snippets = re.findall(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', html_content, re.DOTALL)

            for idx, (link, raw_title) in enumerate(items[:max_results]):
                if '/uddg=' in link:
                    actual_link = urllib.parse.unquote(link.split('/uddg=')[1].split('&')[0])
                else:
                    actual_link = link

                clean_title = unescape(re.sub(r'<[^>]+>', '', raw_title)).strip()
                
                snippet_text = ""
                if idx < len(snippets):
                    snippet_text = unescape(re.sub(r'<[^>]+>', '', snippets[idx])).strip()

                if actual_link.startswith('http') and clean_title:
                    results.append({
                        "title": clean_title,
                        "link": actual_link,
                        "snippet": snippet_text if snippet_text else f"Live job listing found on {actual_link}"
                    })

            return results
        except Exception as e:
            logger.error(f"Live web search engine error: {e}")
            return []

    def _generate_direct_job_board_links(self, role: str, location: str) -> list:
        """Constructs targeted direct job search links when external scrapers hit rate limits."""
        role_clean = role.replace('"', '').strip()
        loc_clean = location.replace('"', '').strip() if location else ""
        
        q_param = urllib.parse.quote(f"{role_clean} {loc_clean}".strip())
        role_param = urllib.parse.quote(role_clean)
        loc_param = urllib.parse.quote(loc_clean)

        base_results = [
            {
                "title": f"LinkedIn Jobs: {role_clean} ({loc_clean or 'Worldwide'})",
                "link": f"https://www.linkedin.com/jobs/search/?keywords={role_param}&location={loc_param}",
                "snippet": f"Explore live hiring listings and direct employer applications for {role_clean} in {loc_clean or 'global locations'} on LinkedIn."
            },
            {
                "title": f"Glassdoor: {role_clean} Openings",
                "link": f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={role_param}",
                "snippet": f"View salary ranges, company reviews, and active job postings for {role_clean}."
            },
            {
                "title": f"Indeed Career Portal: {role_clean}",
                "link": f"https://www.indeed.com/jobs?q={role_param}&l={loc_param}",
                "snippet": f"Search thousands of active job vacancies and immediate openings for {role_clean}."
            }
        ]

        # Add region-specific top portals if searching in Nepal
        if 'nepal' in loc_clean.lower() or 'kathmandu' in loc_clean.lower():
            base_results.insert(0, {
                "title": f"Merojob Nepal: {role_clean} Vacancies",
                "link": f"https://merojob.com/search/?q={role_param}",
                "snippet": f"Top rated Nepalese career portal listings for {role_clean} roles across Kathmandu and nationwide."
            })
            base_results.insert(1, {
                "title": f"JobsNepal: {role_clean} Hiring",
                "link": f"https://www.jobsnepal.com/search?q={role_param}",
                "snippet": f"Active job openings, immediate vacancies, and employer contacts in Nepal for {role_clean}."
            })

        return base_results
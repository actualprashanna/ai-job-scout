from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .services import InputTransformer, CVAnalyzer, GoogleSearchService


class TransformInputView(APIView):
    """
    POST /api/transform-input/
    Body: { "raw_input": "...", "user_role_hint": "...", "location": "..." }
    """
    def post(self, request):
        raw_input = request.data.get("raw_input", "").strip()
        if not raw_input:
            return Response(
                {"error": "raw_input field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        role_hint = request.data.get("user_role_hint", "")
        location = request.data.get("location", "")

        transformer = InputTransformer()
        result = transformer.transform(
            raw_input=raw_input,
            user_role_hint=role_hint,
            location=location
        )
        return Response(result, status=status.HTTP_200_OK)


class AnalyzeCVView(APIView):
    """
    POST /api/analyze-cv/
    Form-Data:
      - cv_file: PDF file upload
      - job_description: Target job text
    """
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        pdf_file = request.FILES.get('cv_file')
        job_description = request.data.get('job_description', '').strip()

        if not pdf_file or not job_description:
            return Response(
                {"error": "Both 'cv_file' (PDF) and 'job_description' text are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        analyzer = CVAnalyzer()
        cv_text = analyzer.extract_text_from_pdf(pdf_file)
        
        if not cv_text:
            return Response(
                {"error": "Failed to extract text from PDF. Ensure file is not scanned/image-only."},
                status=status.HTTP_400_BAD_REQUEST
            )

        analysis = analyzer.analyze_fit(cv_text, job_description)
        return Response(analysis, status=status.HTTP_200_OK)
    
class SearchJobsView(APIView):
    """
    POST /api/search-jobs/
    Body: { "query": "..." } or { "raw_input": "..." }
    Runs InputTransformer dorks through Google Search Engine.
    """
    def post(self, request):
        raw_input = request.data.get("raw_input", "").strip()
        location = request.data.get("location", "")

        if not raw_input:
            return Response({"error": "raw_input is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Transform raw prompt into search query/dorks
        transformer = InputTransformer()
        transform_res = transformer.transform(raw_input, location=location)

        # 2. Perform live Google Search using primary dork
        search_engine = GoogleSearchService()
        dorks = transform_res.get("search_dorks", [])
        primary_dork = dorks[0] if dorks else transform_res.get("primary_search_query", raw_input)

        results = search_engine.search(primary_dork)

        return Response({
            "transformation": transform_res,
            "dork_used": primary_dork,
            "results_count": len(results),
            "jobs": results
        }, status=status.HTTP_200_OK)
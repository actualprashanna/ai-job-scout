from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .services import InputTransformer, CVAnalyzer, GoogleSearchService, AutoJobScout
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import UserProfile


class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, password=password)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

class AutoScoutView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cv_file = request.FILES.get('cv_file')
        location = request.data.get('location', '')
        work_style = request.data.get('work_style', '')
        
        # SMART LOGIC: If no file uploaded, try to get it from the profile
        if not cv_file:
            try:
                profile = UserProfile.objects.get(user=request.user)
                cv_file = profile.cv_file # This is the FileField object
            except UserProfile.DoesNotExist:
                pass
        
        if not cv_file:
            return Response({'error': 'No CV file provided or found on profile.'}, status=status.HTTP_400_BAD_REQUEST)

        scout = AutoJobScout()
        try:
            # result = scout.scout_from_cv(cv_file, location, work_style)
            # NOTE: scout_from_cv usually expects a file-like object or path
            result = scout.scout_from_cv(cv_file, location, work_style)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class AnalyzeCVView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pdf_file = request.FILES.get('cv_file')
        job_description = request.data.get('job_description', '').strip()
        if not pdf_file or not job_description:
            return Response({"error": "CV and Job Description are required."}, status=status.HTTP_400_BAD_REQUEST)

        analyzer = CVAnalyzer()
        cv_text = analyzer.extract_text_from_pdf(pdf_file)
        if not cv_text:
            return Response({"error": "Failed to extract text from CV PDF."}, status=status.HTTP_400_BAD_REQUEST)

        analysis = analyzer.analyze_fit(cv_text, job_description)
        return Response(analysis, status=status.HTTP_200_OK)

class ProfileView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        # Extract filename from path (e.g., 'resumes/my_cv.pdf' -> 'my_cv.pdf')
        filename = profile.cv_file.name.split('/')[-1] if profile.cv_file else None
        print(f"DEBUG: Serving profile for {request.user.username}. CV File: {filename}")
        return Response({
            "user_prompt": profile.raw_input or "",
            "cv_name": filename
        })

    def post(self, request):
        print(f"DEBUG: Received request files: {request.FILES}")
        print(f"DEBUG: Received request data: {request.data}")
        
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        
        raw_input = request.data.get('raw_input')
        if raw_input is not None:
            profile.raw_input = raw_input
            
        if 'cv_file' in request.FILES:
            print(f"DEBUG: Saving file: {request.FILES['cv_file'].name}")
            profile.cv_file = request.FILES['cv_file']
            
        profile.save()
        return Response({"status": "saved"})
    def delete(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.cv_file:
            profile.cv_file.delete() # Deletes file from storage
            profile.cv_file = None
            profile.save()
        return Response({"status": "removed"})

class TransformInputView(APIView):
    def post(self, request):
        raw_input = request.data.get("raw_input", "").strip()
        if not raw_input:
            return Response({"error": "raw_input is required."}, status=status.HTTP_400_BAD_REQUEST)
        transformer = InputTransformer()
        result = transformer.transform(raw_input=raw_input)
        return Response(result, status=status.HTTP_200_OK)

class SearchJobsView(APIView):
    def post(self, request):
        raw_input = request.data.get("raw_input", "").strip()
        location = request.data.get("location", "")
        if not raw_input:
            return Response({"error": "raw_input is required."}, status=status.HTTP_400_BAD_REQUEST)
        transformer = InputTransformer()
        transform_res = transformer.transform(raw_input, location=location)
        search_engine = GoogleSearchService()
        primary_dork = transform_res.get("primary_search_query", raw_input)
        results = search_engine.search(primary_dork, raw_role=raw_input, location=location)
        return Response({"transformation": transform_res, "jobs": results}, status=status.HTTP_200_OK)
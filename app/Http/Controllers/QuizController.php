<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateQuizJob;
use App\Models\Experience;
use App\Models\Quiz;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class QuizController extends Controller
{
    public function index()
    {
        $quizzes = Quiz::orderBy('created_at', 'desc')->get(); // Fetch all quizzes, newest first

        return Inertia::render('Quizzes/Index', [
            'quizzes' => $quizzes,
        ]);
    }

    public function create()
    {
        return Inertia::render('Quizzes/Create');
    }

    /**
     * Store a newly created quiz in storage, including TTS audio for questions and choices.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'level' => 'required|string|in:beginner,intermediate,advanced',
            'number_of_questions' => 'required|integer|min:1|max:20',
        ]);

        // Dispatch the job
        GenerateQuizJob::dispatch(
            $validated['title'],
            $validated['level'],
            $validated['number_of_questions'],
            Auth::id()
        );

        return redirect()->route('dashboard')->with('flash', 'Quiz generation started! You will be notified when it is ready.');
    }

    /**
     * Generate audio for the given text using Unrealspeech and return the public URL.
     *
     * @param  string  $text  The text to synthesize.
     * @return string|null The public URL (OutputUri) of the audio file, or null on failure.
     */
    private function generateAndStoreAudioUnrealSpeech(string $text): ?string
    {
        if (empty(trim($text))) {
            return null;
        }

        $unrealApiKey = env('UNREALSPEECH_API_KEY');
        if (! $unrealApiKey) {
            Log::warning('UNREALSPEECH_API_KEY not set. Skipping audio generation for quiz content.');

            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$unrealApiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api.v8.unrealspeech.com/speech', [
                'Text' => $text,
                'VoiceId' => 'Sierra',
                // No 'OutputFormat' => 'uri' needed if API defaults to returning OutputUri in JSON
            ]);

            if ($response->successful()) {
                $contentType = $response->header('Content-Type');
                if (str_contains($contentType, 'application/json')) {
                    $audioUrl = $response->json('OutputUri');
                    if ($audioUrl) {
                        return $audioUrl;
                    }
                    Log::error('Unrealspeech JSON response did not contain OutputUri for quiz content.', [
                        'text_length' => strlen($text),
                        'response_body' => $response->body(),
                    ]);

                    return null;
                } elseif (str_contains($contentType, 'audio/')) {
                    Log::error('Unrealspeech returned direct audio stream instead of JSON with OutputUri. Cannot store OutputUri as per requirement.', [
                        'text_length' => strlen($text),
                        'content_type' => $contentType,
                    ]);

                    return null; // Do not use Laravel Storage
                } else {
                    Log::error('Unrealspeech returned unexpected content type for quiz content.', [
                        'text_length' => strlen($text),
                        'content_type' => $contentType,
                        'response_body' => $response->body(),
                    ]);

                    return null;
                }
            } else {
                Log::error('Unrealspeech API error for quiz content.', [
                    'text_length' => strlen($text),
                    'status' => $response->status(),
                    'response_body' => $response->body(),
                ]);

                return null;
            }
        } catch (\Exception $e) {
            Log::error('Unrealspeech request failed for quiz content.', [
                'text_length' => strlen($text),
                'error_message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function show(Quiz $quiz)
    {
        return Inertia::render('Quizzes/Show', [
            'quiz' => $quiz,
        ]);
    }

    public function submit(Request $request, Quiz $quiz)
    {
        $validated = $request->validate([
            'answers.*' => 'required|string',
        ]);

        $correctAnswers = 0;
        $totalQuestions = count($quiz->questions);

        foreach ($quiz->questions as $index => $question) {
            if (isset($validated['answers'][$index]) && $validated['answers'][$index] === $question['correct_answer']) {
                $correctAnswers++;
            }
        }

        $score = ($totalQuestions > 0) ? ($correctAnswers / $totalQuestions) * 100 : 0;

        $experiencePoints = 0;
        switch ($quiz->level) {
            case 'beginner':
                $experiencePoints = $correctAnswers * 10;
                break;
            case 'intermediate':
                $experiencePoints = $correctAnswers * 20;
                break;
            case 'advanced':
                $experiencePoints = $correctAnswers * 30;
                break;
        }

        $user = Auth::user();
        $updatedUser = null;

        if ($user instanceof User) {
            if ($experiencePoints > 0) {
                Experience::create([
                    'user_id' => $user->id,
                    'title' => 'Quiz: '.$quiz->title,
                    'experience_score' => $experiencePoints,
                ]);
            }

            $user->total_experience = ($user->total_experience ?? 0) + $experiencePoints;
            $today = Carbon::today();

            if ($user->last_streak_date) {
                $lastStreakDate = Carbon::parse($user->last_streak_date);
                if ($lastStreakDate->isYesterday()) {
                    $user->current_streak = ($user->current_streak ?? 0) + 1;
                } elseif (! $lastStreakDate->isToday()) {
                    $user->current_streak = 1;
                }
            } else {
                $user->current_streak = 1;
            }
            $user->last_streak_date = $today;
            $user->save();
            $updatedUser = $user->fresh(); // Get a fresh instance of the user model
        } elseif (Auth::check()) {
            Log::warning('User is authenticated but Auth::user() did not return a User instance.', ['user_id' => Auth::id()]);
        }

        return Inertia::render('Quizzes/Results', [
            'quiz' => $quiz,
            'score' => $score,
            'correctAnswers' => $correctAnswers,
            'totalQuestions' => $totalQuestions,
            'experiencePoints' => $experiencePoints,
            'userAnswers' => $validated['answers'],
            'user' => $updatedUser, // Pass the fresh user model or null
        ]);
    }
}

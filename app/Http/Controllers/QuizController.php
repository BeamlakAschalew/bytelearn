<?php

namespace App\Http\Controllers;

use App\Models\Experience;
use App\Models\Quiz;
use App\Models\User;
use Carbon\Carbon;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class QuizController extends Controller
{
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

        $prompt = sprintf(
            'Create a %s choice quiz with %d questions about %s. '.
            'For each question, provide 4 choices and indicate the correct answer. '.
            'Format the output as a JSON array, where each element is an object '.
            'representing a question. Each question object should have the following keys: '.
            "\'question\' (string), \'choices\' (array of 4 strings), and \'correct_answer\' (string, one of the choices).",
            $validated['level'],
            $validated['number_of_questions'],
            $validated['title']
        );

        try {
            $geminiResponse = Gemini::generativeModel(model: 'gemini-1.5-flash-latest')->generateContent($prompt);
            $responseText = $geminiResponse->text();

            $cleanedResponseText = preg_replace('/^```json\s*|\s*```$/', '', $responseText);
            $cleanedResponseText = preg_replace('/^```\s*|\s*```$/', '', $cleanedResponseText);

            $rawQuestions = json_decode($cleanedResponseText, true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($rawQuestions)) {
                Log::error('Failed to decode Gemini response or response is not an array.', [
                    'cleanedResponse' => $cleanedResponseText,
                    'originalResponse' => $responseText,
                    'jsonError' => json_last_error_msg(),
                ]);

                return back()->withErrors(['gemini' => 'Failed to generate quiz questions. Please try again.']);
            }

            $processedQuestions = [];
            foreach ($rawQuestions as $index => $question) {
                if (! isset($question['question']) || ! is_string($question['question'])) {
                    Log::error('Invalid question text.', ['questionIndex' => $index, 'questionData' => $question]);

                    return back()->withErrors(['gemini' => 'Failed to generate valid quiz questions (invalid question text).']);
                }
                if (! isset($question['choices']) || ! is_array($question['choices'])) {
                    Log::error('Invalid choices format.', ['questionIndex' => $index, 'questionData' => $question]);

                    return back()->withErrors(['gemini' => 'Failed to generate valid quiz questions (invalid choices format).']);
                }
                if (! isset($question['correct_answer']) || ! is_string($question['correct_answer'])) {
                    Log::error('Invalid correct answer format.', ['questionIndex' => $index, 'questionData' => $question]);

                    return back()->withErrors(['gemini' => 'Failed to generate valid quiz questions (invalid correct answer).']);
                }
                if (count($question['choices']) !== 4) {
                    Log::error('Invalid number of choices for a question.', ['questionIndex' => $index, 'response' => $responseText]);

                    return back()->withErrors(['gemini' => 'Quiz questions must have exactly 4 choices.']);
                }
                if (! in_array($question['correct_answer'], $question['choices'])) {
                    Log::error('Correct answer not found in choices.', ['questionIndex' => $index, 'response' => $responseText]);

                    return back()->withErrors(['gemini' => 'An internal error occurred with quiz generation (correct answer mismatch).']);
                }

                // Generate audio for the question text using Unrealspeech
                $questionAudioUrl = $this->generateAndStoreAudioUnrealSpeech($question['question']);

                $transformedChoices = [];
                foreach ($question['choices'] as $choiceText) {
                    if (! is_string($choiceText)) {
                        Log::error('Invalid choice text.', ['questionIndex' => $index, 'choice' => $choiceText]);

                        continue;
                    }
                    // Generate audio for the choice text using Unrealspeech
                    $choiceAudioUrl = $this->generateAndStoreAudioUnrealSpeech($choiceText);
                    $transformedChoices[] = [
                        'text' => $choiceText,
                        'audio_url' => $choiceAudioUrl, // Store OutputUri
                    ];
                }

                if (count($transformedChoices) !== 4) {
                    Log::error('Number of choices changed after processing.', ['questionIndex' => $index, 'originalChoicesCount' => count($question['choices']), 'transformedChoicesCount' => count($transformedChoices)]);

                    return back()->withErrors(['gemini' => 'An internal error occurred while processing quiz choices.']);
                }

                $processedQuestions[] = [
                    'question' => $question['question'],
                    'question_audio_url' => $questionAudioUrl, // Store OutputUri
                    'choices' => $transformedChoices,
                    'correct_answer' => $question['correct_answer'],
                ];
            }

            if (count($processedQuestions) !== (int) $validated['number_of_questions']) {
                Log::error('Mismatch in number of questions generated vs requested.', [
                    'requested' => $validated['number_of_questions'],
                    'generated' => count($processedQuestions),
                    'rawQuestionsCount' => count($rawQuestions),
                ]);

                return back()->withErrors(['gemini' => 'Could not generate the exact number of requested questions. Please try again.']);
            }

            $quiz = Quiz::create([
                'title' => $validated['title'],
                'level' => $validated['level'],
                'number_of_questions' => $validated['number_of_questions'],
                'questions' => $processedQuestions,
                'user_id' => Auth::id(),
            ]);

            return redirect()->route('quizzes.show', $quiz);
        } catch (\Exception $e) {
            Log::error('Quiz generation or TTS error: '.$e->getMessage(), [
                'prompt' => $prompt,
                'exception_trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['gemini' => 'Error generating quiz: '.$e->getMessage()]);
        }
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
                'VoiceId' => 'Sierra', // As used in PersonalizationController
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

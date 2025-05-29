<?php

namespace App\Http\Controllers;

use App\Models\Experience;
use App\Models\Quiz;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class QuizController extends Controller
{
    public function create()
    {
        return Inertia::render('Quizzes/Create');
    }

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
            "'question' (string), 'choices' (array of 4 strings), and 'correct_answer' (string, one of the choices).",
            $validated['level'],
            $validated['number_of_questions'],
            $validated['title']
        );

        try {
            $geminiResponse = Gemini::generativeModel(model: 'gemini-1.5-flash-latest')->generateContent($prompt);
            $responseText = $geminiResponse->text();

            // Clean the response text: remove markdown code block fences
            $cleanedResponseText = preg_replace('/^```json\s*|\s*```$/', '', $responseText);
            $cleanedResponseText = preg_replace('/^```\s*|\s*```$/', '', $cleanedResponseText); // Handle cases without 'json'

            $questions = json_decode($cleanedResponseText, true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($questions)) {
                Log::error('Failed to decode Gemini response or response is not an array. Cleaned Response: '.$cleanedResponseText.' Original Response: '.$responseText);

                return back()->withErrors(['gemini' => 'Failed to generate quiz questions. Please try again.']);
            }

            // Validate the structure of each question
            foreach ($questions as $index => $question) {
                if (! isset($question['question']) || ! isset($question['choices']) || ! isset($question['correct_answer'])) {
                    Log::error('Invalid question structure from Gemini. Question index: '.$index.' Response: '.$geminiResponse->text());

                    return back()->withErrors(['gemini' => 'Failed to generate valid quiz questions. Please check the format.']);
                }
                if (count($question['choices']) !== 4) {
                    Log::error('Invalid number of choices for a question. Question index: '.$index.' Response: '.$geminiResponse->text());

                    return back()->withErrors(['gemini' => 'Quiz questions must have exactly 4 choices.']);
                }
                if (! in_array($question['correct_answer'], $question['choices'])) {
                    Log::error('Correct answer not found in choices. Question index: '.$index.' Response: '.$geminiResponse->text());

                    return back()->withErrors(['gemini' => 'An internal error occurred with quiz generation.']);
                }
            }

            $quiz = Quiz::create([
                'title' => $validated['title'],
                'level' => $validated['level'],
                'number_of_questions' => $validated['number_of_questions'],
                'questions' => $questions,
            ]);

            return redirect()->route('quizzes.show', $quiz);
        } catch (\Exception $e) {
            Log::error('Gemini API error: '.$e->getMessage().' Prompt: '.$prompt);

            return back()->withErrors(['gemini' => 'Error generating quiz questions: '.$e->getMessage()]);
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
            'answers' => 'required|array',
            'answers.*' => 'required|string', // Ensure each answer is a string
        ]);

        $score = 0;
        $correctAnswers = 0;
        $totalQuestions = count($quiz->questions);

        foreach ($quiz->questions as $index => $question) {
            if (isset($validated['answers'][$index]) && $validated['answers'][$index] === $question['correct_answer']) {
                $correctAnswers++;
            }
        }

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

        if (Auth::check() && $experiencePoints > 0) {
            Experience::create([
                'user_id' => Auth::id(),
                'title' => 'Quiz: '.$quiz->title,
                'experience_score' => $experiencePoints,
            ]);
        }

        return Inertia::render('Quizzes/Results', [
            'quiz' => $quiz,
            'score' => $correctAnswers,
            'totalQuestions' => $totalQuestions,
            'experienceGained' => $experiencePoints,
            'userAnswers' => $validated['answers'],
        ]);
    }
}

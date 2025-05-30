<?php

namespace App\Jobs;

use App\Models\Quiz;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenerateQuizJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 6000; // 5 minutes

    protected string $title;

    protected string $level;

    protected int $numberOfQuestions;

    protected int $userId;

    /**
     * Create a new job instance.
     */
    public function __construct(string $title, string $level, int $numberOfQuestions, int $userId)
    {
        $this->title = $title;
        $this->level = $level;
        $this->numberOfQuestions = $numberOfQuestions;
        $this->userId = $userId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $prompt = sprintf(
            'Create a %s choice quiz with %d questions about %s. '.
            'For each question, provide 4 choices and indicate the correct answer. '.
            'Format the output as a JSON array, where each element is an object '.
            'representing a question. Each question object should have the following keys: '.
            "\'question\' (string), \'choices\' (array of 4 strings), and \'correct_answer\' (string, one of the choices).",
            $this->level,
            $this->numberOfQuestions,
            $this->title
        );

        try {
            $geminiResponse = Gemini::generativeModel(model: 'gemini-1.5-flash-latest')->generateContent($prompt);
            $responseText = $geminiResponse->text();

            $cleanedResponseText = preg_replace('/^```json\s*|\s*```$/', '', $responseText);
            $cleanedResponseText = preg_replace('/^```\s*|\s*```$/', '', $cleanedResponseText);

            $rawQuestions = json_decode($cleanedResponseText, true);

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($rawQuestions)) {
                Log::error('Failed to decode Gemini response or response is not an array in Job.', [
                    'title' => $this->title,
                    'level' => $this->level,
                    'userId' => $this->userId,
                    'cleanedResponse' => $cleanedResponseText,
                    'originalResponse' => $responseText,
                    'jsonError' => json_last_error_msg(),
                ]);

                return;
            }

            $processedQuestions = [];
            foreach ($rawQuestions as $index => $question) {
                if (! isset($question['question']) || ! is_string($question['question'])) {
                    Log::error('Invalid question text in Job.', ['questionIndex' => $index, 'questionData' => $question, 'quizTitle' => $this->title]);

                    continue;
                }
                if (! isset($question['choices']) || ! is_array($question['choices']) || count($question['choices']) !== 4) {
                    Log::error('Invalid choices in Job.', ['questionIndex' => $index, 'questionData' => $question, 'quizTitle' => $this->title]);

                    continue;
                }
                if (! isset($question['correct_answer']) || ! is_string($question['correct_answer']) || ! in_array($question['correct_answer'], $question['choices'])) {
                    Log::error('Invalid correct answer in Job.', ['questionIndex' => $index, 'questionData' => $question, 'quizTitle' => $this->title]);

                    continue;
                }

                $questionAudioUrl = $this->generateAndStoreAudioUnrealSpeech($question['question']);

                $transformedChoices = [];
                foreach ($question['choices'] as $choiceText) {
                    $choiceAudioUrl = $this->generateAndStoreAudioUnrealSpeech($choiceText);
                    $transformedChoices[] = [
                        'text' => $choiceText,
                        'audio_url' => $choiceAudioUrl,
                    ];
                }

                if (count($transformedChoices) !== 4) {
                    Log::error('Mismatch in number of transformed choices in Job.', ['questionIndex' => $index, 'quizTitle' => $this->title]);

                    continue;
                }

                $processedQuestions[] = [
                    'question' => $question['question'],
                    'question_audio_url' => $questionAudioUrl,
                    'choices' => $transformedChoices,
                    'correct_answer' => $question['correct_answer'],
                ];
            }

            if (count($processedQuestions) !== $this->numberOfQuestions) {
                Log::warning('Mismatch in number of questions generated vs requested in Job.', [
                    'requested' => $this->numberOfQuestions,
                    'generated' => count($processedQuestions),
                    'quizTitle' => $this->title,
                    'userId' => $this->userId,
                ]);
                if (empty($processedQuestions)) {
                    Log::error('No valid questions processed for quiz in Job.', ['quizTitle' => $this->title, 'userId' => $this->userId]);

                    return;
                }
            }

            Quiz::create([
                'title' => $this->title,
                'level' => $this->level,
                'number_of_questions' => count($processedQuestions),
                'questions' => $processedQuestions,
                'user_id' => $this->userId,
            ]);

            Log::info('Quiz generated successfully by Job', ['title' => $this->title, 'userId' => $this->userId]);

        } catch (\Exception $e) {
            Log::error('Quiz generation or TTS error in Job: '.$e->getMessage(), [
                'title' => $this->title,
                'userId' => $this->userId,
                'exception_trace' => $e->getTraceAsString(),
            ]);
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
            Log::warning('UNREALSPEECH_API_KEY not set in Job. Skipping audio generation.');

            return null;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$unrealApiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api.v8.unrealspeech.com/speech', [
                'Text' => $text,
                'VoiceId' => 'Sierra',
            ]);

            if ($response->successful()) {
                $contentType = $response->header('Content-Type');
                if (str_contains($contentType, 'application/json')) {
                    $responseData = $response->json();

                    return $responseData['OutputUri'] ?? null;
                } elseif (str_contains($contentType, 'audio/')) {
                    Log::warning('Unrealspeech returned direct audio stream, but URL was expected in Job.', ['text' => substr($text, 0, 50)]);

                    return null;
                } else {
                    Log::error('Unrealspeech API returned unexpected content type in Job.', [
                        'content_type' => $contentType,
                        'response_body' => $response->body(),
                    ]);

                    return null;
                }
            } else {
                Log::error('Unrealspeech API error in Job.', [
                    'status_code' => $response->status(),
                    'response_body' => $response->body(),
                    'text' => substr($text, 0, 50),
                ]);

                return null;
            }
        } catch (\Exception $e) {
            Log::error('Unrealspeech request failed in Job.', [
                'text_length' => strlen($text),
                'error_message' => $e->getMessage(),
            ]);

            return null;
        }
    }
}

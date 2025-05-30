<?php

namespace App\Http\Controllers;

use App\Http\Requests\PersonalizationRequest;
use App\Models\Personalization;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request; // Kept for potential use by other existing methods
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PersonalizationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $userId = Auth::id();
        $learningPaths = Personalization::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($path) {
                return [
                    'id' => $path->id,
                    'topic' => $path->name, // Assuming 'name' field stores the topic
                    'level' => $path->description, // Assuming 'description' field stores the level
                    'date' => $path->created_at->toDateString(),
                ];
            });

        return Inertia::render('history', ['learningPaths' => $learningPaths]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Initiate the personalization store process and return a stream ID.
     */
    public function initiateStore(PersonalizationRequest $request)
    {
        $validated = $request->validated();
        $userId = Auth::id(); // Get user ID, can be null if guest

        $streamId = Str::uuid()->toString();

        // Store the validated data and user ID in cache for the streamResponse method
        Cache::put('personalization_stream_'.$streamId, [
            'validated_data' => $validated,
            'user_id' => $userId,
        ], now()->addMinutes(15)); // Cache for 15 minutes

        return response()->json(['streamId' => $streamId]);
    }

    /**
     * Handle the Server-Sent Events stream for personalization.
     */
    public function streamResponse(string $streamId)
    {
        $cachedData = Cache::get('personalization_stream_'.$streamId);

        if (! $cachedData) {
            return new StreamedResponse(function () {
                echo "event: streamError\n";
                echo 'data: '.json_encode(['error' => 'Invalid or expired stream ID. Please try again.'])."\n\n";
                ob_flush();
                flush();
            }, 200, $this->getSseHeaders());
        }

        $validated = $cachedData['validated_data'];
        $userId = $cachedData['user_id'];

        $response = new StreamedResponse(function () use ($validated, $userId, $streamId) {
            $basePrompt = 'Explain in full depth about '.$validated['topic'].
                          ' at a '.$validated['learning_level'].' level.';

            if (! empty($validated['content_type']) && $validated['content_type'] !== 'Default') {
                switch ($validated['content_type']) {
                    case 'Concise':
                        $basePrompt .= ' Keep the explanation concise.';
                        break;
                    case 'Detailed':
                        $basePrompt .= ' Provide a detailed explanation.';
                        break;
                    case 'With Analogies':
                        $basePrompt .= ' Include analogies to help understanding.';
                        break;
                    case 'Include Visuals':
                        $basePrompt .= ' Describe any relevant visuals that would aid understanding.';
                        break;
                }
            } else {
                $basePrompt .= ' Attach any relevant examples or analogies to help understanding. Attach any resources like blogs, articles, or videos that can help the user understand the topic better.';
            }

            if (! empty($validated['note'])) {
                $basePrompt .= ' Note: '.$validated['note'];
            }

            $finalPrompt = $basePrompt;
            $generatedText = '';
            $audioUrl = null;
            $audioError = null;

            try {
                $stream = Gemini::generativeModel(model: 'gemini-1.5-flash')
                    ->streamGenerateContent($finalPrompt);

                foreach ($stream as $responseChunk) {
                    $textChunk = $responseChunk->text();
                    if (! empty($textChunk)) {
                        echo "event: textChunk\n";
                        echo 'data: '.json_encode(['textChunk' => $textChunk])."\n\n";
                        ob_flush();
                        flush();
                        $generatedText .= $textChunk;
                    }
                }

                if (empty($generatedText)) {
                    Log::warning('SSE stream: Generated text is empty after Gemini stream for ID: '.$streamId.' Prompt: '.$finalPrompt);
                    echo "event: streamError\n";
                    echo 'data: '.json_encode(['error' => 'No content was generated from the AI.'])."\n\n";
                    ob_flush();
                    flush();
                }

                if (! empty($generatedText)) {
                    $unrealApiKey = env('UNREALSPEECH_API_KEY');
                    if ($unrealApiKey) {
                        try {
                            $unrealResponse = Http::withHeaders([
                                'Authorization' => 'Bearer '.$unrealApiKey,
                                'Content-Type' => 'application/json',
                            ])->post('https://api.v8.unrealspeech.com/speech', [
                                'Text' => $generatedText,
                                'VoiceId' => 'Sierra', // Hardcoded
                            ]);

                            if ($unrealResponse->successful()) {
                                $contentType = $unrealResponse->header('Content-Type');
                                if (str_contains($contentType, 'application/json')) {
                                    $audioUrl = $unrealResponse->json('OutputUri');
                                    if (! $audioUrl) {
                                        Log::error('Unrealspeech JSON response did not contain OutputUri. Body: '.$unrealResponse->body());
                                        $audioError = 'Failed to retrieve audio URL from Unrealspeech (Invalid JSON response).';
                                    }
                                } elseif (str_contains($contentType, 'audio/')) {
                                    $audioContent = $unrealResponse->body();
                                    $filename = 'public/tts_audio/'.Str::uuid().'.mp3';
                                    Storage::put($filename, $audioContent);
                                    $audioUrl = Storage::url($filename);
                                } else {
                                    Log::error('Unrealspeech returned unexpected content type: '.$contentType.' Body: '.$unrealResponse->body());
                                    $audioError = 'Failed to process audio response from Unrealspeech (Unexpected content type).';
                                }
                            } else {
                                Log::error('Unrealspeech API error: '.$unrealResponse->status().' - '.$unrealResponse->body());
                                $audioError = 'Failed to generate audio: Unrealspeech API error ('.$unrealResponse->status().' - '.$unrealResponse->body().').';
                            }
                        } catch (\Exception $e) {
                            Log::error('Unrealspeech request failed: '.$e->getMessage());
                            $audioError = 'Failed to generate audio due to a network or server issue with Unrealspeech.';
                        }
                    } else {
                        Log::warning('UNREALSPEECH_API_KEY not set. Skipping audio generation.');
                        $audioError = 'Audio generation is not configured (API key missing).';
                    }

                    if ($userId) { // Only save if user is logged in
                        Personalization::create([
                            'user_id' => $userId,
                            'name' => $validated['topic'],
                            'description' => 'Generated content for '.$validated['topic'].' at '.$validated['learning_level'].' level.',
                            'note' => $validated['note'] ?? null,
                            'content' => $generatedText,
                            'audio_file' => $audioUrl,
                        ]);
                    }
                }

                echo "event: audioDetails\n";
                echo 'data: '.json_encode(['audioUrl' => $audioUrl, 'audioError' => $audioError, 'fullText' => $generatedText])."\n\n";
                ob_flush();
                flush();

            } catch (\Exception $e) {
                Log::error('SSE stream: Gemini content generation error: '.$e->getMessage().' Prompt: '.$finalPrompt);
                echo "event: streamError\n";
                echo 'data: '.json_encode(['error' => 'Error during content generation: '.$e->getMessage()])."\n\n";
                ob_flush();
                flush();
            } finally {
                echo "event: streamEnd\n";
                echo 'data: '.json_encode(['message' => 'Stream completed.'])."\n\n";
                ob_flush();
                flush();

                // Clean up cache
                Cache::forget('personalization_stream_'.$streamId);
            }
        }, 200, $this->getSseHeaders());

        return $response;
    }

    private function getSseHeaders(): array
    {
        return [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no', // Important for Nginx
            'Connection' => 'keep-alive',
        ];
    }

    /**
     * Display the specified resource.
     */
    public function show(Personalization $personalization)
    {
        if (Auth::id() !== $personalization->user_id) {
            abort(403, 'Unauthorized action.');
        }

        return Inertia::render('ai-result', [
            'personalization_data' => [
                'id' => $personalization->id,
                'topic' => $personalization->name,
                'description' => $personalization->description,
                'content' => $personalization->content,
                'notes' => $personalization->note,
                'date' => $personalization->created_at->toDateString(),
                'audio_file' => $personalization->audio_file,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Personalization $personalization)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Personalization $personalization)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Personalization $personalization)
    {
        //
    }
}

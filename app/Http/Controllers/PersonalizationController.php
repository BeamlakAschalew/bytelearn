<?php

namespace App\Http\Controllers;

use App\Http\Requests\PersonalizationRequest;
use App\Models\Personalization;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log; // Added for Unrealspeech
use Illuminate\Support\Facades\Storage; // Added for saving audio
use Illuminate\Support\Str; // Added for generating unique filenames

class PersonalizationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(PersonalizationRequest $request)
    {
        $validated = $request->validated();

        $basePrompt = 'Explain in full depth about '.$validated['topic'].
                      ' at a '.$validated['learning_level'].' level.';

        // Append content type preference to the prompt
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
            $stream = Gemini::generativeModel(model: 'gemini-1.5-flash') // Assuming you might prefer 1.5-flash
                ->streamGenerateContent($finalPrompt);

            foreach ($stream as $responseChunk) {
                $generatedText .= $responseChunk->text();
            }

            if (! empty($generatedText)) {
                // Now, get the audio from Unrealspeech
                $unrealApiKey = env('UNREALSPEECH_API_KEY');
                if ($unrealApiKey) {
                    try {
                        $response = Http::withHeaders([
                            'Authorization' => 'Bearer '.$unrealApiKey,
                            'Content-Type' => 'application/json',
                        ])->post('https://api.v8.unrealspeech.com/speech', [
                            'Text' => $generatedText,
                            'VoiceId' => 'af_bella', // Hardcoded as per preference
                            // 'Bitrate' => '192k', // Optional: default is 192k
                            // 'TimestampType' => 'sentence', // Optional
                        ]);

                        if ($response->successful()) {
                            Log::info('Unrealspeech response: '.$response->body());
                            $contentType = $response->header('Content-Type');
                            if (str_contains($contentType, 'application/json')) {
                                Log::info('Unrealspeech returned JSON content.');
                                $audioUrl = $response->json('OutputUri');
                                if (! $audioUrl) {
                                    Log::error('Unrealspeech JSON response did not contain OutputUri.');
                                    $audioError = 'Failed to retrieve audio URL from Unrealspeech.';
                                }

                            } elseif (str_contains($contentType, 'audio/')) {
                                $audioContent = $response->body();
                                $filename = 'public/tts_audio/'.Str::uuid().'.mp3';
                                Storage::put($filename, $audioContent);
                                $audioUrl = Storage::url($filename);
                            } else {
                                Log::error('Unrealspeech returned unexpected content type: '.$contentType.' Body: '.$response->body());
                                $audioError = 'Failed to process audio response from Unrealspeech.';
                            }
                        } else {
                            Log::error('Unrealspeech API error: '.$response->status().' - '.$response->body());
                            $audioError = 'Failed to generate audio: Unrealspeech API error ('.$response->status().').';
                        }
                    } catch (\Exception $e) {
                        Log::error('Unrealspeech request failed: '.$e->getMessage());
                        $audioError = 'Failed to generate audio due to a network or server issue.';
                    }
                } else {
                    Log::warning('UNREALSPEECH_API_KEY not set. Skipping audio generation.');
                    $audioError = 'Audio generation is not configured (API key missing).';
                }
            } else {
                $generatedText = 'Failed to generate text content.'; // Should not happen if Gemini works
            }

            if (Auth::check() && ! empty($generatedText) && $generatedText !== 'Failed to generate text content.') {
                Personalization::create([
                    'user_id' => Auth::id(),
                    'name' => $validated['topic'],
                    'description' => 'Generated content for '.$validated['topic'].' at '.$validated['learning_level'].' level.',
                    'note' => $validated['note'] ?? null,
                    'content' => $generatedText,
                    'audio_file' => $audioUrl,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Gemini content generation error: '.$e->getMessage().' Prompt: '.$finalPrompt);

            return response()->json([
                'textContent' => 'Error: Unable to generate content at this time. Please try again later.',
                'audioUrl' => null,
                'error' => 'Gemini API error: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'textContent' => $generatedText,
            'audioUrl' => $audioUrl,
            'error' => $audioError,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Personalization $personalization)
    {
        //
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

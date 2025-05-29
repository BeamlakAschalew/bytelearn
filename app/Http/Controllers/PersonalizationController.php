<?php

namespace App\Http\Controllers;

use App\Http\Requests\PersonalizationRequest;
use App\Models\Personalization;
use Gemini\Laravel\Facades\Gemini;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        $prompt = 'Explain in full depth about '.$validated['topic'].
                  ' at a '.$validated['learning_level'].' level.';
        if (! empty($validated['note'])) {
            $prompt .= ' Note: '.$validated['note'];
        }

        $fullResponse = ''; // Variable to accumulate the full response

        return new StreamedResponse(function () use ($prompt, $validated, &$fullResponse) {
            if (ob_get_level() > 0) {
                ob_end_flush();
            }

            header('Content-Type: text/plain; charset=UTF-8');
            header('X-Accel-Buffering: no');
            header('Cache-Control: no-cache');

            try {
                $stream = Gemini::generativeModel(model: 'gemini-2.0-flash')
                    ->streamGenerateContent($prompt);

                foreach ($stream as $responseChunk) {
                    $chunkText = $responseChunk->text();
                    echo $chunkText;
                    $fullResponse .= $chunkText; // Accumulate chunk
                    flush();
                }

                if (Auth::check()) {
                    Personalization::create([
                        'user_id' => Auth::id(),
                        'name' => $validated['topic'],
                        'description' => 'Generated content for '.$validated['topic'].' at '.$validated['learning_level'].' level.',
                        'note' => $validated['note'] ?? null,
                        'content' => $fullResponse,
                    ]);
                } else {
                    Log::warning('Attempted to save personalization for unauthenticated user.');
                }

            } catch (\Exception $e) {
                Log::error('Gemini streaming error: '.$e->getMessage().' Prompt: '.$prompt);
                echo 'Error: Unable to generate content at this time. Please try again later.';
                flush();
            }
        });
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

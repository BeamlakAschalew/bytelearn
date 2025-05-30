<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PersonalizationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'topic' => 'required|string|max:255',
            'learning_level' => 'required|string|in:Beginner,Intermediate,Advanced',
            'note' => 'nullable|string|max:1000',
            'content_type' => 'nullable|string|in:Default,Concise,Detailed,With Analogies,Include Visuals',
        ];
    }
}

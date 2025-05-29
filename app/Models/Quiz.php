<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'level',
        'number_of_questions',
        'questions',
    ];

    protected $casts = [
        'questions' => 'array',
    ];
}

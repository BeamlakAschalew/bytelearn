<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerController;
use App\Http\Controllers\PersonalizationController;
use App\Http\Controllers\QuizController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('personalize', function () {
        return Inertia::render('personalize');
    })->name('personalize');

    Route::post('personalize', [PersonalizationController::class, 'store'])->name('personalize.store');

    // Route::post('personalize', function () {
    //     return redirect()->route('ai.result', ['uid' => 'sample-uid']);
    // })->name('personalize.store');

    Route::get('share/{uid}', function ($uid) {
        return Inertia::render('ai-result', ['uid' => $uid, 'content' => 'AI generated content for '.$uid, 'notes' => '']);
    })->name('ai.result');

    Route::get('history', function () {
        $learningPaths = [
            ['id' => 1, 'topic' => 'Algebra', 'level' => 'Beginner', 'date' => '2025-05-29'],
            ['id' => 2, 'topic' => 'Photosynthesis', 'level' => 'Intermediate', 'date' => '2025-05-28'],
        ];

        return Inertia::render('history', ['learningPaths' => $learningPaths]);
    })->name('history');

    Route::get('playground', function () {
        return Inertia::render('playground');
    })->name('playground');

    Route::post('playground', function () {
        return Inertia::render('playground', ['response' => 'Gemini response to your prompt.']);
    })->name('playground.submit');

    // Quiz Routes
    Route::get('/quizzes/create', [QuizController::class, 'create'])->name('quizzes.create');
    Route::post('/quizzes', [QuizController::class, 'store'])->name('quizzes.store');
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])->name('quizzes.show');
    Route::post('/quizzes/{quiz}/submit', [QuizController::class, 'submit'])->name('quizzes.submit');
});

Route::middleware('auth')->group(function () {
    Route::get('/employer/search', [EmployerController::class, 'search'])->name('employer.search');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

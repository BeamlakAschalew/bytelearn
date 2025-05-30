<?php

use App\Http\Controllers\AdminVideoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerController;
use App\Http\Controllers\PersonalizationController;
use App\Http\Controllers\QuizController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect('/dashboard');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('personalize', function () {
        return Inertia::render('personalize');
    })->name('personalize');

    Route::post('personalize', [PersonalizationController::class, 'store'])->name('personalize.store');

    Route::post('/personalize/initiate', [PersonalizationController::class, 'initiateStore'])->name('personalize.initiate')->middleware(['auth']); // Added auth middleware
    Route::get('/personalize/stream/{streamId}', [PersonalizationController::class, 'streamResponse'])->name('personalize.stream')->middleware(['auth']);

    // Route::post('personalize', function () {
    //     return redirect()->route('ai.result', ['uid' => 'sample-uid']);
    // })->name('personalize.store');

    // Route::get('share/{uid}', function ($uid) {
    //     return Inertia::render('ai-result', ['uid' => $uid, 'content' => 'AI generated content for '.$uid, 'notes' => '']);
    // })->name('ai.result');
    Route::get('share/{personalization}', [PersonalizationController::class, 'show'])->name('ai.result');

    Route::get('history', [PersonalizationController::class, 'index'])->name('history');

    Route::get('playground', function () {
        return Inertia::render('playground');
    })->name('playground');

    Route::post('playground', function () {
        return Inertia::render('playground', ['response' => 'Gemini response to your prompt.']);
    })->name('playground.submit');

    // Quiz Routes
    Route::get('/quizzes', [QuizController::class, 'index'])->name('quizzes.index'); // Added route for listing quizzes
    Route::get('/quizzes/create', [QuizController::class, 'create'])->name('quizzes.create');
    Route::post('/quizzes', [QuizController::class, 'store'])->name('quizzes.store');
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])->name('quizzes.show');
    Route::post('/quizzes/{quiz}/submit', [QuizController::class, 'submit'])->name('quizzes.submit');
});

Route::middleware('auth')->group(function () {
    Route::get('/employer/search', [EmployerController::class, 'search'])->name('employer.search');
});

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('videos', [AdminVideoController::class, 'index'])->name('videos.index');
    Route::get('videos/create', [AdminVideoController::class, 'create'])->name('videos.create');
    Route::post('videos', [AdminVideoController::class, 'store'])->name('videos.store');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

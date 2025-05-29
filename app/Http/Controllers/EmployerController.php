<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployerController extends Controller
{
    public function search(Request $request)
    {
        $skill = $request->input('skill');
        $usersData = collect();

        if ($skill) {
            $users = User::whereHas('experiences', function ($query) use ($skill) {
                $query->where('title', 'like', '%'.$skill.'%');
            })
                ->with(['experiences' => function ($query) use ($skill) {
                    // Eager load only relevant experiences for efficiency
                    $query->where('title', 'like', '%'.$skill.'%')
                        ->orderBy('experience_score', 'desc');
                }])
                ->get();

            $usersData = $users->map(function ($user) {
                $bestExperienceForSkill = $user->experiences->first();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'skill_title' => $bestExperienceForSkill ? $bestExperienceForSkill->title : null,
                    'experience_score' => $bestExperienceForSkill ? $bestExperienceForSkill->experience_score : null,
                ];
            })
                ->filter(function ($userData) {
                    return $userData['experience_score'] !== null;
                })
                ->sortByDesc('experience_score')
                ->values(); // Re-index collection
        }

        return Inertia::render('Employer/Search', [
            'searchedSkill' => $skill,
            'users' => $usersData,
        ]);
    }
}

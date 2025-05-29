<?php

namespace App\Http\Controllers;

use App\Models\Personalization;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request)
    {
        $personalizationCount = Personalization::where('user_id', $request->user()->id)->count();
        $lastActivityTimestamp = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderBy('last_activity', 'desc')
            ->value('last_activity');

        $lastActivity = $lastActivityTimestamp ? Carbon::createFromTimestamp($lastActivityTimestamp)->diffForHumans() : 'N/A';

        return inertia('dashboard', [
            'personalizationCount' => $personalizationCount,
            'lastActivity' => $lastActivity,
        ]);
    }
}

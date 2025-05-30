<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Video;
use Cloudinary\Cloudinary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminVideoController extends Controller
{
    public function index()
    {
        $videos = Video::latest()->paginate(10);

        return Inertia::render('Admin/Videos/Index', [
            'videos' => $videos,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Videos/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video' => 'required|file|mimetypes:video/mp4,video/quicktime,video/x-matroska|max:512000', // 500MB
        ]);

        $cloudinary = new Cloudinary([
            'cloud' => [
                'cloud_name' => config('services.cloudinary.cloud_name'),
                'api_key' => config('services.cloudinary.api_key'),
                'api_secret' => config('services.cloudinary.api_secret'),
            ],
        ]);

        $file = $request->file('video')->getRealPath();
        $upload = $cloudinary->uploadApi()->upload($file, [
            'resource_type' => 'video',
            'folder' => 'admin_uploads',
            'eager' => [
                [
                    'format' => 'm3u8', // HLS
                    'transformation' => [
                        ['width' => 1920, 'height' => 1080, 'crop' => 'limit'],
                        ['bit_rate' => '5000k'],
                    ],
                ],
                [
                    'format' => 'm3u8',
                    'transformation' => [
                        ['width' => 854, 'height' => 480, 'crop' => 'limit'],
                        ['bit_rate' => '800k'],
                    ],
                ],
                [
                    'format' => 'm3u8',
                    'transformation' => [
                        ['width' => 426, 'height' => 240, 'crop' => 'limit'],
                        ['bit_rate' => '400k'],
                    ],
                ],
            ],
            'eager_async' => true,
        ]);

        $video = Video::create([
            'title' => $request->title,
            'description' => $request->description,
            'cloudinary_public_id' => $upload['public_id'],
            'cloudinary_url' => $upload['secure_url'],
            'cloudinary_hls_url' => $upload['eager'][0]['secure_url'] ?? null,
            'uploaded_by' => Auth::id(),
        ]);

        return redirect()->route('admin.videos.index')->with('success', 'Video uploaded successfully!');
    }
}

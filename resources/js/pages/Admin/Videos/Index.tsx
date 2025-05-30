import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

interface Video {
    id: number;
    title: string;
    uploader?: { name: string };
    uploaded_by: string | number;
    created_at: string;
    cloudinary_hls_url?: string | null;
}

interface AdminVideoIndexProps {
    videos: {
        data: Array<{
            id: number;
            title: string;
            uploader?: { name: string };
            uploaded_by: string | number;
            created_at: string;
            cloudinary_hls_url?: string | null;
        }>;
    };
}

export default function AdminVideoIndex({ videos }: AdminVideoIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin', href: '/admin/videos' },
        { title: 'Videos', href: '/admin/videos' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Videos" />
            <div className="mx-auto max-w-4xl rounded bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Videos</h1>
                    <Link href={route('admin.videos.create')} className="rounded bg-blue-600 px-4 py-2 text-white">
                        Upload New
                    </Link>
                </div>
                <table className="w-full border">
                    <thead>
                        <tr>
                            <th className="border p-2">Title</th>
                            <th className="border p-2">Uploader</th>
                            <th className="border p-2">Uploaded At</th>
                            <th className="border p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.data.map((video) => (
                            <tr key={video.id}>
                                <td className="border p-2">{video.title}</td>
                                <td className="border p-2">{video.uploader?.name || video.uploaded_by}</td>
                                <td className="border p-2">{new Date(video.created_at).toLocaleString()}</td>
                                <td className="border p-2">
                                    {video.cloudinary_hls_url ? (
                                        <a href={video.cloudinary_hls_url} target="_blank" rel="noopener" className="text-blue-600 underline">
                                            Watch HLS
                                        </a>
                                    ) : (
                                        <span className="text-gray-500">Processing...</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}

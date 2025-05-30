import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState } from 'react';

export default function AdminVideoCreate() {
    const { data, setData, post, processing, errors, reset } = useForm<{
        title: string;
        description: string;
        video: File | null;
    }>({
        title: '',
        description: '',
        video: null,
    });
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
        setData('video', file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.videos.store'), {
            onSuccess: () => {
                reset();
                setPreview(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Admin', href: '/admin/videos' }]}>
            <Head title="Upload Video" />
            <div className="mx-auto max-w-xl rounded bg-white p-6 shadow">
                <h1 className="mb-4 text-2xl font-bold">Upload Video</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block font-medium">Title</label>
                        <input
                            type="text"
                            className="w-full rounded border p-2"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        {errors.title && <div className="text-sm text-red-500">{errors.title}</div>}
                    </div>
                    <div>
                        <label className="block font-medium">Description</label>
                        <textarea
                            className="w-full rounded border p-2"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        {errors.description && <div className="text-sm text-red-500">{errors.description}</div>}
                    </div>
                    <div>
                        <label className="block font-medium">Video File</label>
                        <input type="file" accept="video/*" onChange={handleFileChange} required />
                        {errors.video && <div className="text-sm text-red-500">{errors.video}</div>}
                        {preview && <video src={preview} controls className="mt-2 max-h-64 w-full rounded" />}
                    </div>
                    <Button type="submit" disabled={processing} className="w-full">
                        {processing ? 'Uploading...' : 'Upload Video'}
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}

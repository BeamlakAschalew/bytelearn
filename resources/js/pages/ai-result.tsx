import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Copy, Download, RefreshCw, Save, Share2 } from 'lucide-react';

interface AiResultProps {
    uid: string;
    content: string;
    notes: string; // Assuming notes are passed or fetched
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('dashboard') },
    { title: 'AI Result', href: '#' }, // Dynamic href based on uid if needed
];

export default function AiResult({ uid, content: initialContent, notes: initialNotes }: AiResultProps) {
    const { data, setData, post, processing, errors } = useForm({
        content: initialContent,
        notes: initialNotes,
    });

    const handleRegenerate = () => {
        // Placeholder for regenerate logic, likely a new POST request
        console.log('Regenerate for UID:', uid);
        // Example: post(route('ai.regenerate', { uid }));
    };

    const handleSave = () => {
        // Placeholder for save logic, e.g., save notes or entire content
        console.log('Save for UID:', uid, 'Notes:', data.notes);
        // Example: post(route('ai.save', { uid, notes: data.notes }));
    };

    const handleCopy = () => navigator.clipboard.writeText(data.content);
    const handleShare = () => {
        /* Implement sharing logic */ console.log('Share UID:', uid);
    };
    const handleDownload = () => {
        /* Implement download logic */ console.log('Download UID:', uid);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`AI Result - ${uid}`} />
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Generated Learning Path</CardTitle>
                        <CardDescription>Content for identifier: {uid}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="mb-2 text-lg font-semibold">Generated Content:</h3>
                            <div className="bg-muted min-h-[200px] rounded-md border p-4 whitespace-pre-wrap">{data.content}</div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Your Notes</Label>
                            <Textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Add your personal notes here..."
                                rows={5}
                                disabled={processing}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap justify-between gap-2">
                        <div className="flex gap-2">
                            <Button onClick={handleRegenerate} variant="outline" disabled={processing}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                            </Button>
                            <Button onClick={handleSave} disabled={processing}>
                                <Save className="mr-2 h-4 w-4" /> Save Notes
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCopy} variant="ghost" size="icon" title="Copy Content">
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleShare} variant="ghost" size="icon" title="Share">
                                <Share2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleDownload} variant="ghost" size="icon" title="Download">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </AppLayout>
    );
}
